class SJQLEngine {
    constructor(engine_config, eventEmitter) {
        this.data = [];
        this.headers = [];
        this.plugins = [];
        this.currentQueryStr = '';
        this.futureQuery = [];
        this.QueryParser = new QueryParser(engine_config);

        this.config = {
            UseDataIndexing: engine_config.UseDataIndexing || true,
            useStrictCase: engine_config.useStrictCase || false,
            SymbolsToIgnore: engine_config.SymbolsToIgnore || [' ', '_', '-']
        };

        this.eventEmitter = eventEmitter;
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
                this.headers[key] = { type: 'boolean', isUnique: false, isHidden: false };
            }
            else if (!isNaN(data[key])) {
                this.headers[key] = { type: 'number', isUnique: false, isHidden: false };
            }
            else {
                this.headers[key] = { type: 'string', isUnique: false, isHidden: false };
            }
        }
    }

    query(query = '') {
        if (!this.data || this.data.length === 0) {
            console.warn('No data provided, returning empty array');
            return [];
        }

        if (!query || query === '') {
            console.warn('No query provided, returning all data');
            this.currentQueryStr = '';
            return this.data;
        }

        console.log(query)
        return this.#_query(this.QueryParser.parseQuery(query, this.plugins, this.headers));
    }

    #_query(query) {
        // Early exit if no queries
        if (!query || query.length === 0) {
            this.currentQueryStr = '';
            console.warn('No valid query provided, returning all data');
            return this.data;
        }

        // Separate queries by type
        const selectQueries = [];
        let sortQuery = null, rangeQuery = null, groupQuery = null;

        // Pre-process queries
        for (const q of query) {
            switch (q.queryType) {
                case 'SELECT': selectQueries.push(q); break;
                case 'SORT': sortQuery = q; break;
                case 'RANGE': rangeQuery = q; break;
                case 'GROUP': groupQuery = q; break;
            }
        }

        // Save the current query string
        this.currentQueryStr = '';
        selectQueries.forEach(q => this.currentQueryStr += q.field + ' ' + q.operator + ' ' + q.value + ' and ');
        if (sortQuery) this.currentQueryStr += 'sort ' + sortQuery.field + ' ' + sortQuery.value + ' and ';
        if (rangeQuery) this.currentQueryStr += 'range ' + rangeQuery.lower + ' ' + rangeQuery.upper + ' and ';
        if (groupQuery) this.currentQueryStr += 'group ' + groupQuery.field + ' and ';
        this.currentQueryStr = this.currentQueryStr.slice(0, -5);

        let log = "";
        if (selectQueries.length > 0) log += 'SELECT queries: ' + selectQueries.map(q => q.field + ' ' + q.operator + ' ' + q.value).join(', ') + '\n';
        if (sortQuery) log += 'SORT query: ' + sortQuery.field + ' ' + sortQuery.value + '\n';
        if (rangeQuery) log += 'RANGE query: ' + rangeQuery.lower + ' ' + rangeQuery.upper + '\n';
        if (groupQuery) log += 'GROUP query: ' + groupQuery.field + '\n';
        log += this.currentQueryStr;
        console.log(log);

        // Initialize valid indices as all data indices
        let validIndices = new Set(this.data.keys());
        let groupedData = null;

        // Process SELECT queries
        for (const q of selectQueries) {
            q.field = MeantIndexKey(Object.keys(this.data[0]), q.field, this.config);
            const plugin = this.getPlugin(q.type);
            if (!plugin) throw new GridError(`No plugin found for header (${q.type}) for key (${q.field})`);
            validIndices = plugin.evaluate(q, this.dataIndexes[q.field], this.data, validIndices);
        }

        // Process RANGE query
        if (rangeQuery) {
            const first = validIndices.values().next().value;
            const lower = Math.max(0, first + rangeQuery.lower);
            const upper = Math.min(this.data.length - 1, first + rangeQuery.upper - 1);
            validIndices = new Set(Array.from({ length: upper - lower + 1 }, (_, i) => i + lower));
        }

        // Process GROUP query
        if (groupQuery) {
            const groupField = MeantIndexKey(Object.keys(this.data[0]), groupQuery.field, this.config);
            groupedData = {};

            // Group rows by the specified field
            for (const index of validIndices) {
                const row = this.data[index];
                const groupKey = row[groupField];
                (groupedData[groupKey] ||= []).push(row); // Use nullish coalescing for concise grouping
            }

            // Sort groups if required
            if (sortQuery) {
                console.warn('Sorting grouped data is not yet supported');
            }

            return groupedData;
        }

        // Sort if no grouping
        if (sortQuery) {
            const sortedData = this.data.filter((_, i) => validIndices.has(i));
            return this.getPlugin(sortQuery.type).sort(sortQuery, sortedData);
        }

        // Return filtered data
        return this.data.filter((_, i) => validIndices.has(i));
    }

    sort(key, direction) {
        let query = '';

        if (this.currentQueryStr.length === 0 && (direction === 'asc' || direction === 'desc')) //if no query is present, just sort
            query = 'sort ' + key + ' ' + direction;
        else if (direction === 'asc' || direction === 'desc') {//if query is present, add sort to the query
            query =  this.currentQueryStr.replace(QueryParser.QUERIES.SORT, '');
            query += ' and sort ' + key + ' ' + direction;
        }
        else if (!direction || direction === '' || direction === 'original') //if no direction is provided, just return the unsorted data
        {
            query = this.currentQueryStr;
            query = query.replace(QueryParser.QUERIES.SORT, '');
        }

        return this.query(query);
    }

    groupBy(key = '') {
        let query = '';

        if (this.currentQueryStr.length === 0 && Object.keys(this.headers).includes(key)) //if no query is present, just group
            query = 'group ' + key;
        else if (this.currentQueryStr.length > 0 && Object.keys(this.headers).includes(key)) //if query is present, add sort to the query
            query = this.currentQueryStr + ' and group ' + key;
        else if (!key || key === '' || key === 'original') //if no direction is provided, just return the unsorted data
        {
            query = this.currentQueryStr;
            query = query.replace(QueryParser.QUERIES.GROUP, '');
        }

        return this.query(query);
    }

    addSelect(key, operator, value) {
        let parsedQuery = [];
        if (this.currentQueryStr.length > 0) {
            parsedQuery = this.QueryParser.parseQuery(this.currentQueryStr, this.plugins, this.headers);
            if (key && operator && value) {
                parsedQuery.push(this.QueryParser.parseMatch([undefined, key, operator, value], 'SELECT', this.plugins, this.headers));
            }
        }
        else {
            parsedQuery.push(this.QueryParser.parseMatch([undefined, key, operator, value], 'SELECT', this.plugins, this.headers));
        }

        this.futureQuery = parsedQuery;
    }

    removeSelect(key, operator, value) {
        this.futureQuery = this.futureQuery.filter(query =>  !(query.field.toString() === key.toString() && query.operator.toString() === operator.toString() && query.value.toString() === value.toString()));
    }

    runSelect() {
        return this.#_query(this.futureQuery);
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

    /**
     * Retrieves a plugin by its name.
     *
     * @param {string} name - The name of the plugin to retrieve.
     * @param {boolean} [justChecking=false] - If true, only checks if the plugin exists without throwing an error.
     * @returns {TypePlugin|boolean} - The plugin if found, or false if not found and justChecking is true.
     * @throws {GridError} - If the plugin name is not provided or the plugin is not found and justChecking is false.
     */
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
        if (this.data && this.data.length > 0) {
            throw new GridError('Data already imported, re-importing data is not (yet) supported');
        }

        if (config.type === 'json') {
            this.#parseJsonData(data, config);
        } else if (config.type === 'csv') {
            this.#parseCSVData(data, config);
        } else {
            throw new GridError('Invalid data type');
        }

        //if headers are not provided, auto-detect them
        if (Object.keys(this.headers).length === 0) {
            console.warn('No headers provided, auto detecting headers, please provide so the system can you more optimal plugins');
            this.autoDetectHeaders(this.data[0]);
        }
    }

    #parseJsonData(data, config) {
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

    #parseCSVData(data, config) {
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