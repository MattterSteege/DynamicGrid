class QueryParser {
    constructor() {}

    // Constants for special query types, make sure that the order is from most specific to least specific
    static QUERIES = {
        RANGE: /range\s+(-?\d+)-?(-?\d+)?/,    //'range [value]', limit the number of results (value = 10, 20-30, -10)
        SORT: /sort\s+([A-Za-z]+)\s+(asc|desc)/,//'sort [key] [value]', sort by key (sort name asc)
        SELECT: /([A-Za-z]+)\s+(\S+)\s+(.+)/    //'[key] [operator] [value]', select items where key is value
    };

    //MAIN PARSING FUNCTION
    parseQuery = (query, plugins, headers) => query.split(/\s+and\s+/i)
                            .map(subQuery => this.parseSubQuery(subQuery.trim(), plugins, headers))
                            .filter(query => query.queryType);


    parseSubQuery(subQuery, plugins, headers) {
        subQuery = subQuery.endsWith(' and') ? subQuery.slice(0, -4) : subQuery;
        //from bottom to top, check if the QUERIES matches the subquery
        for (const [type, regex] of Object.entries(QueryParser.QUERIES)) {
            const match = regex.exec(subQuery);
            if (match) {
                return this.parseMatch(match, type, plugins, headers) || {};
            }
        }
        console.warn('Invalid query: ' + subQuery + '\n' + 'Valid queries are: ' + Object.keys(QueryParser.QUERIES).join(', ').toLowerCase());
        return {};
    }

    parseMatch(match, type, plugins, headers) {
        if (type === 'SELECT') {
            let [_, key, operator, value] = match;
            const pluginType = headers[key];
            const plugin = plugins[pluginType];
            if (!plugin) {
                throw new GridError('No plugin found for header (' + pluginType + ') for key (' + key + ')');
            }

            let field = key;
            let operatorObj = plugin.checkOperator(operator);

            if (!operatorObj) {
                throw new GridError(this.formatOperatorError(operator, field + ' ' + operator + ' ' + value, plugin));
            }

            if (plugin.validate(value)) {
                value = plugin.getJSQLFormat(value);
            }

            return {type: pluginType, field, operator: operatorObj, value, queryType: 'SELECT'};
        }
        else if (type === 'SORT') {
            let [_, key, value] = match;
            const pluginType = headers[key];
            const plugin = plugins.getPlugin(pluginType);
            if (!plugin) {
                throw new GridError('No plugin found for header (' + pluginType + ') for key (' + key + ')');
            }

            return {type: pluginType, field: key, operator: 'sort', value, queryType: 'SORT'};
        }
        else if (type === 'RANGE') {
            let [_, lower, upper] = match;
            if (upper === undefined) {
                upper = lower;
                lower = 0;
            }
            lower = parseInt(lower);
            upper = parseInt(upper);
            return {type: 'range', field: 'range', operator: 'range', lower, upper, queryType: 'RANGE'};
        }
        else {
            console.warn('Invalid query: ' + match + '\n' + 'Valid queries are: ' + Object.keys(QueryParser.QUERIES).join(', ').toLowerCase());
            return {};
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

