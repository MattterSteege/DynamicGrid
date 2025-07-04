class QueryParser {
    constructor(config) {
        this.config = {
            useStrictCase: config.useStrictCase || false,
            SymbolsToIgnore: config.SymbolsToIgnore || ['_', '-']
        }
    }

    // Constants for special query types, make sure that the order is from most specific to least specific
    static QUERIES = {
        FUZZY: /^search\s+"([^"]+)"$/i,   //'search "value"', search for a value in all fields
        GROUP: /group\s+(.+)/i,      //'group [key]', group by key
        RANGE: /range\s+(?:(-?\d+)-(-?\d+)?|(-?\d+))/i,    //'range [value]', limit the number of results (value = 10, 20-30, -10)
        SORT: /sort\s+(.+)\s+(asc|desc)/i,//'sort [key] [value]', sort by key (sort name asc)
        SELECT: /(\S+)\s(\S+)\s(.*)/i    //'[key] [operator] [value]', select items where key is value
    };

    //MAIN PARSING FUNCTION
    /**
     * Parses the query string into a query plan
     * @param query
     * @param plugins
     * @param headers
     * @returns {Array<{type: string, field: string, operator: string, value: string, queryType: string}>}
     */
    parseQuery(query, plugins, headers){
        return query.split(/\s+and\s+|\s+&&\s+/i)
                    .map(subQuery => this.parseSubQuery(subQuery.trim(), plugins, headers))
                    .filter(query => query.queryType);
    }


    parseSubQuery(subQuery, plugins, headers) {
        subQuery = subQuery.endsWith(' and') ? subQuery.slice(0, -4) : subQuery;

        if (!subQuery || subQuery.length === 0) {
            return {};
        }

        //from bottom to top, check if the QUERIES matches the subquery
        for (const [type, regex] of Object.entries(QueryParser.QUERIES)) {
            const match = regex.exec(subQuery);
            if (match) {
                return this.parseMatch(match, type, plugins, headers) || {};
            }
        }
        console.warn('Invalid query: ' + subQuery + '\n' + 'Valid queries are: ' + Object.keys(QueryParser.QUERIES).join(', ').toLowerCase() + '\n' + 'Query: ' + subQuery);
        return {};
    }

    /**
     * Parses a match into a query plan
     * @param match
     * @param type
     * @param plugins
     * @param headers
     * @returns {{type: string, field: string, operator: string, value: string, queryType: string}}
     */
    parseMatch(match, type, plugins, headers) {
        //console.log(match, type);
        if (type === 'SELECT') {
            let [_, key, operator, value] = match;
            key = findMatchingIndexKey(Object.keys(headers), key, this.config);
            const plugin = headers[key] && headers[key].plugin;
            if (!plugin) {
                throw new GridError('No plugin found for header (' + plugin.type + ') for key (' + key + ')\nDo you know certain that the name of the key is correct?');
            }

            if (!plugin.operators.includes(operator)) {
                throw new GridError(this.formatOperatorError(operator, key + ' ' + operator + ' ' + value, plugin));
            }

            if (!plugin.validate(value)) return;

            value = plugin.parseValue(value);

            return {type: plugin.name, field: key, operator: operator, value, queryType: 'SELECT'};
        }
        else if (type === 'SORT') {
            let [_, key, value] = match;
            const pluginType = headers[key].type;
            const plugin = plugins[pluginType];
            if (!plugin) {
                throw new GridError('No plugin found for header (' + pluginType + ') for key (' + key + ')');
            }

            return {type: pluginType, field: key, operator: 'sort', value, queryType: 'SORT'};
        }
        else if (type === 'RANGE') {
            let [_, lower, upper, single] = match;

            if (single !== undefined) {
                // Handle: range 10 or range -5
                lower = 0;
                upper = parseInt(single);
            } else {
                // Handle: range A-B, range A-, etc.
                lower = parseInt(lower);
                if (upper === undefined)
                    upper = Infinity;
                else
                    upper = parseInt(upper);

                if (isNaN(lower)) lower = 0;
            }

            // Convert to zero-based index
            lower = Math.max(0, lower - 1);

            return {type: 'range', lower, upper, queryType: 'RANGE'};
        }

        else if (type === 'GROUP') {
            let [_, key] = match;
            return {type: 'group', field: key, queryType: 'GROUP'};
        }
        else if (type === 'FUZZY') {
            const [_, searchText] = match;
            return { type: 'fuzzy', value: searchText.toLowerCase(), queryType: 'FUZZY' };
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
            '     options are:    ' + plugin.operators.join(', '),
            '\n'
        ].join('\n');
    }
}

