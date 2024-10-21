class SJQLEngine {
    constructor(DynamicGrid) {
        this.data = [];
        this.headers = DynamicGrid.headers; //['name:string', 'age:number', 'dob:date'] -> string = stringTypePlugin...
        this.plugins = DynamicGrid.plugins;
        this.DynamicGrid = DynamicGrid;
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

    //filter the data based on the query
    //query = 'name == John and age > 25'
    filterData(query) {
        //replace all the field names with their internal names (name -> name:string)
        //split the query into tokens
        //parse the tokens into an array of objects
        //filter the data
        const internalQuery = this.parseQuery(query);
        return this.filterDataInternal(internalQuery);
    }

    //query = 'name == John and age > 25'
    // the output is meant to be right as: query AND THEN query AND THEN query, so building on the previous query
    parseQuery(query) {

        query = query.toLocaleLowerCase();
        let subQueries = query.split(/and/);
        for (let i = 0; i < subQueries.length; i++) {
            subQueries[i] = subQueries[i].trim();
            const key = subQueries[i].split(' ')[0];
            const pluginType = this.headers[key] + 'TypePlugin';
            const plugin = this.plugins.find(plugin => plugin.name === pluginType);
            if (!plugin) {
                throw new Error('No plugin found for header (' + pluginType + ') for key (' + key + ')');
            }

            let [field, operator, value] = subQueries[i].split(' ');

            operator = this.DynamicGrid.constants.getOperator(operator).name;

            if (plugin.validate(value)) {
                value = plugin.getHeaderFormat(value);
            }

            const type = this.headers[key];

            subQueries[i] = {type, field, operator, value};
        }

        return subQueries;
    }


    filterDataInternal(query) {

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