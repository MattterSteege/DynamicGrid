class QueryParser {
    // Constants for special query types, make sure that the order is from most specific to least specific
    static QUERIES = {
        LIMIT: /limit\s+(\d+)/,                 //'limit [value]', limit the number of results
        SORT: /sort\s+([A-Za-z]+)\s+(asc|desc)/,//SORT: 'sort [key] [value]', sort by key (sort name asc)
        SELECT: /([A-Za-z]+)\s+(\S+)\s+(.+)/    //'[key] [operator] [value]', select items where key is value
    };

    constructor(engine) {
        this.engine = engine;
    }

    //MAIN PARSING FUNCTION
    parseQuery(query) {
        return query
            .split(/\s+and\s+/i)
            .map(subQuery => this.parseSubQuery(subQuery.trim()))
            .filter(query => query.queryType);
    }

    parseSubQuery(subQuery) {
        //from bottom to top, check if the QUERIES matches the subquery
        for (const [type, regex] of Object.entries(QueryParser.QUERIES)) {
            const match = regex.exec(subQuery);
            if (match) {
                return this.parseMatch(match, type) || {};
            }
        }
    }

    parseMatch(match, type) {
        if (type === 'SELECT') {
            let [_, key, operator, value] = match;
            const pluginType = this.engine.headers[key];
            const plugin = this.engine.getPlugin(pluginType);
            if (!plugin) {
                throw new Error('No plugin found for header (' + pluginType + ') for key (' + key + ')');
            }

            let field = key;
            let operatorObj = plugin.getOperator(operator);

            if (!operatorObj) {
                throw new Error(this.formatOperatorError(operator, field, plugin));
            }

            if (plugin.validate(value)) {
                value = plugin.getJSQLFormat(value);
            }

            return {type: pluginType, field, operator: operatorObj.name, value, queryType: 'SELECT'};
        }
        if (type === 'SORT') {
            let [_, key, value] = match;
            const pluginType = this.engine.headers[key];
            const plugin = this.engine.getPlugin(pluginType);
            if (!plugin) {
                throw new Error('No plugin found for header (' + pluginType + ') for key (' + key + ')');
            }

            return {type: pluginType, field: key, operator: 'sort', value, queryType: 'SORT'};
        }
        if (type === 'LIMIT') {
            return {operator: "limit", value: match[1], queryType: 'LIMIT'};
        }
    }

    formatOperatorError(operator, field, plugin) {
        return [
            '\n\nInvalid operator:    ' + operator,
            '       For query:    ' + field,
            '     options are:    ' + plugin.getOperatorSymbols().join(', '),
            '\n'
        ].join('\n');
    }
}