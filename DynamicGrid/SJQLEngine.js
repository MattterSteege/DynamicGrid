class SJQLEngine {
    constructor(DynamicGrid) {
        this.data = [];
        this.headers = []; //['name:string', 'age:number', 'dob:date'] -> string = stringTypePlugin...
        this.plugins = [];
        this.currentQuery = {};
    }

    parseData(data) {
        //make sure that the data doesn't have any sub-objects
        return data.map((item, index) => {
            const newItem = {};
            newItem['internal_id'] = index
            for (const key of Object.keys(item)) {
                newItem[key] = item[key];
            }
            return newItem;
        });
    }

    //query = 'name == John and age > 25'
    // the output is meant to be right as: query AND THEN query AND THEN query, so building on the previous query
    parseQuery(query) {
        let subQueries = query.split(/and/i);
        for (let i = 0; i < subQueries.length; i++) {
            subQueries[i] = subQueries[i].trim();
            const key = subQueries[i].split(' ')[0];
            const pluginType = this.headers[key];
            const plugin = this.getPlugin(pluginType);
            if (!plugin) {
                throw new Error('No plugin found for header (' + pluginType + ') for key (' + key + ')');
            }

            let [field, operator, value] = subQueries[i].split(' ');

            operator = plugin.getOperator(operator);

            if (!operator) {
                throw new Error('\n\nInvalid operator:    ' + subQueries[i].split(' ')[1] + '\n       For query:    ' + subQueries[i] + '\n     options are:    ' + plugin.getOperatorSymbols().join(', ') + '\n');
            }

            if (plugin.validate(value)) {
                value = plugin.getJSQLFormat(value);
            }

            const type = this.headers[key];

            subQueries[i] = {type, field, operator: operator.name, value};
        }
        return subQueries;
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
        let subQueries = this.parseQuery(query);
        for (let i = 0; i < subQueries.length; i++) {
            data = this.getPlugin(subQueries[i].type).evaluate(subQueries[i], data); //set data to the result of the query, so that the next query can be performed on the result of the previous query
        }

        this.currentQuery = subQueries;
        return data;
    }

    //================================================== PLUGIN SYSTEM ==================================================
    addPlugin(plugin) {
        if (!(plugin instanceof TypePlugin)) {
            throw new Error('Plugin must extend TypePlugin');
        }

        //if already exists, remove it and add the new one, while warning the user
        const existingPlugin = this.getPlugin(plugin.name, true);
        if (existingPlugin) {
            console.warn('Plugin already exists, removing the old plugin');
            this.plugins = this.plugins.filter(plugin => plugin.name !== existingPlugin.name);
        }

        this.plugins.push(plugin);
    }

    getPlugin(name, justChecking = false) {
        if (!name) {
            throw new Error('Plugin name not provided');
        }

        if (!name.endsWith('TypePlugin')) {
            name = name + 'TypePlugin';
        }

        const plugin = this.plugins.find(plugin => plugin.name === name);

        if (!plugin && !justChecking) {
            throw new Error('Plugin not found');
        }
        else if (!plugin && justChecking) {
            return false;
        }

        return plugin;
    }
}

/*
### SJQL (Simple Javascript query langauge) query rules

1. **Conditions**:
   - `AND`, `OR`: Combines multiple conditions.

2. **Operators**:
   - `=`: Equals
   - `!=`: Not equals
   - `>`: Greater than
   - `<`: Less than
   - `>=`: Greater than or equal to
   - `<=`: Less than or equal to
   - `CONTAINS`: Checks if a field contains a substring or element.
   - `IN`: Checks if a field's value is in a list of options.

3. **Modifiers**:
   - `ORDER BY`: Sorts the result by a field.
   - `LIMIT`: Restricts the number of results returned.

4. **Literals**:
   - Strings are enclosed in quotes (`"example"`).
   - Numbers and booleans are unquoted (`42`, `true`, `false`).
   - Lists are enclosed in square brackets (`[1, 2, 3]`).


### Example Queries
1. `name = "John" AND age > 25`
2. `name = "John" OR age > 25`
3. `name = "John" AND age > 25 ORDER BY age`
4. `name = "John" AND age > 25 ORDER BY age LIMIT 10`
5. `name = "John" AND age > 25 ORDER BY age LIMIT 10 OFFSET 5`
*/