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

        this.config = {
            UseDataIndexing: engine_config.UseDataIndexing || true,
            useStrictCase: engine_config.useStrictCase || false,
            SymbolsToIgnore: engine_config.SymbolsToIgnore || [' ', '_', '-']
        };

        this.eventEmitter = eventEmitter;

        this.currentQueryStr = '';
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

    //================================================== SELECT ==================================================
    addSelect(key, operator, value) {
        if (!key || !operator || value === undefined) return;

        const newClause = `${key} ${operator} ${value}`;

        if (this.currentQueryStr.length === 0)
            this.currentQueryStr = newClause;
        else
            this.currentQueryStr += `and ${newClause}`;
    }

    setSelect(key, operator, value) {
        this.removeSelect(key);
        this.addSelect(key, operator, value);
    }

    removeSelect(key, operator, value) {
        if (key !== undefined && operator === undefined && value === undefined) {
            // Remove all clauses with the specified key
            this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith(key)).join(' and ');
        }

        else if (key !== undefined && operator !== undefined && value === undefined) {
            // Remove all clauses with the specified key and operator
            this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith(`${key} ${operator}`)).join(' and ');
        }
        else if (key !== undefined && operator !== undefined && value !== undefined) {
            // Remove the specific clause
            const clauseToRemove = `${key} ${operator} ${value}`;
            this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => clause.trim() !== clauseToRemove).join(' and ');
        }
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
        grid.eventEmitter.emit('engine-query-update', grid.engine.currentQueryStr);
        return this.query(this.currentQueryStr);
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

    //================================================== IMPORT ==================================================
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

    alterData(datum, column, value) {
        if (this.data && this.data.length > 0) {
            this.data[datum][column] = value;
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

    //=================================================== EXPORT ==================================================
    /**
     * Request and handle an export in the specified file type
     * @param {string} fileType - The type of file to export (e.g., 'csv', 'xlsx')
     * @param {string} fileName - The name for the exported file
     */
    requestExport(fileType, fileName) {
        const Connector = this.getConnector(fileType);
        if (!Connector) {
            console.error('Connector not found: ' + fileType);
            return;
        }

        // Prepare data without internal_id
        const exportData = this.data.map(row => {
            const newRow = {};
            Object.keys(row).forEach(key => {
                if (key !== 'internal_id') {
                    newRow[key] = row[key];
                }
            });
            return newRow;
        });

        try {
            //export the data without the internal_id
            const exportResult = Connector.export(this.data.map(row => {
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
            const blob = new Blob([exportResult], { type: Connector.mimeType });

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
        }
    }
}