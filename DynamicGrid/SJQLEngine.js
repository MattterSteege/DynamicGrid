class SJQLEngine {
    constructor(DynamicGrid) {
        this.data = [];
        this.headers = []; //['name:string', 'age:number', 'dob:date'] -> string = stringTypePlugin...
        this.plugins = [];
        this.currentQuery = {};
        this.QueryParser = new QueryParser(this);
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
            if (this.currentQuery[i].queryType === 'OFFSET'){
                data = data.slice(this.currentQuery[i].value)
            }
            if (this.currentQuery[i].queryType === 'LIMIT') {
                data = data.slice(0, this.currentQuery[i].value);
            }
            if (this.currentQuery[i].queryType === 'SELECT') {
                data = this.getPlugin(this.currentQuery[i].type).evaluate(this.currentQuery[i], data); //set data to the result of the query, so that the next query can be performed on the result of the previous query
            }
        }

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