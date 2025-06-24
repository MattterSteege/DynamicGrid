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
     * @param {Object} columnConfig Column configuration object
     * @param {Object} params Additional parameters (row data, column key, etc.)
     * @return {HTMLElement} Data cell element
     */
    renderCell(value, onEdit, columnConfig = {}) {

        // Use custom cell renderer if provided
        if (columnConfig.cellRenderer) {
            return columnConfig.cellRenderer(value, columnConfig);
        }

        // Apply value formatter if provided
        let displayValue = value;
        if (columnConfig.valueFormatter) {
            displayValue = columnConfig.valueFormatter(value);
        }

        // Use default rendering
        return columnConfig.isEditable ? this._createDefaultEditableCell(value, displayValue, onEdit, columnConfig) : this._createDefaultCell(displayValue, columnConfig);
    }

    /**
     * Default cell creation (can be overridden by subclasses)
     * @param {*} displayValue Formatted display value
     * @param {Object} columnConfig Column configuration
     * @returns {HTMLElement} Cell element
     * @protected
     */
    _createDefaultCell(displayValue, columnConfig) {
        const cell = document.createElement('td');
        cell.innerHTML = String(displayValue);

        // Apply custom CSS classes if provided
        if (columnConfig.cellClass) {
            cell.className = columnConfig.cellClass;
        }

        // Apply custom styles if provided
        if (columnConfig.cellStyle) {
            Object.assign(cell.style, columnConfig.cellStyle);
        }

        return cell;
    }

    /**
     * Default editable cell creation (can be overridden by subclasses)
     * @param {*} rawValue Original raw value
     * @param {*} displayValue Formatted display value
     * @param {Function} onEdit Edit callback
     * @param {Object} columnConfig Column configuration
     * @returns {HTMLElement} Cell element
     * @protected
     */
    _createDefaultEditableCell(rawValue, displayValue, onEdit, columnConfig) {
        const cell = document.createElement('td');
        cell.innerHTML = String(displayValue);
        cell.contentEditable = true;
        cell.spellcheck = false;

        // Apply custom CSS classes if provided
        if (columnConfig.cellClass) {
            cell.className = columnConfig.cellClass;
        }

        // Apply custom styles if provided
        if (columnConfig.cellStyle) {
            Object.assign(cell.style, columnConfig.cellStyle);
        }

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

            if (startValue !== newValue) {
                // Parse the new value using the plugin's parseValue method
                const parsedValue = this.parseValue(newValue);
                onEdit(parsedValue);
            }

            // Restore formatted display
            let displayValue = newValue;
            if (columnConfig.valueFormatter) {
                displayValue = columnConfig.valueFormatter({ value: newValue });
            }
            cell.innerHTML = String(displayValue);

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
     */
    showMore(key, element, engine, UI, columnConfig = {}) {
        const {x, y, width, height} = element.getBoundingClientRect();
        const typeOptions = engine.headers[key];

        UI.contextMenu.clear();

        // Default sort options (unless disabled)
        if (!columnConfig.disableSort) {
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
        if (!typeOptions.config.isUnique && typeOptions.config.isGroupable) {
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

        // Display the context menu at the specified coordinates
        return UI.contextMenu.showAt(x, y + height);
    }
}
