class SJQLEngine {
    constructor(engine_config) {
        this.data = [];
        this.headers = [];
        this.plugins = [];
        this.currentQuery = {};
        this.currentQueryStr = '';
        this.QueryParser = new QueryParser(engine_config);

        this.config = {
            UseDataEnumeration: engine_config.UseDataEnumeration || false,
            UseDataIndexing: engine_config.UseDataIndexing || true,
            useStrictCase: engine_config.useStrictCase || false,
            SymbolsToIgnore: engine_config.SymbolsToIgnore || [' ', '_', '-']
        };
    }

    createDataIndex() {
        if (!this.config.UseDataIndexing) return;

        // Create indexes for faster querying
        this.dataIndexes = {};
        Object.keys(this.headers).forEach(header => {
            this.dataIndexes[header] = new Map();
            this.data.forEach((row, idx) => {
                const value = row[header];
                if (!this.dataIndexes[header].has(value)) {
                    this.dataIndexes[header].set(value, new Set());
                }
                this.dataIndexes[header].get(value).add(idx);
            });
        });
    }

    autoDetectHeaders(data) {
        //if value is true or false, it's a boolean
        //else if value is a number, it's a number
        //else it's a string
        for (const key of Object.keys(data)) {
            if (data[key] === true || data[key] === false) {
                this.headers[key] = 'boolean';
            }
            else if (!isNaN(data[key])) {
                this.headers[key] = 'number';
            }
            else {
                this.headers[key] = 'string';
            }
        }
    }

    query(query = '') {
        if (!this.data || this.data.length === 0) {
            console.warn('No data provided, returning empty array');
            return [];
        }

        if (!query) {
            console.warn('No query provided, returning all data');
            return this.data;
        }

        return this._query(this.QueryParser.parseQuery(query, this.plugins, this.headers));
    }

    _query(query) {
        //console.log('query:', query);

        // Early exit if no queries
        if (!query || query.length === 0) return this.data;

        // Separate queries by type for optimal processing order
        const selectQueries = [];
        let sortQuery = null;
        let rangeQuery = null;

        // Create a Set to track valid row indices
        let validIndices = new Set();

        // Pre-process queries for optimal execution order
        for (const q of query) {
            switch (q.queryType) {
                case 'SELECT':
                    selectQueries.push(q);
                    break;
                case 'SORT':
                    sortQuery = q;
                    break;
                case 'RANGE':
                    rangeQuery = q;
                    break;
            }
        }

        this.currentQuery = selectQueries;
        this.currentQueryStr = selectQueries.map(q => q.field + ' ' + q.operator + ' ' + q.value).join(' and ');

        performance.mark('startQuery');
        validIndices = new Set(this.data.map((_, i) => i));
        if (this.config.UseDataEnumeration) {
            // for (let i = 0; i < this.data.length; i++) {
            //     const row = this.data[i];
            //     let valid = true;
            //
            //     // Evaluate SELECT queries
            //     for (const q of selectQueries) {
            //         const plugin = this.getPlugin(q.type);
            //         if (!plugin) {
            //             throw new GridError('No plugin found for header (' + q.type + ') for key (' + q.field + ')');
            //         }
            //         if (!plugin.evaluateCondition(row[q.field], q.operator, q.value)) {
            //             valid = false;
            //             //console.log('early break (select), query: ' + q.field + ' ' + q.operator + ' ' + q.value);
            //         }
            //     }
            //
            //     // Evaluate RANGE query
            //     if (rangeQuery && valid) {
            //         if (rangeQuery.lower > i) {
            //             continue;
            //         }
            //     }
            //
            //     if (!valid) {
            //         validIndices.delete(i);
            //     }
            // }
            console.warn('Data enumeration is not implemented yet');
        }
        else {
            for (const q of selectQueries) {
                q.field = MeantIndexKey(Object.keys(this.data[0]), q.field, this.config);
                const plugin = this.getPlugin(q.type);
                if (!plugin) {
                    throw new GridError('No plugin found for header (' + q.type + ') for key (' + q.field + ')');
                }
                validIndices = plugin.evaluate(q,  this.dataIndexes[q.field], this.data, validIndices);
            }

            // Evaluate RANGE query
            if (rangeQuery) {
                const first = validIndices.values().next().value;
                const lower = Math.max(0, first + rangeQuery.lower);
                const upper = Math.min(this.data.length - 1, first + rangeQuery.upper - 1);

                // Pre-allocate approximate size
                const result = new Set();

                // Start from lower bound directly
                for (let i = lower; i <= upper; i++) {
                    result.add(i);
                }

                validIndices = result;
            }
        }

        // Filter data based on valid row indices
        if (sortQuery) {
            return this.getPlugin(sortQuery.type)
                .sort(sortQuery,
                    this.data.filter((_, i) => validIndices.has(i)));
        }

        return this.data.filter((_, i) => validIndices.has(i));
    }

    sort(key, direction) {
        let query = '';

        if (this.currentQueryStr.length === 0 && (direction === 'asc' || direction === 'desc')) //if no query is present, just sort
            query = 'sort ' + key + ' ' + direction;
        else if (direction === 'asc' || direction === 'desc') //if query is present, add sort to the query
            query = this.currentQueryStr + ' and sort ' + key + ' ' + direction;
        else if (!direction || direction === '' || direction === 'original') //if no direction is provided, just return the unsorted data
            query = this.currentQueryStr;

        return this.query(query);
    }

    //================================================== PLUGIN SYSTEM ==================================================
    addPlugin(plugin, dontOverride = false) {
        if (!(plugin instanceof TypePlugin)) {
            throw new GridError('Plugin must extend TypePlugin');
        }

        //if already exists, remove it and add the new one, while warning the user
        const existingPlugin = this.getPlugin(plugin.name, true);
        if (dontOverride && existingPlugin) return;
        if (existingPlugin && !dontOverride) {
            console.warn('Plugin already exists, removing the old plugin');
            //set the new plugin to have key of the name of the plugin
            this.plugins[plugin.name.replace("TypePlugin", "")] = plugin;
        }
        else {
            this.plugins[plugin.name.replace("TypePlugin", "")] = plugin;
        }
    }

    getPlugin(name, justChecking = false) {
        if (!name) throw new GridError('Plugin name not provided');
        if (typeof name !== 'string') return false;

        const plugin = this.plugins[name.replace("TypePlugin", "")];

        if (!plugin && !justChecking) throw new GridError('Plugin not found: ' + name);
        else if (!plugin && justChecking)  return false;


        return plugin;
    }

    //================================================== DATA PARSER ==================================================
    importData(data, config) {
        if (config.type === 'json') {
            this.parseJsonData(data, config);
        } else if (config.type === 'csv') {
            this.parseCSVData(data, config);
        } else {
            throw new GridError('Invalid data type');
        }

        //if headers are not provided, auto-detect them
        if (Object.keys(this.headers).length === 0) {
            console.warn('No headers provided, auto detecting headers, please provide so the system can you more optimal plugins');
            this.autoDetectHeaders(this.data[0]);
        }
    }

    parseJsonData(data, config) {
        if (!(typeof data === 'string')) {
            throw new GridError('Data must be a string (raw JSON)');
        }

        data = JSON.parse(data);

        if (!Array.isArray(data)) {
            throw new GridError('Data must be an array');
        }

        if (data.length === 0) {
            console.warn('No data provided');
            return [];
        }

        this.data = data.map((item, index) => {
            const newItem = {};
            newItem['internal_id'] = index
            for (const key of Object.keys(item)) {
                newItem[key] = item[key];
            }
            return newItem;
        });
    }

    parseCSVData(data, config) {
        const lines = data.split('\n');
        //split by the config.delimiter character, but only if it's not inside quotes
        const headers = lines[0].split(",").map(header => header.replace(/"/g, '').replace(" ", "_").replace("\r", ''));
        // console.log(headers);
        this.data = lines.slice(1).map((line, index) => {
            const values = line.split(/(?!"[a-zA-z0-9\s.()]*)(?:,|,"|",)(?![a-zA-z0-9\s.()]*")/mgi);
            const newItem = {};
            newItem['internal_id'] = index;
            headers.forEach((header, i) => {
                if (typeof values[i] === 'string')
                    values[i].endsWith('"') ? values[i] = values[i].slice(0, -1) : values[i];
                newItem[header] = values[i];
            });
            return newItem;
        })
        .slice(0, -1);
    }
}