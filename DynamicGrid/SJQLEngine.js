class SJQLEngine {
    constructor(DynamicGrid) {
        this.data = [];
        this.headers = []; //[name:'string', age:'number', dob:'date'] -> string = stringTypePlugin...
        this.plugins = [];
        this.currentQuery = {};
        this.QueryParser = new QueryParser(this);
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

        return data.map((item, index) => {
            const newItem = {};
            newItem['internal_id'] = index
            for (const key of Object.keys(item)) {
                newItem[key] = item[key];
            }
            return newItem;
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

    query(query) {

        if (!this.data || this.data.length === 0) {
            console.warn('No data provided, returning empty array');
            return [];
        }

        if (!query) {
            console.warn('No query provided, returning all data');
            return this.data;
        }

        let data = this.data;
        this.currentQuery = this.QueryParser.parseQuery(query);
        for (let i = 0; i < this.currentQuery.length; i++) {
            if (this.currentQuery[i].queryType === 'SORT') {
                data = this.getPlugin(this.currentQuery[i].type).sort(this.currentQuery[i], data);
            }
            if (this.currentQuery[i].queryType === 'RANGE') {
                //value can be like this: 10, 20-30, ^10 (last 10)
                const lower = this.currentQuery[i].lower;
                const upper = this.currentQuery[i].upper;
                console.log(lower, upper)
                //if upper is not provided, get the last n elements
                //if lower or upper are negative, get the last n elements
                if (upper === undefined) {
                    data = data.slice(lower);
                }
                else {
                    data = data.slice(lower, upper);
                }
            }
            if (this.currentQuery[i].queryType === 'SELECT') {
                data = this.getPlugin(this.currentQuery[i].type).evaluate(this.currentQuery[i], data);
            }
        }

        return data;
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
        if (!name) {
            throw new Error('Plugin name not provided');
        }

        const plugin = this.plugins[name.replace("TypePlugin", "")];

        if (!plugin && !justChecking) {
            throw new Error('Plugin not found');
        }
        else if (!plugin && justChecking) {
            return false;
        }

        return plugin;
    }
}