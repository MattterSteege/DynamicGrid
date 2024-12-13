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
     * @returns {boolean} True if operator is supported
     * @protected
     */
    checkOperator(operator) {
        return this.operators.find(op => op === operator) || false;
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
     * Create a table data cell
     * @param {*} value Cell value (that can be .toString()ed)
     * @return {HTMLElement} Data cell element (div)
     * @virtual (should be overridden, not required)
     */
    renderCell(value) {
        const cell = document.createElement('div');
        cell.innerText = String(value);
        return cell;
    }

    /**
     * Create a table data cell for editing
     * @param {*} value Cell value (that can be .toString()ed)
     * @param {Function} onEdit Callback function for when cell is edited
     * @returns {HTMLElement} Data cell element (div)
     * @virtual (should be overridden, not required)
     */
    renderEditableCell(value, onEdit) {
        const cell = document.createElement('div');
        cell.innerHTML = String(value);
        cell.contentEditable = true;
        cell.spellcheck = false;

        cell.addEventListener('focusout', (e) => {
            onEdit(cell.innerText);
        });

        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                cell.blur();
                e.preventDefault();
            }
        });

        return cell;
    }

    /**
     * Handle additional data loading
     * @param {string} key Data key
     * @param {HTMLElement} element Clicked element
     * @param {SJQLEngine} engine Query engine instance
     * @param {DynamicGridUI} UI User interface instance
     * @virtual (should be overridden, not required)
     */
    showMore(key, element, engine, UI) {
        const {x, y} = element.getBoundingClientRect();

        // Define the context menu configuration
        const items =  [
            { text: 'Sort ' + key + ' ascending', onclick: () => UI.render(engine.sort(key, 'asc')) },
            { text: 'Sort ' + key + ' descending', onclick: () => UI.render(engine.sort(key, 'desc')) },
            { text: 'Unsort ' + key, onclick: () => UI.render(engine.sort(key, 'original')) },
            null,
            { text: 'Group by ' + key, onclick: () => UI.render(engine.groupBy(key)) },
            { text: 'Un-group', onclick: () => UI.render(engine.groupBy()) }
        ];

        // Initialize the context menu
        const menu = new ContextMenu(document.body, items)
        menu.display(x, y + 30);
    }
}