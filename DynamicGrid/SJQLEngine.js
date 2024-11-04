class SJQLEngine {
    constructor(engine_config) {
        this.data = [];
        this.headers = [];
        this.plugins = [];
        this.currentQuery = {};
        this.currentQueryStr = '';
        this.QueryParser = new QueryParser(this);

        // Enhanced cache configuration
        this.config = {
            shouldCreateIndexes: engine_config.shouldCreateIndexes ?? true,
            useOptimizedQueryOrder: engine_config.useOptimizedQueryOrder ?? true,
        };
    }

    parseData(data) {
        if (data.length === 0) {
            console.warn('No data provided');
            return [];
        }

        if (!Array.isArray(data)) {
            throw new Error('Data must be an array');
        }

        //if headers are not provided, auto detect them
        if (Object.keys(this.headers).length === 0) {
            console.warn('No headers provided, auto detecting headers, please provide headers for better performance');
            this.autoDetectHeaders(data[0]);
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

    createDataIndex() {
        if (!this.config.shouldCreateIndexes) return;

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

        this.currentQuery = (this.config.useOptimizedQueryOrder ?  this.QueryParser.parseQuery(query, this.dataIndexes) : this.QueryParser.parseQuery(query));
        this.currentQueryStr = query;
        //console.log('Current query:', this.currentQuery);
        return this._query(this.currentQuery);
    }

    // _query_1(query) {
    //     let data = this.data;
    //     for (let i = 0; i < query.length; i++) {
    //
    //         if (query[i].queryType === 'SORT') {
    //             data = this.getPlugin(query[i].type).sort(query[i], data);
    //         }
    //         if (query[i].queryType === 'RANGE') {
    //             //value can be like this: 10, 20-30, -10 (last 10)
    //             const lower =query[i].lower || 0;
    //             const upper =query[i].upper || data.length;
    //             //if upper is not provided, get the last n elements
    //             //if lower or upper are negative, get the last n elements
    //             data = data.slice(lower, upper);
    //         }
    //         if (query[i].queryType === 'SELECT') {
    //             data = this.getPlugin(query[i].type).evaluate(query[i], data);
    //         }
    //     }
    //
    //     return data;
    // }
    //
    // _query_2(query) {
    //     let data = [];
    //     //if it exists* get the select, sort and range query/queries
    //     const selectQueries = query.filter(q => q.queryType === 'SELECT');
    //     const sortQuery = query.find(q => q.queryType === 'SORT');
    //     const rangeQuery = query.find(q => q.queryType === 'RANGE');
    //     let RangeDataCount = 0;
    //     for (const row of this.data) {
    //         for (let i = 0; i < selectQueries.length; i++) {
    //             var plugin = this.getPlugin(query[i].type);
    //             if (!plugin) {
    //                 throw new Error('No plugin found for header (' + query[i].type + ') for key (' + query[i].field + ')');
    //             }
    //             if (!plugin.evaluate(query[i], row)) {
    //                 console.log('early break (select)');
    //                 break;
    //             }
    //         }
    //
    //         if (rangeQuery) {
    //             RangeDataCount++;
    //             if (RangeDataCount < rangeQuery.lower ) {
    //                 continue;
    //             } else if (RangeDataCount > rangeQuery.upper) {
    //                 console.log('early break (range)');
    //                 break;
    //             }
    //         }
    //         data.push(row);
    //     }
    //
    //     if (sortQuery) {
    //         data = this.getPlugin(sortQuery.type).sort(sortQuery, data);
    //     }
    //     return data;
    // }

    _query(query) {
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

        for (let i = 0; i < this.data.length; i++) {
            const row = this.data[i];
            let valid = true;

            // Evaluate SELECT queries
            for (const q of selectQueries) {
                const plugin = this.getPlugin(q.type);
                if (!plugin) {
                    throw new Error('No plugin found for header (' + q.type + ') for key (' + q.field + ')');
                }
                if (!plugin.evaluate(q, row, this.dataIndexes)) {
                    valid = false;
                    //console.log('early break (select), query: ' + q.field + ' ' + q.operator + ' ' + q.value);
                    break;
                }
            }

            // Evaluate RANGE query
            if (rangeQuery && valid) {
                if (rangeQuery.lower > i) {
                    valid = false;
                }
                else if (rangeQuery.upper < i) {
                    //console.log('early break (range), row:', row, 'query:', rangeQuery);
                    break;
                }
            }

            if (valid) {
                validIndices.add(i);
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

    setSort(field, direction) {
        this.sortQuery = 'sort ' + field + ' ' + direction;
        const wholeQuery = this.currentQueryStr === '' ? this.sortQuery : this.currentQueryStr + ' and ' + this.sortQuery;
        return this._query(this.QueryParser.parseQuery(wholeQuery));
    }

    //================================================== PLUGIN SYSTEM ==================================================
    addPlugin(plugin, dontOverride = false) {
        if (!(plugin instanceof TypePlugin)) {
            throw new Error('Plugin must extend TypePlugin');
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
        if (!name) throw new Error('Plugin name not provided');
        if (typeof name !== 'string') return false;

        const plugin = this.plugins[name.replace("TypePlugin", "")];

        if (!plugin && !justChecking) throw new Error('Plugin not found: ' + name);
        else if (!plugin && justChecking)  return false;


        return plugin;
    }
}