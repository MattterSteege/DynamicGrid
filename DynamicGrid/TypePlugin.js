/**
 * Base class for type-specific plugins that handle data operations and rendering.
 * This class should be extended by specific type implementations.
 */
class TypePlugin {
    /**
     * Initialize the plugin with its name and operators.
     */
    constructor() {
        this.name = this.constructor.name;
        this.operators = [];
        this.addOperators();
    }

    //==================================================
    // CORE DATA OPERATIONS
    //==================================================

    /**
     * Format a value according to JSQL requirements.
     * @param {*} value - The value to format
     * @returns {string} - Formatted value as string
     */
    getJSQLFormat(value) {
        console.warn("getHeaderFormat not implemented for plugin: ", this.name);
        return value.toString();
    }

    /**
     * Validate if a value is acceptable for this type.
     * @param {*} value - The value to validate
     * @returns {boolean} - True if valid, false otherwise
     */
    validate(value) {
        console.warn("validate not implemented for plugin: ", this.name);
        return true;
    }

    /**
     * Evaluate a query against a data row.
     * @param {Object} query - The query to evaluate
     * @param {Map} dataIndexes - The map of data indexes
     * @param {Array} data - The data to evaluate
     * @param {Set} indices - The set of indices to evaluate
     * @returns {*} - The evaluated result
     */
    evaluate(query, dataIndexes, data, indices) {
        console.warn("evaluate not implemented for plugin: ", this.name);
        return data;
    }

    /**
     * Evaluate a condition against a data value.
     * @param {*} dataValue - The data value to evaluate
     * @param {string} operator - The operator to use
     * @param {*} value - The value to compare against
     * @returns {boolean} - The result of the evaluation
     */
    evaluateCondition(dataValue, operator, value) {
        console.warn("evaluateCondition not implemented for plugin: ", this.name);
        return false;
    }

    /**
     * Sort data based on a query.
     * @param {Object} query - The sort query containing field and value
     * @param {Array} data - The data to sort
     * @returns {Array} - Sorted data array
     */
    sort(query, data) {
        const { field, value } = query;
        return data.sort((a, b) => {
            if (value === 'asc') {
                return a[field].localeCompare(b[field]);
            }
            else if (value === 'desc') {
                return b[field].localeCompare(a[field]);
            }
        });
    }

    //==================================================
    // OPERATOR MANAGEMENT
    //==================================================

    /**
     * Initialize the standard set of operators.
     */
    addOperators() {
        this.operators = ['==', '!=', 'in'];
    }

    /**
     * Find an operator by its name or symbol.
     * @param {string} operator - Operator name or symbol
     * @returns {Object|undefined} - The operator object or undefined if not found
     */
    checkOperator(operator) {
        try {
            return this.operators.find(op => op === operator);
        }
        catch (e) {
            return undefined;
        }
    }

    /**
     * Get all operator symbols.
     * @returns {Array} - The array of operator symbols
     */
    getOperatorSymbols = () => this.operators;

    //==================================================
    // DOM RENDERING
    //==================================================

    /**
     * Render a header cell.
     * @param {string} key - The header key/text
     * @returns {HTMLTableCellElement} - The header cell element
     */
    renderHeader(key) {
        const elem = document.createElement('th');
        elem.innerHTML = key;
        return elem;
    }

    /**
     * Render a data cell.
     * @param {*} value - The cell value
     * @returns {HTMLTableCellElement} - The data cell element
     */
    renderCell(value) {
        const elem = document.createElement('td');
        elem.innerHTML = value;
        return elem;
    }

    handleMore(key, dynamicGrid) {
        console.warn("handleMore not implemented for plugin: ", this.name);
    }
}