/**
 * Abstract base class for type-specific plugins that handle data operations and rendering.
 * @abstract
 * @deprecated Use BaseTypePlugin instead, as this class is just for reference for now, and will be removed in future versions.
 * @see BaseTypePlugin
 */
class TypePlugin {
    /**
     * Standard operators available to all type plugins
     * @readonly
     * @static
     */
    static DEFAULT_OPERATORS = ['==', '!='];

    /**
     * Initialize the plugin
     * @constructor
     * @throws {Error} If instantiated directly
     * @throws {Error} If subclass does not implement required methods
     * @property {string} name Name of the plugin, derived from the class name
     */
    constructor() {
        if (this.constructor === TypePlugin) {
            throw new Error('TypePlugin is abstract and cannot be instantiated directly');
        }

        this.name = this.constructor.name;
        this.operators = ['==', '!='];
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
     * Parses the string representation of a value into the appropriate type
     * @param {string} value The string value to parse
     * @returns {*} Parsed value
     * @abstract
     */
    parseValue(value) {
        throw new Error('parseValue must be implemented by subclass');
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
     * @virtual
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
     * Create a table data cell with flexible rendering options
     * @param {*} value Cell value
     * @param onEdit {Function} Callback function for when cell is edited
     * @param {columnConfig} columnConfig Column configuration object
     * @param {boolean} [columnConfig.isEditable=false] Whether the cell is editable
     * @param {boolean} [columnConfig.isSortable=true] Whether the cell is sortable
     * @param {boolean} [columnConfig.isGroupable=true] Whether the cell can be grouped
     * @param {boolean} [columnConfig.isUnique=false] Whether the cell value must be unique
     * @param {boolean} [columnConfig.spellCheck=false] Whether to enable spellcheck
     * @param {Object} [columnConfig.cellStyle={}] Inline styles for the cell
     * @param {string} [columnConfig.cellClass=''] CSS class for the cell
     * @param {string} [columnConfig.headerClass=''] CSS class for the header
     * @param {Function} [columnConfig.cellValueValidator] Function to validate the cell value
     * @return {HTMLElement} Data cell element
     * @protected
     */
    renderCell(value, onEdit, columnConfig = {}) {
        // Use default rendering
        const cell = columnConfig.isEditable ? this.createEditableCell(value, onEdit, columnConfig) : this.createCell(value);

        // Apply custom styles if provided
        if (columnConfig.cellStyle) {
            Object.assign(cell.style, columnConfig.cellStyle);
        }

        return cell;
    }

    /**
     * Default cell creation (can be overridden by subclasses)
     * @param {*} displayValue Formatted display value
     * @returns {HTMLElement} Cell element
     * @protected
     */
    createCell(displayValue) {
        const cell = document.createElement('span');
        cell.innerHTML = String(displayValue);
        return cell;
    }

    /**
     * Default editable cell creation (can be overridden by subclasses)
     * @param {string} rawValue Original raw value
     * @param {Function} onEdit Edit callback
     * @param {Object} columnConfig Column configuration
     * @returns {HTMLElement} Cell element
     * @protected
     */
    createEditableCell(rawValue, onEdit, columnConfig) {
        const cell = document.createElement('span');
        cell.innerHTML = String(rawValue);
        cell.contentEditable = true;
        cell.classList.add('editable');
        cell.spellcheck = columnConfig.spellCheck || false; // Allow spellcheck if specified

        cell.addEventListener('focus', (e) => {
            cell.classList.add('editing');
            cell.setAttribute('data-editing', 'true');
            // Store raw value for comparison, not formatted value
            cell.setAttribute('start-value', String(rawValue));

            // Show raw value for editing
            cell.innerHTML = String(rawValue);
        });

        cell.addEventListener('focusout', (e) => {
            cell.classList.remove('editing');
            cell.removeAttribute('data-editing');

            const newValue = cell.innerText;
            const startValue = cell.getAttribute('start-value');
            rawValue = newValue;


            if (columnConfig.cellValueValidator) {
                const validationResult = columnConfig.cellValueValidator(rawValue);
                if (validationResult.valid !== true) {
                    // If validation fails, revert to the original value
                    cell.innerHTML = String(rawValue);
                    cell.setAttribute('data-invalid', 'true');
                    console.warn(`Invalid value for ${columnConfig.key}:`, validationResult);
                    return;
                } else {
                    cell.removeAttribute('data-invalid');
                }
            }

            if (startValue !== newValue) {
                // Parse the new value using the plugin's parseValue method
                rawValue = this.parseValue(newValue);
                onEdit(rawValue);
            }

            cell.innerHTML = String(rawValue);

            cell.removeAttribute('start-value');
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
     * Handle additional data loading with flexible menu options
     * @param {string} key Data key
     * @param {HTMLElement} element Clicked element
     * @param {SJQLEngine} engine Query engine instance
     * @param {DynamicGridUI} UI User interface instance
     * @param {Object} columnConfig Column configuration object
     * @returns {HTMLDivElement} Context menu element
     * @virtual
     */
    showMore(key, element, engine, UI, columnConfig = {}) {
        const {x, y, width, height} = element.getBoundingClientRect();

        // Default sort options (unless disabled)
        if (columnConfig.isSortable) {
            UI.contextMenu
                .button('Sort ' + key + ' ascending', () => {
                    engine.setSort(key, 'asc');
                    UI.render(engine.runCurrentQuery());
                })
                .button('Sort ' + key + ' descending', () => {
                    engine.setSort(key, 'desc');
                    UI.render(engine.runCurrentQuery());
                })
                .button('Unsort ' + key, () => {
                    engine.setSort(key);
                    UI.render(engine.runCurrentQuery());
                });
        }

        // Default group options (unless disabled)
        if (!columnConfig.isUnique && columnConfig.isGroupable) {
            UI.contextMenu
                .separator()
                .button('Group by ' + key, () => {
                    engine.setGroup(key);
                    UI.render(engine.runCurrentQuery());
                })
                .button('Un-group', () => {
                    engine.setGroup();
                    UI.render(engine.runCurrentQuery());
                });
        }

        return UI.contextMenu.showAt(x, y + height);
    }
}
