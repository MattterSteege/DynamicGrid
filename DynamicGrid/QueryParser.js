// @requires ./DynamicGridUtils.js

/**
 * QueryParser class for parsing and tokenizing query strings
 * Supports fuzzy search, grouping, range queries, sorting, and field selection
 */
class QueryParser {
    /**
     * @param {Object} config - Configuration object
     * @param {boolean} config.useStrictCase - Whether to use strict case matching
     * @param {string[]} config.SymbolsToIgnore - Array of symbols to ignore in matching
     */
    constructor(config = {}) {
        this.config = {
            useStrictCase: config.useStrictCase || false,
            SymbolsToIgnore: config.SymbolsToIgnore || ['_', '-']
        };
    }

    /**
     * Constants for special query types, ordered from most specific to least specific
     */
    static QUERIES = Object.freeze({
        // Fuzzy search has 2 parts: 'search' and any text (numbers, symbols and letters)
        FUZZY: ['search', /.+/],

        // Group has 2 parts: 'group' and a word (letters, numbers, underscores)
        GROUP: ['group', /[\w ]+/],

        // Range has 2 parts 'range' and [A|B, A, -A|-B, A-]
        RANGE: ['range', /(-?\d+-?)(?:\|(-?\d+))?/],

        // Sort has 3 parts: 'sort', a word (letters, underscores, spaces) and ['asc' or 'desc']
        SORT: ['sort', /[a-zA-Z_ ]+/, /asc|desc/],

        // Select has 3 parts: 'select', a word (letters, underscores, spaces), an operator and a value
        SELECT: [/[\w ]+/, /\S+/, /.+/],
    });

    /**
     * Splits query string on ' ' while respecting quoted strings
     * @param {string} query - The query string to split
     * @returns {string[]} - Array of sub-query strings
     * @throws {Error} If query is not a string
     */
    tokenize(query) {
        if (typeof query !== 'string') {
            throw new Error('Query must be a string');
        }

        const subQueries = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = null;
        let escapeNext = false;

        for (let i = 0; i < query.length; i++) {
            const char = query[i];

            if (escapeNext) {
                current += char;
                escapeNext = false;
            } else if (char === "\\") {
                escapeNext = true;
            } else if (char === '"' || char === "'") {
                if (inQuotes) {
                    if (char === quoteChar) {
                        inQuotes = false;
                        // We do not care about the closing quote
                    } else {
                        // Different quote inside string, treat as literal
                        current += char;
                    }
                } else {
                    inQuotes = true;
                    quoteChar = char;
                    // We do not care about the opening quote
                }
            } else if (char === ' ' && !inQuotes) {
                if (current.length > 0) {
                    subQueries.push(current);
                    current = '';
                }
            } else {
                current += char;
            }
        }

        if (current.length > 0) {
            subQueries.push(current);
        }

        return subQueries;
    }

    /**
     * Parses the query string into a query plan
     * @param {string} query - The query string to parse
     * @param {Object} headers - Headers to validate against
     * @param {number} dataLength - Length of the data to validate against
     * @returns {Array<Object>} Array of query objects
     * @throws {Error} If required parameters are missing
     */
    parseQuery(query, headers, dataLength) {
        if (!query || !headers) {
            throw new Error('Query, plugins, and headers are required parameters');
        }

        const tokens = this.tokenize(query);
        const subQueries = this.parseSubQuery(tokens, headers, dataLength);

        return subQueries.filter(query => query.queryType);
    }

    /**
     * Parses a sub-query string into a query object
     * @param {string[]} tokens - The array of tokens representing the sub-query
     * @param {Object} headers - The headers to validate against
     * @param {Number} dataLength - The length of the data to validate against
     * @returns {Array<Object>} Array of parsed query objects
     */
    parseSubQuery(tokens, headers, dataLength) {
        if (!Array.isArray(tokens)) {
            throw new Error('Tokens must be an array');
        }

        const queries = [];

        if (tokens.length === 0) {
            console.warn('Empty query string');
            return [];
        }

        for (let i = 0; i < tokens.length; i++) {
            const namingToken = tokens[i];

            switch (namingToken.toLowerCase()) {
                case 'and':
                case '&&': // 'and' is a logical operator, not a query type
                    break;

                case 'search':
                    i = this._handleSearchQuery(tokens, i, queries);
                    break;

                case 'group':
                    i = this._handleGroupQuery(tokens, i, queries);
                    break;

                case 'range':
                    i = this._handleRangeQuery(tokens, i, queries, dataLength);
                    break;

                case 'sort':
                    i = this._handleSortQuery(tokens, i, queries);
                    break;

                case 'select': // Just for show, case 'select' is not a possible query
                default:
                    i = this._handleSelectQuery(tokens, i, queries, headers, namingToken);
                    break;
            }
        }

        // If no valid queries were found, return an empty array
        if (queries.length === 0) {
            const validQueries = Object.keys(QueryParser.QUERIES).join(', ').toLowerCase();
            console.warn(`No valid queries found in: ${tokens.join(" ")}\nValid queries are: ${validQueries}`);
            return [];
        }

        return queries;
    }

    /**
     * Handles search query parsing
     * @private
     */
    _handleSearchQuery(tokens, index, queries) {
        if (index + 1 < tokens.length) {
            const searchText = tokens[index + 1];
            queries.push({
                type: 'fuzzy',
                value: searchText.toLowerCase(),
                queryType: 'FUZZY'
            });
            return index + 1; // Skip the next token as it's part of the fuzzy query
        } else {
            console.warn('Not enough arguments for fuzzy search');
            return index;
        }
    }

    /**
     * Handles group query parsing
     * @private
     */
    _handleGroupQuery(tokens, index, queries) {
        if (index + 1 < tokens.length) {
            const groupKey = tokens[index + 1];
            queries.push({
                type: 'group',
                field: groupKey,
                queryType: 'GROUP'
            });
            return index + 1; // Skip the next token as it's part of the group query
        } else {
            console.warn('Not enough arguments for group query');
            return index;
        }
    }

    /**
     * Handles range query parsing
     * @private
     */
    _handleRangeQuery(tokens, index, queries, dataLength) {
        if (index + 1 < tokens.length) {
            const rangeMatch = tokens[index + 1].match(QueryParser.QUERIES.RANGE[1]);
            if (rangeMatch) {
                const {lower, upper} = this.parseRange(rangeMatch[1], rangeMatch[2], dataLength);
                queries.push({type: 'range', lower: lower, upper: upper, queryType: 'RANGE'});
                return index + 1; // Skip the next token as it's part of the range query
            }
        } else {
            console.warn('Not enough arguments for range query');
        }
        return index;
    }

    /**
     * Handles sort query parsing
     * @private
     */
    _handleSortQuery(tokens, index, queries) {
        if (index + 1 < tokens.length) {
            const sortKey = tokens[index + 1];
            let sortOrder = 'asc'; // Default sort order
            let skipCount = 1;

            if (index + 2 < tokens.length &&
                (tokens[index + 2].toLowerCase() === 'asc' || tokens[index + 2].toLowerCase() === 'desc')) {
                sortOrder = tokens[index + 2].toLowerCase();
                skipCount = 2;
            }

            queries.push({
                type: 'sort',
                field: sortKey,
                value: sortOrder,
                queryType: 'SORT'
            });
            return index + skipCount;
        } else {
            console.warn('Not enough arguments for sort query');
            return index;
        }
    }

    /**
     * Handles select query parsing
     * @private
     */
    _handleSelectQuery(tokens, index, queries, headers, namingToken) {
        if (index + 2 < tokens.length) {
            const operator = tokens[index + 1];
            const value = tokens[index + 2];

            // Validate the key against headers
            const key = findMatchingIndexKey(Object.keys(headers), namingToken, this.config);
            if (!key) {
                console.warn(`Invalid key: ${namingToken}`);
                return index;
            }

            const selectQuery = this.parseSelect([namingToken, key, operator, value], 'SELECT', headers);
            if (Object.keys(selectQuery).length > 0) {
                queries.push(selectQuery);
            }
            return index + 2; // Skip the next two tokens as they are part of the select query
        } else {
            console.warn('Not enough arguments for select query');
            return index;
        }
    }

    /**
     * Parses a select query
     * @param {Array} match - Match array containing query components
     * @param {string} type - Query type
     * @param {Object} headers - Headers to validate against
     * @returns {Object} Parsed select query object
     */
    parseSelect(match, type, headers) {
        const [, key, operator, value] = match;
        const validatedKey = findMatchingIndexKey(Object.keys(headers), key, this.config);

        if (!validatedKey) {
            console.warn(`Invalid key: ${key}`);
            return {};
        }

        const plugin = headers[validatedKey]?.plugin;
        if (!plugin) {
            console.warn(`No plugin found for header (${plugin?.type}) for key (${validatedKey})\nAre you certain that the name of the key is correct?`);
            return {};
        }

        if (!plugin.operators.includes(operator)) {
            console.warn(this.formatOperatorError(operator, `${validatedKey} ${operator} ${value}`, plugin));
            return {};
        }

        if (!plugin.validate(value)) {
            console.warn(`Invalid value: "${value}"\nFor query: ${validatedKey} ${operator} ${value}`);
            return {};
        }

        const parsedValue = plugin.parseValue(value);

        return {
            type: plugin.name,
            field: validatedKey,
            operator: operator,
            value: parsedValue,
            queryType: 'SELECT'
        };
    }

    /**
     * Parses a range query
     * @returns {Object} Parsed range query object
     * @param {string} lower - The lower bound of the range (-?\d+-?)
     * @param {string} upper - The upper bound of the range (-?\d+)
     * @param {Number} dataLength - The length of the data to validate against
     */
    parseRange(lower, upper, dataLength) {
        /*
        -100|-10    // 100 from end till 10 from end
        10|-10      // 10 from start till 10 from end
        1|10        // 1 from start till 10 from start
        1|-100      // 1 from start till 100 from end
        10          // first 10 from start
        -10         // last 10 from end (now: lower = dataLength + 10, upper = dataLength)
        10-         // 10 from start till end
        */

        let parsedLower = lower ? parseInt(lower, 10) : null;
        let endsWithMinus = lower && lower.endsWith('-');
        let parsedUpper = null;

        // Special case: "-N" means lower = dataLength + N, upper = dataLength
        if (lower && lower.startsWith('-') && upper === undefined && !endsWithMinus) {
            parsedLower = dataLength - Math.abs(parseInt(lower, 10));
            parsedUpper = dataLength;
        } else {
            if (parsedLower < 0 && parsedLower + dataLength > 0)
                parsedLower += dataLength; // Adjust negative lower bounds based on data length

            parsedUpper = upper ? parseInt(upper, 10) : null;
            if (parsedUpper < 0 && parsedUpper + dataLength > 0)
                parsedUpper += dataLength; // Adjust negative upper bounds based on data length

            if (endsWithMinus) {
                parsedUpper = dataLength; // If lower ends with '-', it means range goes to the end of the data
            }

            if (parsedLower > 0 && parsedUpper === null) {
                parsedUpper = parsedLower; // If lower is positive and upper is not specified, set upper to lower
                parsedLower = 0; // Reset lower to start
            }

            return {
                type: 'range',
                lower: parsedLower,
                upper: parsedUpper,
                queryType: 'RANGE'
            };
        }

        return {
            type: 'range',
            lower: parsedLower,
            upper: parsedUpper,
            queryType: 'RANGE'
        };
    }

    /**
     * Formats operator error messages
     * @param {string} operator - The invalid operator
     * @param {string} field - The field being queried
     * @param {Object} plugin - The plugin object
     * @returns {string} Formatted error message
     */
    formatOperatorError(operator, field, plugin) {
        return [
            '\n\nInvalid operator:    ' + operator,
            '       For query:    ' + field,
            '     Options are:    ' + plugin.operators.join(', '),
            '\n'
        ].join('\n');
    }
}