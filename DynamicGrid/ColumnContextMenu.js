//TODO: implement all possible operators (><, etc.) and their functionality
//TODO: check UI code for compatibility with this context menu
//TODO: check ease of use and user experience
//TODO: edit documentation to reflect changes (aka rewrite)

/**
 * ColumnHeaderContextMenu - Handles dynamic context menu creation for column headers
 * based on the plugin's available operators and functionality.
 * @param {ContextMenu} contextMenu - The context menu instance to use
 */
export class ColumnHeaderContextMenu {
    constructor(contextMenu, engine, ui) {
        this.contextMenu = contextMenu;
        this.engine = engine;
        this.ui = ui;

        // Operator display names mapping
        this.operatorLabels = {
            '==': 'Equals',
            '!=': 'Not Equals',
            '>': 'Greater Than',
            '<': 'Less Than',
            '>=': 'Greater Than or Equal',
            '<=': 'Less Than or Equal',
            '%=': 'Starts With',
            '=%': 'Ends With',
            '*=': 'Contains',
            '!*=': 'Does Not Contain',
            '><': 'Between',
        };
    }

    /**
     * Shows the context menu for a specific column header
     * @param {string} columnName - The name of the column
     * @param {HTMLElement} headerElement - The header element that was clicked
     * @param {number} x - X coordinate for menu positioning
     * @param {number} y - Y coordinate for menu positioning
     */
    showForColumn(columnName, headerElement, x, y) {
        const header = this.engine.getHeader(columnName);
        const plugin = header.plugin || this.engine.getPlugin(columnName);

        this.contextMenu.clear();

        // Add core column actions
        this._addColumnActions(columnName, header);
        this.contextMenu.separator();

        // Add plugin-defined items
        const pluginItems = plugin.getContextMenuItems(columnName, this.engine, this.ui);
        pluginItems.forEach(item => {
            this._addPluginMenuItem(item, columnName, plugin);
        });

        return this.contextMenu.showAt(x, y);
    }

    _addPluginMenuItem(item, columnName, plugin) {

        switch (item.type) {
            case 'filter':
                this._addFilterOptions(columnName, plugin, item.operators);
                break;
            case 'sort':
                this._addSortingOptions(columnName, plugin, item.sortingHint);
                break;
            case 'action':
                this.contextMenu.button(item.label, item.action, { icon: item.icon });
                break;
            case 'custom':
                // Handle custom plugin-defined components
                if (item.render) {
                    item.render(this.contextMenu);
                }
                break;
            default:
                console.warn(`Unknown menu item type: ${item.type} for column: ${columnName}`);
                break;
        }
    }

    /**
     * Adds column-specific actions like hide/show, resize, etc.
     */
    _addColumnActions(columnName, header) {
        // Hide/Show column
        this.contextMenu.button('Toggle Column', () => {
            const columnIndex = this.engine.getColumns().indexOf(columnName);
            this.ui.toggleColumn(columnIndex);
        },{ });

        // Auto-fit column width
        if (header.config.resizable) {
            this.contextMenu.button('Auto-fit Width', () => {
                const columnIndex = this.engine.getColumns().indexOf(columnName);
                const approximateWidth = this.ui.approximateColumnWidth(columnName);
                this.ui.setWidth(columnIndex, approximateWidth);
            }, { });
        }
    }

    /**
     * Adds filter options based on the plugin's available operators
     */
    _addFilterOptions(columnName, plugin, operators) {
        var operator = '=='; // Default operator
        this.contextMenu.submenu('Filter', (filterSubmenu) => {
            filterSubmenu.dropdown('filter', operators.map((operator) => {
                return {
                    label: this.operatorLabels[operator] || operator,
                    value: operator,
                };
            }), {
                value: operator,
                onChange: (selectedOperator) => {
                    operator = selectedOperator;
                },
                id: 'dropdown-id',
            })
            .input('Filter', {
                placeholder: 'Filter',
                onChange: (value) => {
                    this.engine.setSelect(columnName, operator, value);
                    this.ui.render(this.engine.runCurrentQuery());
                },
                showWhen: {
                    elementId: 'dropdown-id',
                    value: ['==', '!=', '>', '<', '>=', '<=', '%=', '=%', '*=', '!*='],
                }
            })
            .doubleInput('From', 'To', {
                placeholder: 'From',
                placeholder_2: 'To',
                onChange: ({left, right}) => {
                    if (left === '' || right === '' || left === null || right === null || left === undefined || right === undefined) {
                        this.engine.removeSelect(columnName) ? this.ui.render(this.engine.runCurrentQuery()) : null;
                    }
                    else {
                        this.engine.setSelect(columnName, '>=', left);
                        this.engine.addSelect(columnName, '<=', right);
                        this.ui.render(this.engine.runCurrentQuery());
                    }
                },
                showWhen: {
                    elementId: 'dropdown-id',
                    value: ['><'],
                }
            })

            .separator()
            .button('Clear Filter', () => this.engine.removeSelect(columnName) ? this.ui.render(this.engine.runCurrentQuery()) : null, { });
        })
    }

    /**
     * Adds sorting options based on the plugin's sorting hint
     */
    _addSortingOptions(columnName, plugin, sortingHint) {
        this.contextMenu.separator()
                        .button('Sort Ascending', () => this._sortColumn(columnName, 'asc', sortingHint), { })
                        .button('Sort Descending', () => this._sortColumn(columnName, 'desc', sortingHint), { })
                        .separator()
                        .button('Clear Sort', () => this._clearSort(), { });
    }

    /**
     * Applies a filter to the specified column
     */
    _applyFilter(columnName, operator, value) {
        this.engine.setSelect(columnName, operator, value);
        this.ui.render(this.engine.runCurrentQuery());
    }

    /**
     * Clears filter for the specified column
     */
    _clearColumnFilter(columnName) {
        this.engine.removeSelect(columnName);
        this.ui.render(this.engine.runCurrentQuery());
    }

    /**
     * Sorts the specified column
     */
    _sortColumn(columnName, direction) {
        this.engine.setSort(columnName, direction);
        this.ui.render(this.engine.runCurrentQuery());
    }

    /**
     * Clears all sorting
     */
    _clearSort() {
        this.engine.removeSort();
        this.ui.render(this.engine.runCurrentQuery());
    }

    /**
     * Toggles visibility of columns based on selection
     */
    _toggleColumnsVisibility(selectedColumns) {
        const allColumns = this.engine.getColumns();

        allColumns.forEach((column, index) => {
            if (selectedColumns.includes(column)) {
                this.ui._showColumn(index);
            } else {
                this.ui._hideColumn(index);
            }
        });
    }

    /**
     * Checks if a column is currently visible
     */
    _isColumnVisible(columnName) {
        const columnIndex = this.engine.getColumns().indexOf(columnName);
        const colElement = this.ui.colGroup1?.children[columnIndex + 1];
        return colElement ? colElement.style.visibility !== 'collapse' : true;
    }

    /**
     * Creates a default input element
     */
    _createDefaultInput(value) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = value || '';
        return input;
    }

    /**
     * Gets the value from an input element
     */
    _getInputValue(input) {
        if (input.type === 'checkbox') {
            return input.checked;
        }
        return input.value;
    }
}