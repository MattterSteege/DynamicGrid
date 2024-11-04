class QueryParser {
    // Constants for special query types, make sure that the order is from most specific to least specific
    static QUERIES = {
        RANGE: /range\s+(-?\d+)-?(-?\d+)?/,    //'range [value]', limit the number of results (value = 10, 20-30, -10)
        SORT: /sort\s+([A-Za-z]+)\s+(asc|desc)/,//'sort [key] [value]', sort by key (sort name asc)
        SELECT: /([A-Za-z]+)\s+(\S+)\s+(.+)/    //'[key] [operator] [value]', select items where key is value
    };

    constructor(engine) {
        this.engine = engine;
    }

    //MAIN PARSING FUNCTION
    parseQuery(query, dataIndexes) {
        let cleanedQueries = query
            .split(/\s+and\s+/i)
            .map(subQuery => this.parseSubQuery(subQuery.trim(), dataIndexes))
            .filter(query => query.queryType)
        //sort the SELECT queries from highest to lowest indexedItemsCount (so there specificity is higher)
        cleanedQueries = cleanedQueries.sort((a, b) => {
            if (a.indexedItemsCount < b.indexedItemsCount) {
                return 1;
            }
            if (a.indexedItemsCount > b.indexedItemsCount) {
                return -1;
            }
            return 0;
        });


        console.log(cleanedQueries);

        return cleanedQueries;
    }

    parseSubQuery(subQuery, dataIndexes) {
        subQuery = subQuery.endsWith(' and') ? subQuery.slice(0, -4) : subQuery;
        //from bottom to top, check if the QUERIES matches the subquery
        for (const [type, regex] of Object.entries(QueryParser.QUERIES)) {
            const match = regex.exec(subQuery);
            if (match) {
                return this.parseMatch(match, type, dataIndexes) || {};
            }
        }
        console.warn('Invalid query: ' + subQuery + '\n' + 'Valid queries are: ' + Object.keys(QueryParser.QUERIES).join(', ').toLowerCase());
        return {};
    }

    parseMatch(match, type, dataIndexes) {
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

            return (dataIndexes ? {type: pluginType, field, operator: operatorObj.name, value, queryType: 'SELECT', indexedItemsCount: dataIndexes[key].size} : {type: pluginType, field, operator: operatorObj.name, value, queryType: 'SELECT', indexedItemsCount: 0});
        }
        else if (type === 'SORT') {
            let [_, key, value] = match;
            const pluginType = this.engine.headers[key];
            const plugin = this.engine.getPlugin(pluginType);
            if (!plugin) {
                throw new Error('No plugin found for header (' + pluginType + ') for key (' + key + ')');
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