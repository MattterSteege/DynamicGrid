/**
 * Abstract base class for type-specific plugins that handle data operations and rendering.
 * @abstract
 */
class TypePlugin {
    /**
     * Standard operators available to all type plugins
     * @readonly
     * @static
     */
    static DEFAULT_OPERATORS = ['==', '!=', 'in'];

    /**
     * Initialize the plugin
     */
    constructor() {
        if (this.constructor === TypePlugin) {
            throw new Error('TypePlugin is abstract and cannot be instantiated directly');
        }

        this.name = this.constructor.name;
        //if this.operators is set and the value it is set to is not equal to the default operators, then set the operators to those operators + the default operators
        this.operators = ['==', '!=', 'in'];
    }

    /**
     * Format a value according to JSQL requirements
     * @param {*} value The value to format
     * @returns {string} Formatted value
     * @abstract
     */
    getJSQLFormat(value) {
        throw new Error('getJSQLFormat must be implemented by subclass');
    }

    /**
     * Validate if a value is acceptable for this type
     * @param {*} value The value to validate
     * @returns {boolean} True if valid
     * @abstract
     */
    validate(value) {
        throw new Error('validate must be implemented by subclass');
    }

    /**
     * Evaluate a query against data
     * @param {Object} query Query to evaluate
     * @param {Map<string, number>} dataIndexes Map of column names to indices
     * @param {Array<Array>} data Data rows to evaluate
     * @param {Set<number>} indices Set of row indices to consider
     * @returns {*} Query result
     * @abstract
     */
    evaluate(query, dataIndexes, data, indices) {
        throw new Error('evaluate must be implemented by subclass');
    }

    /**
     * Evaluate a condition against a data value
     * @param {*} dataValue Value from data
     * @param {string} operator Comparison operator
     * @param {*} compareValue Value to compare against
     * @returns {boolean} Result of comparison
     * @abstract
     */
    evaluateCondition(dataValue, operator, compareValue) {
        throw new Error('evaluateCondition must be implemented by subclass');
    }

    /**
     * Sort data based on query parameters
     * @param {{field: string, value: 'asc'|'desc'}} query Sort parameters
     * @param {Array<Object>} data Data to sort
     * @returns {Array<Object>} Sorted data
     */
    sort(query, data) {
        const { field, value: direction } = query;

        return [...data].sort((a, b) => {
            const comparison = String(a[field]).localeCompare(String(b[field]));
            return direction === 'asc' ? comparison : -comparison;
        });
    }

    /**
     * Check if an operator is supported
     * @param {string} operator Operator to check
     * @returns {string|undefined} Operator if supported, undefined otherwise
     * @protected
     */
    checkOperator(operator) {
        return this.operators.find(op => op === operator);
    }

    /**
     * Get all supported operator symbols
     * @returns {string[]} Array of operator symbols
     * @protected
     */
    getOperatorSymbols() {
        return [...this.operators];
    }

    /**
     * Create a table header cell
     * @param {string} key Header text
     * @returns {HTMLTableCellElement} Header cell element
     * @abstract
     */
    renderHeader(key) {
        const th = document.createElement('th');
        th.textContent = key;
        return th;
    }

    /**
     * Create a table data cell
     * @param {*} value Cell value
     * @returns {HTMLTableCellElement} Data cell element
     * @abstract
     */
    renderCell(value) {
        const td = document.createElement('td');
        td.textContent = String(value);
        return td;
    }

    /**
     * Handle additional data loading
     * @param {string} key Data key
     * @param {Object} dynamicGrid Grid instance
     * @abstract
     */
    showMore(key, dynamicGrid) {
        throw new GridError('showMore must be implemented by subclass');
        return;
    }
}