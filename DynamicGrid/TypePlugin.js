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
     * @param {Map<string, Set>} dataIndexes Map of column names to indices
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
     * @returns {string} Data cell element
     * @abstract
     */
    renderCell(value) {
        return String(value);
    }

    /**
     * Handle additional data loading
     * @param {string} key Data key
     * @param {HTMLElement} element Clicked element
     * @param {Object} dynamicGrid Grid instance
     */
    showMore(key, element, dynamicGrid) {

        const {x, y} = element.getBoundingClientRect();

        // Define the context menu configuration
        const items =  [
            { text: 'Sort ' + key + ' ascending', onclick: () => dynamicGrid.ui.render(dynamicGrid.engine.sort(key, 'asc')) },
            { text: 'Sort ' + key + ' descending', onclick: () => dynamicGrid.ui.render(dynamicGrid.engine.sort(key, 'desc')) },
            { text: 'Unsort ' + key, onclick: () => dynamicGrid.ui.render(dynamicGrid.engine.sort(key, 'original')) },
            null,
            { text: 'Group by ' + key, onclick: () => dynamicGrid.ui.render(dynamicGrid.engine.group(key)) },
            { text: 'Un-group', onclick: () => dynamicGrid.ui.render(dynamicGrid.engine.group()) }
        ];

        // Initialize the context menu
        const menu = new ContextMenu(document.body, items)
        menu.display(x, y + 30);
    }
}