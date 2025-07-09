// @requires ./exportConnectors/ExportConnector.js
// @requires ./DynamicGridUtils.js
// @requires ./typePlugins/BaseTypePlugin.js
// @requires ./EditTracker.js
// @requires ./QueryParser.js

/**
 * @file manages the SQL-like query engine for the grid, handling data parsing, indexing, and query execution.
 * @module SJQLEngine
 */
class SJQLEngine {
    constructor(engine_config, eventEmitter) {
        this.data = [];
        this.headers = [];
        this.plugins = [];
        this.connectors = [];
        this.futureQuery = [];
        this.QueryParser = new QueryParser(engine_config);
        this.updateTracker = new EditTracker();

        this.config = {
            //UseDataIndexing: engine_config.UseDataIndexing || true,
        };

        this.APIConnector = engine_config.APIConnector || null;

        this.eventEmitter = eventEmitter;

        this.currentQueryStr = '';
    }

    createDataIndex() {
        //if (!this.config.UseDataIndexing) return;

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
                this.headers[key] = { type: 'boolean', isUnique: false, isHidden: false, isEditable: true };
            }
            else if (!isNaN(data[key])) {
                this.headers[key] = { type: 'number', isUnique: false, isHidden: false, isEditable: true  };
            }
            //The regex check for data formats (with built-in validation: 32-13-2023 invalid; 31-01-2023 valid)
            //else if (data[key].test(/(0?[1-9]|[12][0-9]|3[01])-(0?[1-9]|1[0-2])-(\d{4})/)) {
            else if (data[key].match(/^(0?[1-9]|[12][0-9]|3[01])-(0?[1-9]|1[0-2])-(\d{4})$/)) {
                this.headers[key] = { type: 'date', isUnique: false, isHidden: false, isEditable: true  };
            }
            else {
                this.headers[key] = { type: 'string', isUnique: false, isHidden: false, isEditable: true  };
            }
        }
    }

    /**
     * Retrieves the data at the specified index.
     * @param index {number} - The index of the data to retrieve.
     * @returns {Promise<Object> | Object} - The data at the specified index, or a promise that resolves to the data.
     */
    getData(index, noPromise = false) {
        const isValidIndex = this.data && this.data.length > 0 && index < this.data.length;
        index = (index < 0 ? this.data.length + index : index);

        if (index === undefined || index === null || !isValidIndex) {
            console.warn('No data provided, returning empty object');
            if (noPromise) return {};
            return new Promise((resolve, reject) => {
                resolve({});
            });
        }

        if (noPromise) {
            if (!isValidIndex) throw new Error('No data to return (data is empty, or index is out of bounds)');
            const { internal_id, ...data } = this.data[index];
            return data;
        }

        return new Promise((resolve, reject) => {
            if (!isValidIndex) return reject(new Error('No data to return (data is empty, or index is out of bounds)'));
            const { internal_id, ...data } = this.data[index];
            resolve(data);
        });
    }


    getHeader(key) {
        if (!this.headers || Object.keys(this.headers).length === 0) {
            throw new GridError('No headers provided, returning empty object');
        }

        if (key === undefined || key === null) {
            console.warn('No key provided, returning all headers');
            return this.headers;
        }

        if (this.headers[key]) {
            return this.headers[key];
        } else {
            throw new GridError(`Header not found for key: ${key} ${this.headers} ${key}`);
        }
    }

    /**
     * Retrieves all the columns from the data.
     * @returns {string[]|*[]}
     */
    getColumns() {
        if (!this.data || this.data.length === 0) {
            console.warn('No data provided, returning empty array');
            return [];
        }

        return Object.keys(this.data[0]).filter(key => key !== 'internal_id');
    }

    sortData(data, field, direction, typePlugin) {
        const hint = typePlugin?.sortingHint || 'string';

        return [...data].sort((a, b) => {

            const aVal = typePlugin.parseValue(a[field]);
            const bVal = typePlugin.parseValue(b[field]);

            if (hint === 'number') return direction === 'asc' ? aVal - bVal : bVal - aVal;
            if (hint === 'boolean') return direction === 'asc' ? (aVal === bVal ? 0 : aVal ? 1 : -1) : (aVal === bVal ? 0 : aVal ? -1 : 1);
            if (hint === 'string' || hint === 'text') return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            // For date, we assume the values are in a format that can be parsed by Date
            if (hint === 'date') {
                const aDate = new Date(aVal);
                const bDate = new Date(bVal);
                return direction === 'asc' ? aDate - bDate : bDate - aDate;
            }
        });
    }

    query(query = '') {
        if (!this.data || this.data.length === 0) {
            console.warn('No data provided, returning empty array');
            return [];
        }

        if (!query || query === '') {
            console.warn('No query provided, returning all data');
            this.currentQueryStr = '';
            return this.data.map((_, index) => index);
        }

        const parsedQuery = this.QueryParser.parseQuery(query, this.plugins, this.headers);
        return this.#_query(parsedQuery);
    }


    #_query(query) {

        // Early exit if no queries
        if (!query || query.length === 0) {
            this.currentQueryStr = '';
            console.warn('No valid query provided, returning NO data');
            return []
        }

        // Separate queries by type
        const selectQueries = [];
        let sortQuery = null, rangeQuery = null, groupQuery = null, fuzzyQuery = null;;

        // Pre-process queries
        for (const q of query) {
            switch (q.queryType) {
                case 'SELECT': selectQueries.push(q); break;
                case 'SORT': sortQuery = q; break;
                case 'RANGE': rangeQuery = q; break;
                case 'GROUP': groupQuery = q; break;
                case 'FUZZY': fuzzyQuery = q; break;
            }
        }

        // Save the current query string
        this.currentQueryStr = '';
        selectQueries.forEach(q => this.currentQueryStr += q.field + ' ' + q.operator + ' ' + q.value + ' and ');
        if (sortQuery) this.currentQueryStr += 'sort ' + sortQuery.field + ' ' + sortQuery.value + ' and ';
        if (rangeQuery) this.currentQueryStr += 'range ' + rangeQuery.lower + ' ' + rangeQuery.upper + ' and ';
        if (groupQuery) this.currentQueryStr += 'group ' + groupQuery.field + ' and ';
        if (fuzzyQuery) this.currentQueryStr += 'search ' + fuzzyQuery.value + ' and ';
        this.currentQueryStr = this.currentQueryStr.slice(0, -5);

        // let log = "";
        // if (selectQueries.length > 0) log += 'SELECT queries: ' + selectQueries.map(q => q.field + ' ' + q.operator + ' ' + q.value).join(', ') + '\n';
        // if (sortQuery) log += 'SORT query: ' + sortQuery.field + ' ' + sortQuery.value + '\n';
        // if (rangeQuery) log += 'RANGE query: ' + rangeQuery.lower + ' ' + rangeQuery.upper + '\n';
        // if (groupQuery) log += 'GROUP query: ' + groupQuery.field + '\n';
        // log += this.currentQueryStr;

        // Initialize valid indices as all data indices
        let validIndices = new Set(this.data.keys());
        let groupedData = null;

        console.log(selectQueries, sortQuery, rangeQuery, groupQuery, fuzzyQuery);

        // Process SELECT queries
        for (const q of selectQueries) {
            q.field = findMatchingIndexKey(Object.keys(this.data[0]), q.field, this.config);
            const plugin = this.getHeader(q.field)?.plugin || new this.getPlugin(q.type, true);
            if (!plugin) throw new GridError(`No plugin found for header (${q.type}) for key (${q.field})`);

            validIndices = plugin.evaluate(q, this.dataIndexes[q.field], this.data, validIndices);
        }

        // Process RANGE query
        if (rangeQuery) {
            const first = validIndices.values().next().value;
            const lower = rangeQuery.upper < 0 ? this.data.length + rangeQuery.upper : Math.max(0, first + rangeQuery.lower);
            const upper = rangeQuery.upper < 0 ? this.data.length : Math.min(this.data.length - 1, first + rangeQuery.upper - 1);
            validIndices = new Set(Array.from({ length: upper - lower + 1 }, (_, i) => i + lower));
        }

        // Process GROUP query
        if (groupQuery) {
            const groupField = findMatchingIndexKey(Object.keys(this.data[0]), groupQuery.field, this.config);
            groupedData = {};

            // Group rows by the specified field
            for (const index of validIndices) {
                const row = this.data[index];
                const groupKey = row[groupField];
                (groupedData[groupKey] ||= []).push(row.internal_id); // Use nullish coalescing for concise grouping
            }

            // Sort groups if required
            if (sortQuery) {
                console.warn('Sorting grouped data is not yet supported');
            }

            return groupedData;
        }

        // Process Fuzzy search
        if (fuzzyQuery) {
            const lowerSearch = fuzzyQuery.value;
            const allKeys = Object.keys(this.data[0]).filter(k => k !== 'internal_id');
            validIndices = new Set([...validIndices].filter(index => {
                const row = this.data[index];
                return allKeys.some(key =>
                    String(row[key]).toLowerCase().includes(lowerSearch)
                );
            }));
        }

        // Sort if no grouping
        if (sortQuery) {
            //use this.sortData
            const sortedData = this.sortData(
                this.data.filter((_, i) => validIndices.has(i)),
                sortQuery.field,
                sortQuery.value,
                //this.getPlugin(sortQuery.type)
                this.headers[sortQuery.field]?.plugin || new this.getPlugin(sortQuery.type, true)
            );
            return sortedData.map(row => row.internal_id); // Return only internal_ids
        }

        return Array.from(validIndices);
    }

    //================================================== SELECT ==================================================
    addSelect(key, operator, value) {
        if (!key || !operator || value === undefined || value === '') return;

        const newClause = `${key} ${operator} ${value}`;

        if (this.currentQueryStr.length === 0)
            this.currentQueryStr = newClause;
        else
            this.currentQueryStr += ` and ${newClause}`;
    }

    setSelect(key, operator, value) {
        this.removeSelect(key);
        this.addSelect(key, operator, value);
    }

    removeSelect(key, operator, value) {
        let originalQueryStr = this.currentQueryStr;

        if (key !== undefined && operator === undefined && value === undefined) {
            // Remove all clauses with the specified key
            this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith(key)).join(' and ');
        } else if (key !== undefined && operator !== undefined && value === undefined) {
            // Remove all clauses with the specified key and operator
            this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith(`${key} ${operator}`)).join(' and ');
        } else if (key !== undefined && operator !== undefined && value !== undefined) {
            // Remove the specific clause
            const clauseToRemove = `${key} ${operator} ${value}`;
            this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => clause.trim() !== clauseToRemove).join(' and ');
        }

        return originalQueryStr !== this.currentQueryStr;
    }

    //================================================== SORT ==================================================
    setSort(key, direction) {
        if (key === undefined || direction === undefined) {
            this.removeSort();
            return;
        }

        const newClause = `sort ${key} ${direction}`;

        this.removeSort();

        if (this.currentQueryStr.length === 0)
            this.currentQueryStr = newClause;
        else
            this.currentQueryStr += ` and ${newClause}`;
    }

    removeSort() {
        // Remove the sort clause
        this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith('sort')).join(' and ');
    }

    //================================================== RANGE ==================================================
    setRange(lower, upper) {
        if (lower === undefined || upper === undefined) {
            this.removeRange();
            return;
        }

        const newClause = `range ${lower} ${upper}`;

        this.removeRange();

        if (this.currentQueryStr.length === 0)
            this.currentQueryStr = newClause;
        else
            this.currentQueryStr += ` and ${newClause}`;
    }

    removeRange() {
        // Remove the range clause
        this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith('range')).join(' and ');
    }

    //================================================== GROUP ==================================================
    setGroup(key) {
        if (key === undefined){
            this.removeGroup();
            return;
        }

        const newClause = `group ${key}`;

        this.removeGroup();

        if (this.currentQueryStr.length === 0)
            this.currentQueryStr = newClause;
        else
            this.currentQueryStr += ` and ${newClause}`;
    }

    removeGroup() {
        // Remove the group clause
        this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith('group')).join(' and ');
    }

    runCurrentQuery() {
        this.eventEmitter.emit('engine-query-update', this.currentQueryStr);
        return this.query(this.currentQueryStr);
    }

    //================================================== PLUGIN SYSTEM ==================================================
    addPlugin(plugin, dontOverride = false) {
        const testInstance = new plugin();

        if (!(testInstance instanceof BaseTypePlugin)) {
            throw new GridError('Plugin must extend BaseTypePlugin');
        }

        //if already exists, remove it and add the new one, while warning the user
        const existingPlugin = this.getPlugin(testInstance.constructor.name, true);
        if (dontOverride && existingPlugin) return;
        if (existingPlugin && !dontOverride) {
            console.warn('Plugin already exists, removing the old plugin');
            //set the new plugin to have key of the name of the plugin
            this.plugins[testInstance.constructor.name.replace("TypePlugin", "").toLowerCase()] = plugin;
        }
        else {
            this.plugins[testInstance.constructor.name.replace("TypePlugin", "").toLowerCase()] = plugin;
        }
    }

    /**
     * Retrieves a plugin by its name.
     *
     * @param {string} name - The name of the plugin to retrieve.
     * @param {boolean} [justChecking=false] - If true, only checks if the plugin exists without throwing an error.
     * @returns {BaseTypePlugin|boolean} - The plugin if found, or false if not found and justChecking is true.
     * @throws {GridError} - If the plugin name is not provided or the plugin is not found and justChecking is false.
     */
    getPlugin(name, justChecking = false) {
        if (!name) throw new GridError('Plugin name not provided');
        if (typeof name !== 'string') return false;

        var plugin = this.plugins[name.replace("TypePlugin", "")] || this.plugins[this.headers[name]?.type];

        if (!plugin && !justChecking) throw new GridError('Plugin not found for column: ' + name);
        else if (!plugin && justChecking)  return false;

        return plugin;
    }

    generatePluginInstance(name, config = {}) {
        const Plugin = this.getPlugin(name);
        if (!Plugin) throw new GridError('Plugin not found: ' + name);

        // Create a new instance of the plugin
        const pluginInstance = new Plugin(config);
        pluginInstance.name = name;

        return pluginInstance;
    }

    //================================================== EXPORT CONNECTORS ==================================================
    addConnector(Connector, dontOverride = false) {
        if (!(Connector instanceof ExportConnector)) {
            throw new GridError('Connector must extend ExportConnector');
        }

        //if already exists, remove it and add the new one, while warning the user
        const existingConnector = this.getConnector(Connector.name, true);
        if (dontOverride && existingConnector) return;
        if (existingConnector && !dontOverride) {
            console.warn('Connector already exists, removing the old Connector');
            //set the new Connector to have key of the name of the Connector
            this.connectors[Connector.name.replace("ExportConnector", "")] = Connector;
        }
        else {
            this.connectors[Connector.name.replace("ExportConnector", "")] = Connector;
        }
    }

    /**
     * Retrieves a Connector by its name.
     *
     * @param {string} name - The name of the Connector to retrieve.
     * @param {boolean} [justChecking=false] - If true, only checks if the Connector exists without throwing an error.
     * @returns {ExportConnector|boolean} - The Connector if found, or false if not found and justChecking is true.
     * @throws {GridError} - If the Connector name is not provided or the Connector is not found and justChecking is false.
     */
    getConnector(name, justChecking = false) {
        if (!name) throw new GridError('Connector name not provided');
        if (typeof name !== 'string') return false;

        const Connector = this.connectors[name];

        if (!Connector && !justChecking) throw new GridError('Connector not found: ' + name);
        else if (!Connector && justChecking)  return false;


        return Connector;
    }

    destroy() {
        this.data = [];
        this.headers = [];
        this.plugins = [];
        this.connectors = [];
        this.futureQuery = [];
        this.QueryParser = null;
        this.updateTracker = null;
        this.config = {};
        this.APIConnector = null;
        this.eventEmitter.removeAllListeners();
        this.eventEmitter = null;
    }

    //================================================== IMPORT ==================================================
    importData(data, config) {
        if (this.data && this.data.length > 0) {
            throw new GridError('Data already imported, re-importing data is not (yet) supported');
        }

        if (config.type === undefined || config.type === 'object') {
            this.#parseObjectData(data, config);
        }
        else if (config.type === 'json') {
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

    alterData(datum, column, value) {
        console.log(datum, column, value);
        const oldValue = this.data[datum][column];
        if (this.data && this.data.length > 0) {
            this.data[datum][column] = value;
        }

        //recalculate the data index for the altered row
        if (this.dataIndexes && this.dataIndexes[column]) {

            if (this.dataIndexes[column].has(oldValue)) {
                this.dataIndexes[column].get(oldValue).delete(datum);
            }
            if (!this.dataIndexes[column].has(value)) {
                this.dataIndexes[column].set(value, new Set());
            }
            this.dataIndexes[column].get(value).add(datum);
        }

        //remove the previous data index for the altered row
    }


    #parseObjectData(data, config) {
        if (!(typeof data === 'object')) {
            throw new GridError('Data must be an object (parsed JSON)');
        }

        if (!Array.isArray(data)) {
            throw new GridError('Data must be an array');
        }

        if (data.length === 0) {
            console.warn('No data provided');
            return [];
        }

        this.data = data.map((item, index) => {
            const newItem = {};
            newItem['internal_id'] = index;
            for (const key of Object.keys(item)) {
                newItem[key] = item[key];
            }
            return newItem;
        });
    }

    #parseJsonData(data, config) {
        if (!(typeof data === 'string') && !(typeof data === 'object')) {
            throw new GridError('Data must be a string (raw JSON) OR an object (parsed JSON)');
        }

        data = typeof data === 'string' ? JSON.parse(data) : data;

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

    //=================================================== EXPORT ==================================================
    /**
     * Request and handle an export in the specified file type
     * @param {string} fileName - The name for the exported file
     * @param {string} fileType - The type of file to export (e.g., 'csv', 'xlsx')
     */
    async requestExport(fileName, fileType) {
        const Connector = this.getConnector(fileType);
        if (!Connector) {
            console.error('Connector not found: ' + fileType);
            return;
        }

        try {
            //export the data without the internal_id
            const exportResult = await Connector.smartExport(this.data.map(row => {
                const newRow = {};
                Object.keys(row).forEach(key => {
                    if (key !== 'internal_id') {
                        newRow[key] = row[key];
                    }
                });
                return newRow;
            }), this.headers, fileName);

            if (!exportResult) {
                console.warn('No data returned for export');
                return;
            }

            // Create a blob using the returned data
            const blob = new Blob([exportResult], {type: Connector.mimeType});

            // Create a download link and trigger it
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName || 'export'}.${Connector.extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error.message)
            alert('Export failed. See console for details.');
            return false;
        }

        return true;
    }

    getExportConnectors = () => Object.keys(this.connectors);
}