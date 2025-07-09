/**
 * DynamicGrid is a library for rendering data in a grid format with dynamic querying capabilities.
 * @author Matt ter Steege (Kronk)
 * @license MIT
 * @version 1.4.3
 */
// DynamicGrid\libs\EventEmitter.js
/**
 * A simple event emitter class.
 * @class
 * @example
 * const emitter = new EventEmitter();
 * emitter.sub('event', data => console.log(data));
 * emitter.emit('event', 'Hello, world!');
 * // Output: Hello, world!
 * @author Matt ter Steege (Kronk)
 */
class EventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribe to an event.
     * @param {string} event - The name of the event to subscribe to. (case-insensitive)
     * @param {Function} listener - The callback function to execute when the event is emitted.
     */
    subscribe(event, listener) {
        if (!this.events[event.toLocaleLowerCase()]) {
            this.events[event.toLocaleLowerCase()] = [];
        }
        this.events[event.toLocaleLowerCase()].push(listener);
        return () => this.unsubscribe(event, listener);
    }

    /**
     * Subscribe to an event. (alias for subscribe)
     * @param {string} event - The name of the event to subscribe to. (case-insensitive)
     * @param {Function} listener - The callback function to execute when the event is emitted.
     */
    on = this.subscribe; // Alias for subscribe

    /**
     * Unsubscribe from an event.
     * @param {string} event - The name of the event to unsubscribe from. (case-insensitive)
     * @param {Function} listenerToRemove - The callback function to remove from the event.
     */
    unsubscribe(event, listenerToRemove) {
        if (!this.events[event.toLocaleLowerCase()]) return;

        this.events[event.toLocaleLowerCase()] = this.events[event.toLocaleLowerCase()].filter(listener => listener !== listenerToRemove);
    }

    /**
     * Unsubscribe from an event. (alias for unsubscribe)
     * @param {string} event - The name of the event to unsubscribe from. (case-insensitive)
     * @param {Function} listenerToRemove - The callback function to remove from the event.
     */
    off = this.unsubscribe; // Alias for unsubscribe

    /**
     * Emit an event.
     * @param {string} event - The name of the event to emit. (case-insensitive)
     * @param {*} data - The data to pass to the event listeners.
     */
    emit(event, data) {
        if (!this.events[event.toLocaleLowerCase()]) return;

        // console.info(`Event emitted: ${event}`, data);

        this.events[event.toLocaleLowerCase()].forEach(listener => listener(data));
    }

    /**
     * Remove all listeners
     */
    removeAllListeners() {
        this.events = {};
    }
}

// DynamicGrid\libs\KeyboardShortcuts.js
/**
 * Initializes the KeyboardShortcuts instance and binds the event listener.
 * @example
 * const shortcuts = new KeyboardShortcuts();
 * shortcuts.addShortcut('ctrl+s', event => console.log('Save'));
 * shortcuts.addShortcut('ctrl+z', event => console.log('Undo'));
 * shortcuts.addShortcut('ctrl+y', event => console.log('Redo'));
 *
 * shortcuts.listShortcuts(); // ['ctrl+s', 'ctrl+z', 'ctrl+y']
 *
 * shortcuts.removeShortcut('ctrl+z');
 * shortcuts.clearShortcuts();
 *
 * shortcuts.destroy();
 * @author Matt ter Steege (Kronk)
 */
class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.listener = this.#_handleKeyPress.bind(this);
        document.addEventListener('keydown', this.listener);
    }

    /**
     * Normalizes a key string by converting it to lowercase and removing whitespace.
     * @param {string} key - The key string to normalize.
     * @returns {string} The normalized key string.
     */
    #_normalizeKey(key) {
        return key.toLowerCase().replace(/\s+/g, '');
    }

    /**
     * Handles the keydown event and executes the corresponding shortcut callback if available.
     * This also prevents the default browser behavior for the shortcut key combination.
     * @param {KeyboardEvent} event - The keydown event.
     */
    #_handleKeyPress(event) {
        const pressedKey = this.#_normalizeKey(
            `${event.ctrlKey ? 'ctrl+' : ''}${event.shiftKey ? 'shift+' : ''}${event.altKey ? 'alt+' : ''}${event.metaKey ? 'meta+' : ''}${event.key}`
        );
        const callback = this.shortcuts.get(pressedKey);
        if (callback) {
            event.preventDefault();
            callback(event);
        }
    }

    /**
     * Adds a new keyboard shortcut.
     * @param {string} keys - The key combination for the shortcut (e.g., "ctrl+s").
     * @param {string} description - A description of the shortcut (optional, for documentation purposes).
     * @param {Function} callback - The function to execute when the shortcut is triggered.
     */
    addShortcut(keys, description, callback) {
        const normalizedKeys = this.#_normalizeKey(keys);
        if (this.shortcuts.has(normalizedKeys)) {
            console.warn(`Shortcut '${keys}' is already assigned.`);
        } else {
            this.shortcuts.set(normalizedKeys, callback);
        }
    }

    /**
     * Removes an existing keyboard shortcut.
     * @param {string} keys - The key combination of the shortcut to remove.
     */
    removeShortcut(keys) {
        const normalizedKeys = this.#_normalizeKey(keys);
        if (this.shortcuts.has(normalizedKeys)) {
            this.shortcuts.delete(normalizedKeys);
        } else {
            console.warn(`Shortcut '${keys}' does not exist.`);
        }
    }

    /**
     * Lists all registered keyboard shortcuts.
     * @returns {string[]} An array of registered key combinations.
     */
    listShortcuts() {
        return Array.from(this.shortcuts.keys());
    }

    /**
     * Clears all registered keyboard shortcuts.
     */
    clearShortcuts() {
        this.shortcuts.clear();
    }

    /**
     * Destroys the KeyboardShortcuts instance by removing the event listener and clearing shortcuts.
     */
    destroy() {
        document.removeEventListener('keydown', this.listener);
        this.clearShortcuts();
    }
}

// DynamicGrid\exportConnectors\ExportConnector.js
class ExportConnector {
    constructor() {
        this.name = 'ExportConnector';
        this.mimeType = 'application/octet-stream';
        this.extension = 'bin';
    }


    /**
     * The entrance point which is overwritten by the child, turns the data object into an downloadable blob for the client (must be overridden)
     * @param data {Array<Object>} data - The data to export.
     * @param headers {Object<Object>} headers - The headers to export.
     * @param name {String} name - The name of the file to be downloaded.
     * @example
     * //If you want to know the format of the data object,
     * //go to the console when an datagrid is instantiated and type
     * DynamicGrid.engine.data
     * DynamicGrid.engine.headers
     * @return {any} a single blob that complies with the defined filetype
     */
    export(data, headers, name) {
        throw new Error('Export or ExportAsync method not implemented');
    }

    /**
     * Exports the data in the specified format and triggers a download.
     * @param data {Array<Object>} data - The data to export.
     * @param headers {Object<Object>} headers - The headers to export.
     * @param name {String} name - The name of the file to be downloaded.
     * @returns {Promise<any>} - A promise that resolves when the export is complete.
     */
    exportAsync(data, headers, name) {
        throw new Error('ExportAsync or Export method not implemented');
    }

    _isMethodOverridden(methodName) {
        // Walk up the prototype chain to find where the method is defined
        let currentProto = Object.getPrototypeOf(this);

        while (currentProto && currentProto !== ExportConnector.prototype) {
            if (currentProto.hasOwnProperty(methodName)) {
                return true; // Found in a subclass
            }
            currentProto = Object.getPrototypeOf(currentProto);
        }

        return false; // Only found in base class
    }

    // Universal export with smart routing
    async smartExport(data, headers, name) {
        const hasExport = this._isMethodOverridden('export');
        const hasExportAsync = this._isMethodOverridden('exportAsync');

        if (hasExport && hasExportAsync) {
            // Both implemented - prefer sync for better performance
            return this.export(data, headers, name);
        } else if (hasExport) {
            return this.export(data, headers, name);
        } else if (hasExportAsync) {
            return await this.exportAsync(data, headers, name);
        } else {
            throw new Error('No export method implemented in subclass');
        }
    }
}

// DynamicGrid\DynamicGridUtils.js
//throw new GridError('Invalid grid data'); <-- (sends error to console without stack trace)
class GridError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GridError';
        this.stack = '';
    }
}

function FastHash(object) {
    const string = JSON.stringify(object);

    let hash = 0;
    for (let i = 0; i < string.length; i++) {
        hash = ((hash << 5) - hash) + string.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

/**
* Code to find the closest matching key in a list of keys (with some config options)
* @param {Array<string>} dataIndexesKeys
* @param {string} field
* @param {Object} config
* @returns {string}
*/
function findMatchingIndexKey(dataIndexesKeys, field, config) {

    const normalize = str => {
        let result = str;
        if (config.SymbolsToIgnore?.length) {
            const regex = new RegExp(`[${config.SymbolsToIgnore.join('').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g');
            result = result.replace(regex, '');
        }
        return config.useStrictCase ? result : result.toLowerCase();
    };

    const normalizedField = normalize(field);
    return dataIndexesKeys.find(key => normalize(key) === normalizedField);
}

/**
 * Gets the first item from a structure that may include numeric or named keys.
 * @param {Object|Array} data The structure to get the first item from.
 * @returns {any|boolean} The first item or false if the input is invalid.
 */
function firstItem(data) {
    if (!data || typeof data !== 'object') return false;

    if (Array.isArray(data)) {
        // Handle standard arrays
        return data[0];
    }

    // Handle objects with numeric and named keys
    const keys = Object.keys(data);

    return data[keys[0]];
}

/**
 * removes a entry from an array
 * @param {Array<string>} entry
 * @returns {Array<string>}
 */
Array.prototype.remove = function (entry) {
    const index = this.indexOf(entry);
    if (index > -1) {
        this.splice(index, 1);
    }
    return this;

}

/**
 * Waits for the state to become true, checking every second.
 * @returns {Promise<boolean>} A promise that resolves when the state is true.
 * @author jabaa
 * @see https://stackoverflow.com/a/69424610/18411025
 */
async function waitState() {
    return new Promise(resolve => {
        let timerId = setInterval(checkState, 1000);

        function checkState() {
            if (o.state == true) {
                clearInterval(timerId);
                resolve(o.state);
            }
        }
    });
}

Number.prototype.padLeft = function (n, str) {
    let s = String(this);
    while (s.length < n) {
        s = str + s;
    }
    return s;
}

// DynamicGrid\ColumnContextMenu.js
//TODO: implement all possible operators (><, etc.) and their functionality
//TODO: check UI code for compatibility with this context menu
//TODO: check ease of use and user experience
//TODO: edit documentation to reflect changes (aka rewrite)

/**
 * ColumnHeaderContextMenu - Handles dynamic context menu creation for column headers
 * based on the plugin's available operators and functionality.
 * @param {ContextMenu} contextMenu - The context menu instance to use
 */
class ColumnHeaderContextMenu {
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

// DynamicGrid\libs\ContextMenu.js
/**
 * A modern, flexible context menu library for web applications.
 * Provides a fluent API for creating context menus with various item types.
 * Supports animations, custom styles, and nested submenus.
 * @author Matt ter Steege (Kronk)
*/
class ContextMenu {
    static ITEM_TYPES = {
        BUTTON: 'button',
        SEPARATOR: 'separator',
        SUBMENU: 'submenu',
        INPUT: 'input',
        DOUBLE_INPUT: 'double-input',
        DROPDOWN: 'dropdown',
        CHECKBOX: 'checkbox',
        RADIO: 'radio',
        SEARCH_SELECT: 'search-select',
    };

    static CLASSNAMES = {
        BUTTON: 'context-menu-button',
        SUBMENU: 'context-menu-submenu',
        SEPARATOR: 'context-menu-separator',
        MENU: 'context-menu',
        INPUT: 'context-menu-input',
        DOUBLE_INPUT: 'context-menu-double-input',
        DROPDOWN: 'context-menu-dropdown',
        CHECKBOX: 'context-menu-checkbox',
        RADIO: 'context-menu-radio',
        CONTAINER: 'context-menu-container',
        SEARCH_SELECT: 'context-menu-search-select',
        ICON: 'context-menu-icon',
        LABEL: 'context-menu-label'
    };

    constructor(options = {}) {
        // Initialize with a more intuitive options object
        this.options = {
            width: options.width || 200,
            animation: {
                enabled: options.animation?.enabled ?? true,
                duration: options.animation?.duration || 200,
                timing: options.animation?.timing || 'ease-out'
            },
            position: {
                xOffset: options.position?.xOffset || 0,
                yOffset: options.position?.yOffset || 0
            },
            icons: options.icons || {
                submenu: '❯'
            },
            style: {
                backgroundColor: options.style?.backgroundColor || '#ffffff',
                textColor: options.style?.textColor || '#333333',
                backgroundHoverColor: options.style?.backgroundHoverColor || '#f0f0f0',
                border: options.style?.border || 'rgba(0, 0, 0, 0.08)',
                shadow: options.style?.shadow || '0 10px 25px rgba(0, 0, 0, 0.1)',
                accent: options.style?.accent || '#3b82f6',
                separator: options.style?.separator || 'rgba(0, 0, 0, 0.08)',

                padding: options.style?.padding || '10px',
                paddingHorizontal: options.style?.paddingHorizontal || '15px',
                gap: options.style?.gap || '10px',
                borderRadius: options.style?.borderRadius || '8px',
                borderRadiusInput: options.style?.borderRadiusInput || '4px',
                fontSize: options.style?.fontSize || '14px',
                transition: options.style?.transition || '0.2s',
                transitionFast: options.style?.transitionFast || '0.1s',
                transitionInput: options.style?.transitionInput || '0.2s',
            },
            indentLevel: options.indentLevel || 0,
            isRoot: options.isRoot === undefined,
            closeOnClick: options.closeOnClick,
            closeOnOutsideClick: options.closeOnOutsideClick,
        };
        this.items = [];
        this.id = this.#_generateId();
        this.installStyles();
    }

    // Simplified API for adding menu items
    addItem(type, config) {
        const item = {
            id: (config?.id ?? this.#_generateId()) + '',
            type,
            position: this.items.length,
            ...config
        };

        if (item.id === undefined) {
            item.id = this.#_generateId();
        }

        if (item.type === ContextMenu.ITEM_TYPES.SUBMENU) {
            item.submenu.options.indentLevel = (this.options.indentLevel || 0) + 1;
        }

        // Validate based on type
        this.#_validateItem(item);
        this.items.push(item);
        return this;
    }

    // Fluent API methods for different item types
    button(text, action, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.BUTTON, {
            text,
            action,
            icon: config.icon,
            ficon: config.ficon,
            disabled: config.disabled,
            marked: config.marked,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    input(label, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.INPUT, {
            label,
            placeholder: config.placeholder,
            value: config.value,
            onChange: config.onChange,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    doubleInput(label, label_2, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.DOUBLE_INPUT, {
            label,
            label_2: label_2,
            placeholder: config.placeholder,
            placeholder_2: config.placeholder_2,
            value: config.value,
            value_2: config.value_2,
            onChange: config.onChange,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    dropdown(label, options, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.DROPDOWN, {
            label,
            options,
            value: config.value,
            onChange: config.onChange,
            multiSelect: config.multiSelect,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    checkbox(text, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.CHECKBOX, {
            text,
            checked: config.checked || false,
            onChange: config.onChange,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    radioGroup(name, options, config = {}) {
        options.forEach(option => {
            this.addItem(ContextMenu.ITEM_TYPES.RADIO, {
                label: option.label,
                value: option.value,
                name,
                checked: option.checked,
                onChange: config.onChange,
                showWhen: config.showWhen,
                id: config.id,
            });
        });
        return this;
    }

    separator() {
        return this.addItem(ContextMenu.ITEM_TYPES.SEPARATOR, {});
    }

    submenu(text, submenuBuilder, config = {}) {
        const options = {
            ...this.options, // Inherit options from parent
            isRoot: false,
            indentLevel: (this.options.indentLevel || 0) + 1, // Increment indent level
            showWhen: config.showWhen,
            id: config.id,
        };

        const submenu = new ContextMenu(options); // Create submenu with updated options
        submenuBuilder(submenu);

        const items = this.addItem(ContextMenu.ITEM_TYPES.SUBMENU, {
            text,
            submenu,
            icon: config.icon,
            ficon: config.ficon,
            showWhen: config.showWhen,
            id: config.id,
        }).items;

        items[items.length - 1].id = submenu.id;
        return this;
    }

    searchSelect(label, options, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.SEARCH_SELECT, {
            label,
            options,
            value: config.value,
            onChange: config.onChange,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    // Show methods
    showAt(x, y, autoAdd = true) {
        const menu = this.#_render();

        if (document.getElementById(this.id)) {
            document.getElementById(this.id).remove();
        }

        autoAdd ? document.body.appendChild(menu) : null;
        this.#_setupEventHandlers(menu);
        this.#_positionMenu(menu, {x, y, position: 'fixed'});
        this.#_animateIn(menu);

        return menu;
    }

    destroy() {
        // Existing cleanup
        const menu = document.querySelector('body > .' + ContextMenu.CLASSNAMES.MENU);
        menu && menu.remove();

        // Remove event listeners
        const {handleClick, handleContextMenu, handleMouseOver} = this._eventHandlers || {};
        handleClick ? document.removeEventListener("click", handleClick) : null;
        handleContextMenu ? document.removeEventListener("contextmenu", handleContextMenu) : null;
        handleMouseOver ? document.removeEventListener("mouseover", handleMouseOver) : null;

        this?.clear();
    }

    clear() {
        // Clear all items
        this.items = [];
        const menu = document.getElementById(this.id);
        if (menu) {
            menu.innerHTML = '';
        }
    }

//    /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
//    |                                                  PRIVATE METHODS                                                  |
//    \___________________________________________________________________________________________________________________/

    #_setupEventHandlers(menu) {
        const handleClick = (e) => {
            if (e.target.classList.contains(ContextMenu.CLASSNAMES.DROPDOWN) ||
                e.target.classList.contains(ContextMenu.CLASSNAMES.INPUT) ||
                e.target.classList.contains(ContextMenu.CLASSNAMES.CHECKBOX) ||
                e.target.classList.contains(ContextMenu.CLASSNAMES.RADIO) ||
                e.target.classList.contains(ContextMenu.CLASSNAMES.SEARCH_SELECT)) {
                return;
            }

            if (e.target.classList.contains(ContextMenu.CLASSNAMES.BUTTON)) {
                const button = this.items.find(item => item.id === e.target.id);
                if (button) {
                    button.action();
                    this.destroy();
                }
            }

            if (!e.target.closest('.' + ContextMenu.CLASSNAMES.MENU)) {
                if (!this.options.closeOnOutsideClick) return;
                this.destroy();
            }
        };

        const handleMouseOver = (e) => {
            if (e.target.classList.contains(ContextMenu.CLASSNAMES.SUBMENU)) {
                const submenu = this.items.find(item => item.id === e.target.dataset.submenuId);

                if (submenu) {
                    const existingSubmenu = e.target.parentElement.querySelector('#' + submenu.submenu.id);
                    if (existingSubmenu) return;

                    const htmlElement = submenu.submenu.#_render();
                    submenu.submenu.#_setupEventHandlers(htmlElement);
                    submenu.submenu.#_positionMenu(htmlElement, {
                        x: e.target.getBoundingClientRect().right,
                        y: e.target.getBoundingClientRect().top
                    });

                    htmlElement.style.position = 'absolute';
                    htmlElement.style.left = this.options.width + 'px';
                    htmlElement.style.top = e.target.getBoundingClientRect().top - e.target.parentElement.getBoundingClientRect().top + 'px';

                    e.target.parentElement.appendChild(htmlElement);

                    htmlElement.addEventListener('mouseleave', handleMouseLeave);
                    e.target.addEventListener('mouseleave', handleMouseLeave);
                }
            }
        };

        const handleMouseLeave = (event) => {
            const target = event.target;

            if (target.className === ContextMenu.CLASSNAMES.MENU) {
                target.remove();
                return;
            }

            const submenu = document.getElementById(target.dataset?.submenuId);
            const isMouseOverButton = target.matches(':hover');
            const isMouseOverSubmenu = submenu?.matches(':hover');

            if (!isMouseOverButton && !isMouseOverSubmenu) {
                submenu?.remove();
            }
        };


        menu.addEventListener('click', handleClick);
        menu.addEventListener('mouseover', handleMouseOver);
        addEventListener('click', (e) => {
            //if the element is not inside the menu, then destroy the menu
            if (e.target.closest('.' + ContextMenu.CLASSNAMES.MENU)) return;

            if (this.options.closeOnOutsideClick) {
                this.destroy();
            }
        })
    }

    //sorry for the bad looking code :(
    #_validateItem(item) {
        const validTypes = Object.values(ContextMenu.ITEM_TYPES);

        if (!item.type || !validTypes.includes(item.type)) throw new Error(`Invalid item type: ${item.type}. Allowed types are: ${validTypes.join(', ')}`);

        switch (item.type) {
            case ContextMenu.ITEM_TYPES.BUTTON:
                if (!item.text || typeof item.text !== 'string') throw new Error('Button item must have a "text" property of type string.');
                if (item.action && typeof item.action !== 'function') throw new Error('Button item action must be a function.');
                break;
            case ContextMenu.ITEM_TYPES.SEPARATOR:
                break;
            case ContextMenu.ITEM_TYPES.SUBMENU:
                if (!item.submenu || !(item.submenu instanceof ContextMenu)) throw new Error('Submenu item must have a "submenu" property that is an instance of ContextMenu.');
                break;
            case ContextMenu.ITEM_TYPES.INPUT:
                if (!item.label || typeof item.label !== 'string') throw new Error('Input item must have a "label" property of type string.');
                break;
            case ContextMenu.ITEM_TYPES.DOUBLE_INPUT:
                if (!item.label || typeof item.label !== 'string') throw new Error('DoubleInput item must have a "label" property of type string.');
                if (!item.label_2 || typeof item.label_2 !== 'string') throw new Error('DoubleInput item must have a "label_2" property of type string.');
                break;
            case ContextMenu.ITEM_TYPES.DROPDOWN:
                if (!item.label || typeof item.label !== 'string') throw new Error('Dropdown item must have a "label" property of type string.');
                if (!Array.isArray(item.options) || item.options.length === 0) throw new Error('Dropdown item must have a non-empty "options" array.');
                break;
            case ContextMenu.ITEM_TYPES.CHECKBOX:
                if (!item.text || typeof item.text !== 'string') throw new Error('Checkbox item must have a "text" property of type string.');
                if (typeof item.checked !== 'boolean') throw new Error('Checkbox item must have a "checked" property of type boolean.');
                break;
            case ContextMenu.ITEM_TYPES.RADIO:
                if (!item.label || typeof item.label !== 'string') throw new Error('Radio item must have a "label" property of type string.');
                if (!item.name || typeof item.name !== 'string') throw new Error('Radio item must have a "name" property of type string.');
                break;
            case ContextMenu.ITEM_TYPES.SEARCH_SELECT:
                if (!item.label || typeof item.label !== 'string') throw new Error('SearchSelect item must have a "label" property of type string.');
                if (!Array.isArray(item.options) || item.options.length === 0) throw new Error('SearchSelect item must have a non-empty "options" array.');
                break;
            default:
                throw new Error(`Unhandled item type: ${item.type}`);
        }
    }

    #_generateId() {
        return '_' + Math.random().toString(36).substring(2, 9);
    }

    #_render() {
        const menuContainer = document.createElement('div');
        menuContainer.classList.add(ContextMenu.CLASSNAMES.MENU);
        menuContainer.id = this.id;
        menuContainer.setAttribute('role', 'menu');
        menuContainer.setAttribute('aria-orientation', 'vertical');
        menuContainer.style.width = `${this.options.width}px`;

        // Set the indentation level as a data attribute
        menuContainer.dataset.indent = this.options.indentLevel;

        this.items.forEach((item, index) => {
            let element;

            switch (item.type) {
                case ContextMenu.ITEM_TYPES.BUTTON:
                    element = this.#_createButton(item);
                    break;
                case ContextMenu.ITEM_TYPES.SEPARATOR:
                    index < this.items.length - 1 ?         // Only create a separator if it's not the last item
                        element = this.#_createSeparator()
                        : null;
                    break;
                case ContextMenu.ITEM_TYPES.SUBMENU:
                    element = this.#_createSubmenu(item);
                    break;
                case ContextMenu.ITEM_TYPES.INPUT:
                    element = this.#_createInput(item);
                    break;
                case ContextMenu.ITEM_TYPES.DOUBLE_INPUT:
                    element = this.#_createDoubleInput(item);
                    break;
                case ContextMenu.ITEM_TYPES.DROPDOWN:
                    element = this.#_createDropdown(item);
                    break;
                case ContextMenu.ITEM_TYPES.CHECKBOX:
                    element = this.#_createCheckbox(item);
                    break;
                case ContextMenu.ITEM_TYPES.RADIO:
                    element = this.#_createRadio(item);
                    break;
                case ContextMenu.ITEM_TYPES.SEARCH_SELECT:
                    element = this.#_createSearchSelect(item);
                    break;
                default:
                    console.warn(`Unknown item type: ${item.type}`);
            }

            if (element) {
                menuContainer.appendChild(element);
            }

            setTimeout(() => {
                // Check if the item has a `showWhen` condition
                if (item.showWhen) {
                    const {elementId, value} = item.showWhen;
                    const controllingElement = document.querySelector('#' + elementId);

                    if (controllingElement) {
                        const toggleVisibility = () => {
                            const shouldShow = value.includes(controllingElement.value);
                            element.style.display = shouldShow ? '' : 'none';
                        };

                        // Add event listener to monitor changes
                        controllingElement.addEventListener('input', toggleVisibility);
                        controllingElement.addEventListener('change', toggleVisibility);

                        // Initial check
                        toggleVisibility();
                    }
                }
            }, 0);
        });


        return menuContainer;
    }

    #_createButton(item) {
        const button = document.createElement('button');
        button.classList.add(ContextMenu.CLASSNAMES.BUTTON);
        button.id = item.id;
        button.innerText = item.text;
        button.disabled = item.disabled || false;
        button.dataset.marked = item.marked || false;
        //button.onclick = item.action;

        if (item.icon) {
            const icon = document.createElement('span');
            icon.innerText = item.icon;
            button.prepend(icon);
        }

        if (item.ficon) {
            const ficon = document.createElement('i');
            ficon.className = item.ficon;
            button.append(ficon);
        }

        return button;
    }

    #_createSeparator() {
        const separator = document.createElement('div');
        separator.classList.add(ContextMenu.CLASSNAMES.SEPARATOR);
        return separator;
    }

    #_createSubmenu(item) {
        const submenuButton = document.createElement('button');
        submenuButton.classList.add(ContextMenu.CLASSNAMES.SUBMENU);
        submenuButton.innerText = item.text;
        submenuButton.setAttribute('aria-haspopup', 'true');
        submenuButton.dataset.submenuId = item.id;

        if (item.icon) {
            const icon = document.createElement('span');
            icon.innerText = item.icon;
            submenuButton.prepend(icon);
        }

        const moreIcon = document.createElement('span');
        moreIcon.innerText = this.options.icons.submenu;
        moreIcon.style.marginLeft = 'auto';
        submenuButton.append(moreIcon);

        if (item.ficon) {
            const ficon = document.createElement('i');
            ficon.className = item.ficon;
            submenuButton.append(ficon);
        }

        return submenuButton;
    }

    #_createInput(item) {
        const inputContainer = document.createElement('div');
        inputContainer.classList.add(ContextMenu.CLASSNAMES.INPUT);

        const input = document.createElement('input');
        input.type = item.type || 'text';
        input.placeholder = item.placeholder || '';
        input.value = item.value || '';
        input.oninput = (e) => item.onChange?.(e.target.value);
        input.id = item.id;

        inputContainer.appendChild(input);
        return inputContainer;
    }

    #_createDoubleInput(item) {
        //do a div and add 2 inputs to it
        const inputContainer = document.createElement('div');
        inputContainer.classList.add(ContextMenu.CLASSNAMES.DOUBLE_INPUT);
        inputContainer.id = item.id;

        var values = {left: item.value || '', right: item.value_2 || ''};

        const generalChangeHandler = () => {
            if ((values.left === '' && values.left === null || values.left === undefined) && (values.right === '' && values.right === null || values.right === undefined)) {
                item.onChange?.({left: undefined, right: undefined});
            } else {
                item.onChange?.(values);
            }
        }

        const input1 = this.#_createInput({
            type: 'text',
            placeholder: item.placeholder || '',
            value: item.value || '',

            onChange: (value) => {
                values.left = value;
                generalChangeHandler();
            }, id: item.id + '-1'
        });

        const input2 = this.#_createInput({
            type: 'text', placeholder: item.placeholder_2 || '', value: item.value_2 || '',

            onChange: (value) => {
                values.right = value;
                generalChangeHandler();
            }, id: item.id + '-2'
        });

        inputContainer.appendChild(input1);
        inputContainer.appendChild(input2);
        return inputContainer;
    }

    #_createDropdown(item) {
        const select = document.createElement('select');
        select.classList.add(ContextMenu.CLASSNAMES.DROPDOWN);
        select.id = item.id;

        item.options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            if (option.value === item.value) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });

        select.onchange = (e) => item.onChange?.(e.target.value);
        return select;
    }

    #_createCheckbox(item) {
        const label = document.createElement('label');
        label.classList.add(ContextMenu.CLASSNAMES.CHECKBOX);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.checked || false;
        checkbox.onchange = (e) => item.onChange?.(e.target.checked);
        checkbox.id = item.id;

        const span = document.createElement('span');
        span.textContent = item.text;

        label.appendChild(checkbox);
        label.appendChild(span);
        return label;
    }

    #_createRadio(item) {
        const label = document.createElement('label');
        label.classList.add(ContextMenu.CLASSNAMES.RADIO);

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = item.name;
        radio.value = item.value;
        radio.checked = item.checked || false;
        radio.onchange = (e) => item.onChange?.(e.target.value);
        radio.id = item.id;

        const span = document.createElement('span');
        span.textContent = item.label;

        label.appendChild(radio);
        label.appendChild(span);
        return label;
    }

    #_createSearchSelect(item) {
        //this is a scrollable list with selectable items (checkboxes)
        //at the top there is a search input that filters the items (if the search input is not empty, then show everything)
        const container = document.createElement('div');
        container.classList.add(ContextMenu.CLASSNAMES.SEARCH_SELECT);
        container.id = item.id;

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = item.label || '';

        const list = document.createElement('div');
        list.classList.add(ContextMenu.CLASSNAMES.SEARCH_SELECT + '-list');

        //add select all option
        // const selectAll = document.createElement('label');
        // selectAll.classList.add(ContextMenu.CLASSNAMES.SEARCH_SELECT + '-select-all');
        // const selectAllCheckbox = document.createElement('input');
        // selectAllCheckbox.type = 'checkbox';
        // selectAllCheckbox.onchange = (e) => {
        //     const checkboxes = list.querySelectorAll('input[type="checkbox"]');
        //     checkboxes.forEach(checkbox => {
        //         checkbox.checked = e.target.checked;
        //     });
        //
        //     //return an array of selected values
        //     const selectedValues = Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value).slice(1);
        //
        //     item.onChange?.(selectedValues);
        //     container.value = selectedValues;
        // }
        // const selectAllLabel = document.createElement('span');
        // selectAllLabel.textContent = 'Select All';
        // selectAll.appendChild(selectAllCheckbox);
        // selectAll.appendChild(selectAllLabel);
        // list.appendChild(selectAll);

        const toggleAll = document.createElement('button');
        toggleAll.textContent = 'Toggle All';
        toggleAll.onclick = (e) => {
            const checkboxes = list.querySelectorAll('input[type="checkbox"]');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(checkbox => {
                checkbox.checked = !allChecked;
            });

            //return an array of selected values
            const selectedValues = Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

            item.onChange?.(selectedValues);
            container.value = selectedValues;
        }
        list.appendChild(toggleAll);

        item.options.forEach(option => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = option.value;
            checkbox.checked = option.checked || false;
            checkbox.onchange = (e) => {
                //return an array of selected values
                const selectedValues = Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
                item.onChange?.(selectedValues);
                container.value = selectedValues;
            }

            const label = document.createElement('label');
            label.textContent = option.label;
            label.appendChild(checkbox);
            list.appendChild(label);
        });
        container.appendChild(input);
        container.appendChild(list);

        input.oninput = (e) => {
            const searchValue = e.target.value.toLowerCase();
            const items = list.querySelectorAll('label');
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(searchValue) ? 'block' : 'none';
            });
        };
        return container;
    }

    #_positionMenu(menu, position) {
        const {x, y} = position;
        const {xOffset, yOffset} = this.options.position;

        // Apply styles to position the menu
        menu.style.left = `${x + xOffset || this.options.width}px`;
        menu.style.top = `${y + yOffset}px`;
        menu.style.position = 'fixed';
    }


    #_animateIn(menu) {
        if (!this.options.animation.enabled) return;

        // Apply initial styles for animation
        menu.style.opacity = 0;
        menu.style.transform = 'scale(0.9)';
        menu.style.transition = `opacity ${this.options.animation.duration}ms ${this.options.animation.timing},transform ${this.options.animation.duration}ms ${this.options.animation.timing}`;

        // Trigger the animation
        requestAnimationFrame(() => {
            menu.style.opacity = 1;
            menu.style.transform = 'scale(1)';
        });
    }

    installStyles() {
        if (document.getElementById('context-menu-styles')) return;

        const styleElement = document.createElement('style');
        styleElement.id = 'context-menu-styles';
        styleElement.textContent = `:root {--context-menu-bg:` + (this.options.style.backgroundColor || '#ffffff') + `;--context-menu-text:` + (this.options.style.textColor || '#333333') + `;--context-menu-hover-bg:` + (this.options.style.backgroundHoverColor || '#f0f0f0') + `;--context-menu-border:` + (this.options.style.border || 'rgba(0, 0, 0, 0.08)') + `;--context-menu-shadow:` + (this.options.style.shadow || '0 10px 25px rgba(0, 0, 0, 0.1)') + `;--context-menu-accent:` + (this.options.style.accent || '#3b82f6') + `;--context-menu-separator:` + (this.options.style.separator || 'rgba(0, 0, 0, 0.08)') + `;--padding:` + (this.options.style.padding || '10px') + `;--padding-horizontal:` + (this.options.style.paddingHorizontal || '15px') + `;--gap:` + (this.options.style.gap || '10px') + `;--border-radius:` + (this.options.style.borderRadius || '8px') + `;--border-radius-input:` + (this.options.style.borderRadiusInput || '4px') + `;--font-size:` + (this.options.style.fontSize || '14px') + `;--transition:` + (this.options.style.transition || '0.2s') + ` ease;--transition-fast:` + (this.options.style.transitionFast || '0.1s') + ` ease;--transition-input:` + (this.options.style.transitionInput || '0.2s') + ` ease;}`;
        styleElement.textContent += ".context-menu{background:var(--context-menu-bg);border:1px solid var(--context-menu-border);border-radius:var(--border-radius);box-shadow:var(--context-menu-shadow);padding:var(--padding) 0;min-width:220px;z-index:1000;font-family:Arial,sans-serif;color:var(--context-menu-text);animation:contextMenuSlideIn var(--transition-fast) forwards;transform-origin:top center}.context-menu .context-menu{position:relative;left:-5px}.context-menu:has(> .context-menu-dropdown)::after{content:'';position:absolute;inset:0 0 -400% 0;z-index:-1}.context-menu-button,.context-menu-checkbox,.context-menu-radio,.context-menu-submenu{display:flex;align-items:center;width:100%;padding:calc(var(--padding) + 2px) var(--padding-horizontal);border:none;background:0 0;font-size:var(--font-size);text-align:left;cursor:pointer;color:var(--context-menu-text);transition:background-color var(--transition-fast),color var(--transition-fast);position:relative;gap:var(--gap)}.context-menu-button:hover,.context-menu-checkbox:hover,.context-menu-radio:hover,.context-menu-search-select-list label:hover,.context-menu-submenu:hover{background-color:var(--context-menu-hover-bg)}.context-menu-button:focus,.context-menu-submenu:focus{outline:0;background-color:var(--context-menu-hover-bg)}.context-menu-button[data-marked=true],.context-menu-checkbox input:checked,.context-menu-radio input:checked{background-color:var(--context-menu-accent)}.context-menu-button:focus-visible,.context-menu-submenu:focus-visible{outline:2px solid var(--context-menu-accent);outline-offset:-2px}.context-menu-button:disabled{color:rgba(26,26,26,.4);cursor:not-allowed}.context-menu-button[data-marked=true]{font-weight:700;color:#fff;border-radius:calc(var(--border-radius)/ 2);border:1px solid var(--context-menu-accent)}.context-menu-button[data-marked=true]:hover{background-color:var(--context-menu-accent);color:#fff}.context-menu-button span,.context-menu-submenu span{display:flex;align-items:center;pointer-events:none}.context-menu-separator{height:1px;background-color:var(--context-menu-separator);margin:var(--padding) 0}.context-menu-dropdown,.context-menu-input input,.context-menu-search-select input{padding:var(--padding);border:1px solid var(--context-menu-border);border-radius:var(--border-radius-input);font-size:var(--font-size);background-color:#f9fafb;transition:border-color var(--transition-input),box-shadow var(--transition-input)}.context-menu-double-input,.context-menu-input{padding:var(--padding) var(--padding-horizontal)}.context-menu-dropdown:focus,.context-menu-input input:focus,.context-menu-search-select input:focus{outline:0;border-color:var(--context-menu-accent);box-shadow:0 0 0 2px rgba(59,130,246,.2)}.context-menu-input input{width:calc(100% - var(--padding-horizontal))}.context-menu-double-input{display:flex;gap:10px;align-items:center}.context-menu-double-input>.context-menu-input{padding:unset!important}.context-menu-dropdown{width:calc(100% - calc(var(--padding-horizontal) * 2));margin:var(--padding) var(--padding-horizontal)}.context-menu-checkbox input,.context-menu-radio input,.context-menu-search-select-list input{margin-right:var(--gap);accent-color:var(--context-menu-accent)}.context-menu-checkbox input:focus,.context-menu-radio input:focus,.context-menu-search-select-list input:focus{outline:0;box-shadow:0 0 0 2px rgba(59,130,246,.2)}.context-menu-search-select{display:flex;flex-direction:column;padding:calc(var(--padding) + 2px) var(--padding-horizontal)}.context-menu-search-select-list{max-height:200px;overflow-y:auto;margin-top:var(--padding)}.context-menu-search-select-list button{width:100%;padding:var(--padding);background:#007bff;font-size:var(--font-size);text-align:left;cursor:pointer;color:#fff;transition:background-color var(--transition-fast),color var(--transition-fast)}.context-menu-search-select-list label{display:flex;flex-direction:row-reverse;gap:var(--gap);align-items:center;padding:var(--padding) 0;justify-content:flex-end}@keyframes contextMenuSlideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(calc(-1 * var(--padding)))}}.context-menu:focus{outline:0}";
        document.head.appendChild(styleElement);
    }
}

// DynamicGrid\typePlugins\BaseTypePlugin.js
/**
 * BaseTypePlugin is an abstract class that defines the structure for type plugins.
 * It provides methods for validation, parsing values, evaluating conditions, and generating input components.
 * Subclasses must implement the `validate`, `parseValue`, and `evaluate` methods.
 *
 * @abstract
 * @class BaseTypePlugin
 * @param {Object} [config={}] - Configuration options for the plugin.
 */
class BaseTypePlugin {

    constructor(config = {}) {
        if (this.constructor === BaseTypePlugin) {
            throw new Error("BaseTypePlugin is abstract");
        }

        //List of all available operators for this type plugin.
        this.operators = ['==', '!='];

        //options are: 'boolean', 'date', 'number', 'string'
        this.sortingHint = 'string';
    }

    /**
     * Validates a given value.
     * Must be implemented by subclasses.
     *
     * @abstract
     * @param {*} value - The value to validate.
     * @throws {Error} If not implemented in a subclass.
     * @returns {boolean} True if the value is valid, false otherwise.
     */
    validate(value) {
        throw new Error("validate must be implemented");
    }

    /**
     * Parses a given value.
     * Must be implemented by subclasses.
     *
     * @abstract
     * @param {*} value - The value to parse.
     * @returns {*} The parsed value.
     * @throws {Error} If not implemented in a subclass.
     */
    parseValue(value) {
        throw new Error("parseValue must be implemented");
    }

    /**
     * Evaluates a condition based on the provided operator and values. (must only be used when operator is not '==' or '!=').
     *
     * @param {*} dataValue - The value from the data to compare.
     * @param {string} operator - The operator to use for evaluation (e.g., '==', '!=').
     * @param {*} compareValue - The value to compare against.
     * @abstract
     */
    evaluateCondition(dataValue, operator, compareValue) {
        throw new Error("evaluateCondition must be implemented (when operator is not '==' or '!=')");
    }

    /**
     * Evaluates a condition based on the provided operator and values.
     *
     * @param {string} operator - The operator to use for evaluation (e.g., '==', '!=').
     * @param {*} parsedValue - The value to compare against.
     * @returns {Function} The result of the evaluation.
     */
    getConditionChecker(operator, parsedValue) {
        switch (operator) {
            case '==':
                return (parsed) => parsed === parsedValue;
            case '!=':
                return (parsed) => parsed !== parsedValue;
            default:
                return (parsed) => this.evaluateCondition(parsed, operator, parsedValue);
        }
    }

    /**
     * Evaluates a query against the provided data and indices.
     * Filters the indices based on the query conditions.
     *
     * @param {Object} query - The query object containing `field`, `operator`, and `value`.
     * @param {Map} [dataIndexes] - A map of data indexes to evaluate.
     * @param {Object[]} data - The dataset to evaluate against.
     * @param {Set} indices - The set of indices to filter.
     * @returns {Set} The filtered set of indices.
     */
    evaluate(query, dataIndexes, data, indices) {
        const { field, operator, value } = query;
        const parsedValue = this.parseValue(value);

        // Pre-compile the condition check for maximum speed
        const conditionCheck = this.getConditionChecker(operator, parsedValue);

        // Get the field-specific index map
        const fieldIndexes = dataIndexes?.[field];

        if (fieldIndexes && indices && fieldIndexes.size <= indices.size) {
            const fieldIterator = fieldIndexes.keys();
            let current = fieldIterator.next();

            while (!current.done) {
                const indexKey = current.value;
                const parsed = this.parseValue(indexKey);

                if (!conditionCheck(parsed)) {
                    const indexSet = fieldIndexes.get(indexKey);
                    // Batch delete for better performance
                    for (const idx of indexSet) {
                        indices.delete(idx);
                    }
                }
                current = fieldIterator.next();
            }
        } else {
            // Use iterator to avoid issues with Set modification during iteration
            const iterator = indices.values();
            let current = iterator.next();
            const toDelete = [];

            while (!current.done) {
                const index = current.value;
                const dataVal = data[index][field];
                const parsed = this.parseValue(dataVal);

                if (!conditionCheck(parsed)) {
                    toDelete.push(index);
                }
                current = iterator.next();
            }

            // Batch delete all failed matches
            for (let i = 0; i < toDelete.length; i++) {
                const deleted = indices.delete(toDelete[i]);
                if (!deleted) {
                    console.warn(`Failed to delete index: ${toDelete[i]}`);
                }
            }
        }

        return indices;
    }

    /**
     * Generates an input component for user interaction.
     *
     * @param {*} currentValue - The current value of the input.
     * @param {Function} onChange - Callback function to handle input changes.
     * @returns {HTMLInputElement} The generated input element.
     */
    getInputComponent(currentValue, onChange) {
        const input = document.createElement('input');
        input.type = 'text';
        input.name = '_';
        input.value = currentValue ?? '';
        input.addEventListener('input', (e) => onChange(e.target.value));
        return input;
    }

    /**
     * Generates context menu items for the specified column.
     * @param {string} columnName - The name of the column.
     * @param {SJQLEngine} engine - The query engine instance.
     * @param {DynamicGridUI} ui - The UI instance.
     * @returns {Array} An array of context menu items.
     */
    getContextMenuItems(columnName, engine, ui) {
        return [];
    }
}

// DynamicGrid\EditTracker.js
class EditTracker {
    constructor() {
        this.updates = [];
    }


    /**
     * @example
     * //data provided to the onEdit function
     *[
     *   {
     *        "column": STRING,               // The column name that was edited
     *        "row": {                        // the row that was edited in it's previous state
     *            "internal_id": NUMBER,      // The internal ID used inside the grid
     *            ...                         // Other row data (depends on the data source)
     *        },
     *        "previousValue": OBJECT,        // The previous value of the cell
     *        "newValue": OBJECT              // The new value of the cell
     *    },
     *    ...
     *];
     */
    addEdit(data) {
        this.updates.push(data);
        this.updates = this.cleanUpdates(this.updates);
    }

    cleanUpdates(updates) {
        const latestUpdates = new Map();

        // Group updates by row internal_id + column, and keep only the last one
        updates.forEach((update) => {
            const key = `${update.row.internal_id}_${update.column}`;
            latestUpdates.set(key, {...update});
        });

        // Filter out any updates where previousValue === newValue
        return Array.from(latestUpdates.values()).filter(update => update.previousValue !== update.newValue);
    }

    clear() {
        this.updates = [];

        //find all .body-cell.edited and remove the edited class
        const editedCells = document.querySelectorAll('.body-cell.edited');
        editedCells.forEach(cell => {
            cell.classList.remove('edited');
        });
    }
}

// DynamicGrid\exportConnectors\InherentExportConnector.js
// @requires ./ExportConnector.js

class CSVExportConnector extends ExportConnector {
    constructor() {
        super();
        this.name = 'csv'
        this.mimeType = 'text/csv';
        this.extension = 'csv';
        this.delimiter = ';';
    }

    /**
     * Converts the data object into a CSV string.
     * @param {Array<Object>} data - The data to export.
     * @returns {string} - The CSV string.
     */
    export(data) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid or empty data provided for CSV export');
        }

        // Extract headers from the keys of the first object
        const headers = Object.keys(data[0]);

        // Map data rows to CSV format
        const rows = data.map(row => headers.map(header => {
            const value = row[header];
            // Escape double quotes and wrap values in quotes if necessary
            return typeof value === 'string' && value.includes(this.delimiter) ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(this.delimiter));

        // Combine headers and rows into a single CSV string
        return [headers.join(this.delimiter), ...rows].join('\n');
    }
}

class XLSXExportConnector extends ExportConnector {
    constructor() {
        super();
        this.name = 'xlsx'
        this.mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        this.extension = 'xlsx';
    }

    /**
     * Loads the SheetJS library if not already loaded.
     * @returns {Promise<void>}
     */
    loadLibrary() {
        if (window.XLSX) return Promise.resolve();

        if (!this._libraryPromise) {
            this._libraryPromise = new Promise((resolve, reject) => {
                if (window.XLSX) return resolve();

                const script = document.createElement('script');
                script.src = "https://grid.kronk.tech/xlsx.bundle.js";
                script.type = 'application/javascript';
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Failed to load XLSX library'));
                document.head.appendChild(script);
            });
        }
        return this._libraryPromise;
    }

    /**
     * Exports data to XLSX format. Loads the SheetJS library if needed.
     * @param {Array<Object>} data - The data to export.
     * @param {Object} headers - The headers object.
     * @param {string} name - The name for the export.
     * @returns {Promise<Uint8Array>} - The XLSX file as a binary array.
     */
    async exportAsync(data, headers, name) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid or empty data provided for XLSX export');
        }

        try {
            // Load the SheetJS library with a timeout
            await Promise.race([
                this.loadLibrary(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('XLSX library load timeout')), 5000)
                )
            ]);

            // Create workbook and worksheet
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(data);

            const headerCount = Object.keys(headers).length;
            worksheet['!autofilter'] = {
                ref: `A1:${this.getExcelHeaderLetter(headerCount - 2)}1`
            };
            worksheet['!cols'] = this.fitToColumn(data);

            // Style header row
            worksheet['!cols'].forEach((col, index) => {
                const colLetter = this.getExcelHeaderLetter(index);
                worksheet[`${colLetter}1`].s = {
                    font: { bold: true, color: { rgb: 'FFFFFF' } },
                    fill: { fgColor: { rgb: '4BACC6' } },
                    alignment: { horizontal: 'left', vertical: 'top' },
                };
            });

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet');

            // Export as Uint8Array
            return XLSX.write(workbook, {
                type: 'array',
                bookType: 'xlsx'
            });

        } catch (error) {
            console.error('Error during XLSX export:', error);
            throw error;
        }
    }

    getExcelHeaderLetter(index) {
        // Convert index to Excel column letter (A, B, C, ... AA, AB, ...)
        let letter = '';
        while (index >= 0) {
            letter = String.fromCharCode((index % 26) + 65) + letter;
            index = Math.floor(index / 26) - 1;
        }
        return letter;
    }

    fitToColumn(data, headers) {
        const widths = []
        for (const field in data[0]) {
            widths.push({
                wch: Math.max(field.length + 3, // Add some padding for the filter button
                    ...data.map(item => item[field]?.toString()?.length ?? 0))
            })
        }
        return widths
    }
}

class JSONExportConnector extends ExportConnector {
    constructor() {
        super();
        this.name = 'json'
        this.mimeType = 'application/json';
        this.extension = 'json';
    }

    export(data, headers, name) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid or empty data provided for JSON export');
        }

        // Convert the data object to a JSON string
        return JSON.stringify(data, null, 2);
    }
}

class XMLExportConnector extends ExportConnector {
    constructor() {
        super();
        this.name = 'xml'
        this.mimeType = 'application/xml';
        this.extension = 'xml';
    }

    export(data, headers, name) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid or empty data provided for XML export');
        }

        // Convert the data object to an XML string
        const xmlString = this.jsonToXML(data);
        return xmlString;
    }

    jsonToXML(json) {
        let xml = '<root>\n';
        json.forEach(item => {
            xml += '  <item>\n';
            for (const key in item) {
                xml += `    <${key}>${item[key]}</${key}>\n`;
            }
            xml += '  </item>\n';
        });
        xml += '</root>';
        return xml;
    }
}

class HTMLExportConnector extends ExportConnector {
    constructor() {
        super();
        this.name = 'html'
        this.mimeType = 'text/html';
        this.extension = 'html';
    }

    export(data, headers, name) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid or empty data provided for HTML export');
        }

        // Convert the data object to an HTML string
        let htmlString = '<table>\n';
        htmlString += this.headersToHTML(Object.keys(headers));
        htmlString += this.jsonToHTML(data);
        htmlString += '</table>';
        return htmlString;
    }

    headersToHTML(headers) {
        let html = '  <tr>\n';
        headers.forEach(header => {
            html += `    <th>${header}</th>\n`;
        });
        html += '  </tr>\n';
        return html;
    }

    jsonToHTML(json) {
        let html = '';
        json.forEach(item => {
            html += '  <tr>\n';
            for (const key in item) {
                html += `    <td>${item[key]}</td>\n`;
            }
            html += '  </tr>\n';
        });
        return html;
    }
}

class TXTExportConnector extends ExportConnector {
    constructor() {
        super();
        this.name = 'txt'
        this.mimeType = 'text/plain';
        this.extension = 'txt';
    }

    export(data, headers, name) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid or empty data provided for TXT export');
        }

        // Convert the data object to a TXT string
        return data.map(item => Object.values(item).join('\t')).join('\n');
    }
}

/*
Diffrent filetypes exporting should suppert:
- [x] CSV
- [x] XLSX
- [x] JSON
- [ ] PDF
- [x] XML
- [x] HTML
- [X] TXT
- [ ] YAML
- [ ] Markdown
 */

// DynamicGrid\QueryParser.js
// @requires ./DynamicGridUtils.js

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

            if (!plugin.validate(value)) {
                throw new GridError('Invalid value: ' + value + '\n' + 'For query: ' + key + ' ' + operator + ' ' + value + '\n' + this.formatOperatorError(operator, key, plugin));
            }

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



// DynamicGrid\DynamicGridUI.js
// @requires ./DynamicGridUtils.js
// @requires ./ColumnContextMenu.js
// @requires ./libs/ContextMenu.js

class DynamicGridUI {
    /**
     * @param {string} ui_config.containerId - The ID of the container for the grid. (required)
     * @param {number} ui_config.minColumnWidth - Minimum width for columns. (default: 5%)
     * @param {number} ui_config.rowHeight - Height of each row. (default: 40px)
     * @param {number} ui_config.bufferedRows - Number of buffered rows added to the top AND bottom (default: 5)
     * @param {'header'|'content'|'both'|'none'} ui_config.autoFitCellWidth - Determines how cell widths are auto-fitted. (default: 'header', options: 'header', 'content', 'both', 'none')
     * @param {KeyboardShortcuts} dynamicGrid.keyboardShortcuts - Keyboard shortcuts for the grid.
     * @param {SJQLEngine} dynamicGrid.engine - The query engine for the grid.
     * @event ui-cell-edit - Event fired when a cell is edited.
     */
    constructor(dynamicGrid, ui_config, eventEmitter) {
        this.dynamicGrid = dynamicGrid;
        this.containerId = ui_config.containerId;

        this.eventEmitter = eventEmitter;
        this.eventEmitter.emit('ui-initialized', { containerId: this.containerId });
        this.keyboardShortcuts = dynamicGrid.keyboardShortcuts;
        this.engine = dynamicGrid.engine;

        this.table = null;
        this.header = null;
        this.body = null;
        this.scrollContainer = null;
        this.groupedRows = null;

        this.config = {
            minColumnWidth: ui_config.minColumnWidth ?? 50,
            rowHeight: ui_config.rowHeight ?? 40,
            bufferedRows: ui_config.bufferedRows ?? 5,
            colorScheme: ui_config.colorScheme ?? 'light',
        };

        // Virtual scrolling properties
        this.virtualScrolling = {
            scrollTop: 0,
            visibleRowsCount: 0,
            startIndex: 0,
            endIndex: 0,
            totalHeight: 0,
            topSpacer: null,
            bottomSpacer: null
        };

        this.#_init(this.containerId);

        this.UIChache = 0;
        this.UICacheRefresh = false;

        //array of ints
        this.showData = [];
        this.showDataLength = 0; // Length of the data currently shown in the UI
        this.hiddenIndices = new Set();


        // Set up context menu
        this.contextMenu = new ContextMenu({
            width: 250,
            style: {
                accent: '#3b82f6',
                backgroundColor: '#ffffff',
                textColor: '#333333',
                padding: '4px',
            },
            closeOnClick: true,
            closeOnOutsideClick: true,
        });

        // Create the column header context menu handler
        this.columnHeaderContextMenu = new ColumnHeaderContextMenu(
            this.contextMenu,
            this.engine,
            this
        );
    }

    render(data) {
        if (!data) return;
        if (data.length === 0) {
            this.clearContent();
            return;
        }

        this.isGroupedData = typeof data === 'object' && Array.isArray(firstItem(data));

        if (this.isGroupedData) {
            this.showData = [];
            let index = 0;
            Object.keys(data).forEach((key) => {
                this.showData.push(...data[key]);
                this.GroupRowRange(index, index + data[key].length - 1);
                index += data[key].length;
            });
        }
        else{
            this.showData = data;
        }
        this.showDataLength = this.showData.length; // Update the length of the data currently shown in the UI

        const columns = this.engine.getColumns();
        const firstDataItem = this.engine.getData(data[0], true);

        // Check if the data has changed in its structure (can I keep the headers etc.)
        const cacheHash = FastHash(columns);
        this.UICacheRefresh = this.UIChache !== cacheHash;
        this.UIChache = cacheHash;

        if (this.UICacheRefresh) {
            this.table = this.#_createResizableTable(columns, firstDataItem);
        }

        this.#_renderTable(columns);

        // Set up virtual scrolling after rendering the table
        this.#_setupVirtualScrolling();

        this.eventEmitter.emit('ui-rendered', { ...this.showData });
    }

    toggleColumn(IndexOrIndex) {
        const Index = typeof IndexOrIndex === 'number' ? IndexOrIndex : this.engine.getColumns().indexOf(IndexOrIndex.toLowerCase());
        this.colGroup1.children[Index + 1].style.visibility === 'collapse' ? this.#_showColumn(Index) : this.#_hideColumn(Index);
    }

    clearContent() {
        if (this.table) {
            //remove the data part, not the header
            this.bodyTable?.remove();
            this.scrollContainer?.remove();
        }
        this.showData = [];
        this.eventEmitter.emit('ui-content-cleared');
    }

// Make sure to clean up in the destroy method:
    destroy() {
        this.clearContent();
        this.table?.remove();
        this.headerTable?.remove();
        this.scrollContainer?.remove();
        this.bodyTable?.remove();

        // Clear all event listeners
        this.eventEmitter.removeAllListeners();

        // Clear context menu
        this.contextMenu.destroy();
        this.columnHeaderContextMenu = null; // Add this line

        // Clear properties
        this.table = null;
        this.headerTable = null;
        this.bodyTable = null;
        this.scrollContainer = null;
        this.colGroup1 = null;
        this.colGroup2 = null;
    }

    GroupRowRange(startIndex, endIndex) {
        if (startIndex < 0 || endIndex >= this.showData.length || startIndex > endIndex) {
            throw new GridError('Invalid row range to hide');
        }

        //add a grouped row element to the groupedRows div
        const groupedRow = document.createElement('div');
        groupedRow.className = 'grouped-row';
        groupedRow.setAttribute('s', startIndex); // start index of the grouped row
        groupedRow.setAttribute('_s', startIndex);  //original start index (never changes)
        groupedRow.setAttribute('l', endIndex - startIndex + 1); // length of the grouped row
        this.groupedRows.appendChild(groupedRow);

        groupedRow.onclick = () => {
            this.toggleGroupedRow(groupedRow);
        };

        this.#_computeVisibleIndices();
        this.virtualScrolling.startIndex = 0; // or keep current scroll position logic if you prefer
        this._updateVisibleRows();

        this.eventEmitter.emit('ui-row-range-hidden', {startIndex, endIndex});
    }

    /**
     * Toggles the visibility of a grouped row.
     * @param groupedRow {HTMLElement} - The grouped row element to toggle.
     * @param show {-1|boolean} - If -1, toggles the visibility. If 1|true, shows the row. If 0|false, hides the row.
     */
    toggleGroupedRow(groupedRow, show = -1) {
        // Get start and end index from the DOM attributes
        const startIndex = parseInt(groupedRow.getAttribute('_s'), 10);
        const length = parseInt(groupedRow.getAttribute('l'), 10);
        const endIndex = startIndex + length - 1;

        // // Toggle visibility of the grouped rows
        // const hidden = show == -1 ? groupedRow.classList.toggle('hidden')
        // const isHidden = groupedRow.classList.contains('hidden');

        if (show === -1) {
            groupedRow.classList.toggle('hidden');
        }
        const isHidden = show === -1 ? groupedRow.classList.contains('hidden') : show == 1 ? !true : !false;

        //add the range to the showDataHidden array
        const previousGroupedRow = groupedRow.previousElementSibling;
        if (isHidden) {
            //toggle to hide the rows
            for (let i = startIndex + 1; i <= endIndex; i++) {
                this.hiddenIndices.add(this.showData[i]);
            }

            if (previousGroupedRow) {
                const previousStart = parseInt(previousGroupedRow.getAttribute('s'), 10);
                const previousLength = parseInt(previousGroupedRow.getAttribute('l'), 10);
                groupedRow.setAttribute('s', `${previousGroupedRow.classList.contains('hidden') ? previousStart + 1 : previousStart + previousLength}`);
            } else {
                groupedRow.setAttribute('s', startIndex);
            }

            const parent = groupedRow.parentNode;
            const children = Array.from(parent.children);
            const nextIndex = children.indexOf(groupedRow) + 1;
            for (let i = nextIndex; i < children.length; i++) {
                const child = children[i];
                if (child.classList.contains('grouped-row')) {
                    child.setAttribute('s', `${parseInt(child.getAttribute('s'), 10) + 1 - parseInt(groupedRow.getAttribute('l'), 10)}`);
                }
            }

            this.eventEmitter.emit('ui-row-range-hidden', {startIndex, endIndex});
        } else {
            //toggle to show the rows
            for (let i = startIndex + 1; i <= endIndex; i++) {
                this.hiddenIndices.delete(this.showData[i]);
            }

            const parent = groupedRow.parentNode;
            const children = Array.from(parent.children);
            const nextIndex = children.indexOf(groupedRow) + 1;
            for (let i = nextIndex; i < children.length; i++) {
                const child = children[i];
                if (child.classList.contains('grouped-row')) {
                    child.setAttribute('s', `${parseInt(child.getAttribute('s'), 10) + parseInt(groupedRow.getAttribute('l'), 10) - 1}`);
                }
            }

            this.eventEmitter.emit('ui-row-range-shown', {startIndex, endIndex});
        }

        this.#_computeVisibleIndices();
        this.virtualScrolling.startIndex = 0; // or keep current scroll position logic if you prefer
        this._updateVisibleRows();
    }

    #_hideColumn(Index) {
        const column = this.colGroup1.children[Index + 1];
        const headerCell = this.headerTable.querySelector(`th:nth-child(${Index + 2})`);
        if (column) {
            column.style.visibility = 'collapse';
            headerCell.style.pointerEvents = 'none';
        }

        const column2 = this.colGroup2.children[Index + 1];
        if (column2) {
            column2.style.visibility = 'collapse';
        }
    }

    #_showColumn(Index) {
        const column = this.colGroup1.children[Index + 1];
        const headerCell = this.headerTable.querySelector(`th:nth-child(${Index + 2})`);
        if (column) {
            column.style.visibility = 'visible';
            headerCell.style.pointerEvents = 'auto';
        }

        const column2 = this.colGroup2.children[Index + 1];
        if (column2) {
            column2.style.visibility = 'visible';
        }
    }

    // ======================================== PRIVATE METHODS ========================================

    #_init(containerId) {
        this.container = document.querySelector(containerId);
        if (!this.container) {
            throw new GridError(`Container with id "${containerId}" not found`);
        }

        this.keyboardShortcuts.addShortcut('ctrl+shift+a', 'Shortcut to automatically fit the columns to a (almost) perfect fit', () => {
            this.autoFitCellWidth();
        });

        this.keyboardShortcuts.addShortcut('ctrl+shift+r', 'Shortcut to refresh the UI', () => {
            this.UICacheRefresh = true;
            this.render(this.showData);
        });

        //add a shortcut to open or close all grouped rows
        this.keyboardShortcuts.addShortcut('ctrl+shift+g', 'Shortcut to toggle all grouped rows', () => {
            const groupedRows = this.groupedRows.querySelectorAll('.grouped-rows > .grouped-row');
            if (groupedRows.length === 0) return;

            //if the first grouped row is hidden, show all, otherwise hide all
            const firstGroupedRow = groupedRows[0];
            const shouldShow = firstGroupedRow.classList.contains('hidden');
            console.log(shouldShow, firstGroupedRow.classList.contains('hidden'));
            groupedRows.forEach((row) => {
                //if shouldShow and the row is hidden, show it, otherwise skip it
                //if !shouldShow and the row is not hidden, hide it, otherwise skip it
                if (shouldShow && row.classList.contains('hidden')) {
                    this.toggleGroupedRow(row);
                }
                else if (!shouldShow && !row.classList.contains('hidden')) {
                    this.toggleGroupedRow(row);
                }
            });

            this.#_computeVisibleIndices();
            this.virtualScrolling.startIndex = 0; // or keep current scroll position logic if you prefer
            this._updateVisibleRows();
        });

        this.container.addEventListener('keydown', (event) => {
            ['ctrl', 'shift', 'alt'].forEach((key) => {
                if (event[`${key}Key`]) {
                    this.container.setAttribute(key, 'true');
                }
            });
        });

        this.container.addEventListener('keyup', (event) => {
            ['ctrl', 'shift', 'alt'].forEach((key) => {
                if (!event[`${key}Key`]) {
                    this.container.removeAttribute(key);
                }
            });
        });

        this.eventEmitter.emit('ui-container-initialized', { containerId });
    }

    //======================================== TABLE FACTORY ========================================
    #_createResizableTable() {
        if (!this.UICacheRefresh)
            return this.table;
        else
            this.table?.remove();

        this.table = document.createElement('div');
        this.table.className = 'table';

        return this.table;
    }

    #_renderTable(columns) {
        const tableExists = this.table && this.table.parentNode;
        const tableHeaderExists = this.headerTable && this.headerTable.parentNode;
        const bodyTableExists = this.bodyTable && this.bodyTable.parentNode;


        if (!tableExists) {
            this.table = document.createElement('div');
            this.table.className = 'dynamic-grid-table';
            this.table.dataset.theme = this.config.colorScheme;
        }

        if (!tableHeaderExists) {
            this.headerTable = document.createElement('table');
            this.headerTable.className = 'dynamic-grid-table-header';
            this.headerTable.setAttribute('cellspacing', '0');
            this.headerTable.setAttribute('cellpadding', '0');

            const colgroup = this.#_createColGroup(columns);
            this.colGroup1 = colgroup;

            this.headerTable.appendChild(colgroup);
            this.headerTable.appendChild(this.#_createHeader(columns));

            this.table.appendChild(this.headerTable);
        }

        if (!bodyTableExists) {
            // Create scroll container for the body
            this.scrollContainer = document.createElement('div');
            this.scrollContainer.className = 'dynamic-grid-scroll-container';
            this.scrollContainer.style.position = 'relative';
            this.scrollContainer.style.width = '100%';

            // BODY
            this.bodyTable = document.createElement('table');
            this.bodyTable.className = 'dynamic-grid-table-body';
            this.bodyTable.setAttribute('cellspacing', '0');
            this.bodyTable.setAttribute('cellpadding', '0');

            const colgroup2 = this.#_createColGroup(columns);
            this.colGroup2 = colgroup2;

            this.bodyTable.appendChild(colgroup2);

            // Create spacers for virtual scrolling
            this.virtualScrolling.topSpacer = document.createElement('tr');
            this.virtualScrolling.topSpacer.style.height = '0px';
            this.virtualScrolling.topSpacer.className = 'virtual-scroll-spacer top-spacer';

            this.virtualScrolling.bottomSpacer = document.createElement('tr');
            this.virtualScrolling.bottomSpacer.style.height = '0px';
            this.virtualScrolling.bottomSpacer.className = 'virtual-scroll-spacer bottom-spacer';

            this.scrollContainer.appendChild(this.bodyTable);
            this.table.appendChild(this.scrollContainer);


            //grouped rows buttons
            this.groupedRows = document.createElement('div');
            this.groupedRows.className = 'grouped-rows';
            this.groupedRows.style.setProperty('--y-offset', '0px');
            this.table.appendChild(this.groupedRows);
        }
        else {
            this.bodyTable.innerHTML = '';
            this.bodyTable.appendChild(this.colGroup2);
        }

        // Create the body with virtual scrolling
        this.body = this.#_createVirtualBody();

        this.bodyTable.appendChild(this.body);
        this.container.appendChild(this.table);
    }

    #_createColGroup(headers) {
        const colgroup = document.createElement('colgroup');
        const topLeftCorner = document.createElement('col');
        topLeftCorner.style.width = `30px`;
        topLeftCorner.setAttribute('resizable', 'false');
        colgroup.appendChild(topLeftCorner);



        var width = 0;
        for (const key in headers) {
            if (typeof headers[key] !== 'string') continue;
            const header = this.engine.getHeader(headers[key]).config;
            // console.log(header)
            const col = document.createElement('col');
            width += header.width ?? 100;
            col.style.width = `${header.width ?? 100}px`;
            col.style.minWidth = `${header.minWidth}px`;
            col.style.maxWidth = `${header.maxWidth}px`;
            header.resizable ? col.setAttribute('resizable', 'true') : null;
            colgroup.appendChild(col);
        }
        colgroup.style.width = `${width}px`;
        return colgroup;
    }

    #_createHeader(columns) {
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        tr.className = 'header-row';

        const thTopLeftCorner = document.createElement('th');
        thTopLeftCorner.className = 'header-cell top-left-corner';
        tr.appendChild(thTopLeftCorner);

        thTopLeftCorner.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            this.contextMenu.clear();
            this.contextMenu
                .searchSelect('Columns to show/hide', this.engine.getColumns().map((column) => {return {label: column,value: column,checked: true};}), {
                    onChange: (value) => {
                        //diff between this.engine.getColumns() and value
                        const columns = this.engine.getColumns();
                        const diff = columns.filter((column) => !value.includes(column));
                        columns.forEach((column) => {
                            if (!diff.includes(column)) {
                                this.#_showColumn(columns.indexOf(column));
                            }
                            else {
                                this.#_hideColumn(columns.indexOf(column));
                            }
                        });
                    }
                });

            // Display the context menu at the specified coordinates
            return this.contextMenu.showAt(100, 100);
        });

        columns.forEach((columnName, colIndex) => {
            colIndex++;

            const header = this.engine.headers[columnName];
            const plugin = header.plugin || this.engine.getPlugin(columnName);

            const th = document.createElement('th');
            th.className = 'header-cell';
            th.className += ` ${header.config.headerClass || ''}`;
            th.style.height = `${this.config.rowHeight}px`;
            th.style.position = 'relative';


            const div = document.createElement('div');
            div.className = 'header-cell-content';

            const button = document.createElement('button');
            button.className = 'header-cell-button';
            button.innerText = '▼';

            const span = document.createElement('span');
            span.className = 'header-cell-text';
            span.innerText = header.name || columnName;

            div.appendChild(button);
            div.appendChild(span);
            th.appendChild(div);

            // === ADD: RESIZE HANDLE ===
            if (header.config.resizable) {
                const resizeHandle = document.createElement('div');
                resizeHandle.className = 'header-resize-handle';

                let isDragging = false;
                let startX = 0;
                let startWidth = 0;
                const colElement = this.colGroup1?.children[colIndex];
                let newWidth = 0;

                resizeHandle.addEventListener('mouseenter', () => {
                    resizeHandle.classList.add('hover');
                });
                resizeHandle.addEventListener('mouseleave', () => {
                    if (!isDragging) resizeHandle.classList.remove('hover');
                });

                resizeHandle.addEventListener('mousedown', (e) => {
                    isDragging = true;
                    startX = e.clientX;
                    startWidth = colElement?.offsetWidth || 100;

                    const onMouseMove = (e) => {
                        if (!isDragging || !colElement) return;
                        const delta = e.clientX - startX;
                        newWidth = Math.max(this.config.minColumnWidth, startWidth + delta);
                        newWidth = Math.max(newWidth, this.config.minColumnWidth);
                        colElement.style.width = `${newWidth}px`;
                    };

                    const onMouseUp = () => {
                        isDragging = false;
                        resizeHandle.classList.remove('hover');
                        this.colGroup2.children[colIndex].style.width = `${newWidth}px`;
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });


                th.appendChild(resizeHandle);
            }

            th.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Use the new context menu handler
                this.columnHeaderContextMenu.showForColumn(
                    columnName,
                    th,
                    e.clientX,
                    e.clientY
                );
            });

            tr.appendChild(th);
        });

        thead.appendChild(tr);
        return thead;
    }

    #_createVirtualBody() {
        const tbody = document.createElement('tbody');

        // Add top spacer for virtual scrolling
        tbody.appendChild(this.virtualScrolling.topSpacer);

        // Initial render of visible rows (empty until scroll handler calculates what's needed)

        // Add bottom spacer for virtual scrolling
        tbody.appendChild(this.virtualScrolling.bottomSpacer);

        this.body = tbody;
        return tbody;
    }

    #_setupVirtualScrolling() {
        if (!this.table || !this.showData.length) return;

        // Calculate total height of all rows
        const totalRows = this.showData.length;
        this.virtualScrolling.totalHeight = totalRows * this.config.rowHeight;

        this.#_computeVisibleIndices();

        // Calculate how many rows can be visible at once
        const visibleHeight = this.table.clientHeight || 400; // Default height if not set
        this.virtualScrolling.visibleRowsCount = Math.ceil(visibleHeight / this.config.rowHeight);

        // Add buffer rows above and below
        const totalVisibleRows = this.virtualScrolling.visibleRowsCount + (this.config.bufferedRows * 2);

        // Set initial range
        this.virtualScrolling.startIndex = 0;
        this.virtualScrolling.endIndex = Math.min(totalVisibleRows, totalRows);

        // Attach scroll event listener to the correct element
        this.table.addEventListener('scroll', this.#_handleScroll.bind(this));

        // Initial render of visible rows
        this._updateVisibleRows();

        // Set initial scroll position (if needed)
        if (this.virtualScrolling.scrollTop > 0) {
            this.table.scrollTop = this.virtualScrolling.scrollTop;
        }
    }

    #_handleScroll(event) {
        const scrollTop = event.target.scrollTop;
        const rowHeight = this.config.rowHeight;

        this.virtualScrolling.scrollTop = scrollTop;
        this.groupedRows.style.setProperty('--y-offset', `${scrollTop}px`);

        const rowIndex = Math.floor(scrollTop / rowHeight);
        const startIndex = Math.max(0, rowIndex - this.config.bufferedRows);

        const visibleRows = this.visibleIndices;

        const clampedStart = Math.min(startIndex, visibleRows.length - 1);
        const clampedEnd = Math.min(
            clampedStart + this.virtualScrolling.visibleRowsCount + this.config.bufferedRows * 2,
            visibleRows.length
        );

        if (
            clampedStart !== this.virtualScrolling.startIndex ||
            clampedEnd !== this.virtualScrolling.endIndex
        ) {
            this.virtualScrolling.startIndex = clampedStart;
            this.virtualScrolling.endIndex = clampedEnd;
            this._updateVisibleRows();
        }
    }

    _updateVisibleRows() {
        const visibleRows = this.visibleIndices;
        const start = this.virtualScrolling.startIndex;
        const end = Math.min(
            start + this.virtualScrolling.visibleRowsCount + this.config.bufferedRows * 2,
            visibleRows.length
        );

        // Clear current non-spacer rows
        const currentRows = Array.from(this.body.querySelectorAll('tr:not(.virtual-scroll-spacer)'));
        currentRows.forEach(row => row.remove());

        const fragment = document.createDocumentFragment();

        for (let i = start; i < end; i++) {
            const rowIndex = visibleRows[i];
            const rowData = this.showData[rowIndex];
            const row = this.#_createRow(rowData);
            fragment.appendChild(row);
        }

        this.virtualScrolling.topSpacer.after(fragment);

        this.virtualScrolling.topSpacer.style.height = `${start * this.config.rowHeight}px`;
        this.virtualScrolling.bottomSpacer.style.height = `${(visibleRows.length - end) * this.config.rowHeight}px`;
    }


    #_getNextVisibleIndex(startIndex) {
        while (startIndex < this.showData.length && this.hiddenIndices.has(this.showData[startIndex])) {
            startIndex++;
        }
        return startIndex;
    }

    #_computeVisibleIndices() {
        this.visibleIndices = this.showData
            .map((_, i) => i)
            .filter(i => !this.hiddenIndices.has(this.showData[i]));
    }

    #_createRow(index) {
        const tr = document.createElement('tr');
        tr.dataset.index = index;


        this.engine.getData(index).then((data) => {
            const numberCell = document.createElement('td');
            numberCell.className = 'body-cell';
            numberCell.style.height = `${this.config.rowHeight}px`;
            numberCell.innerText = this.showData.indexOf(index) + 1; // Display the row number

            tr.appendChild(numberCell);

            Object.entries(data).forEach(([key, value]) => {
                if (key === 'internal_id') return;
                const header = this.engine.getHeader(key);
                const plugin = header.plugin || this.engine.getPlugin(key);

                const onEdit = (callback) => {
                    this.engine.updateTracker.addEdit({ column: key, row: data, previousValue: value, newValue: callback });
                    this.engine.alterData(index, key, callback);
                    this.eventEmitter.emit('ui-cell-edit', { column: key, row: data, previousValue: value, newValue: callback });
                    td.classList.add('edited'); // Add a class to indicate
                }

                let td = document.createElement('td');
                //td.append(plugin.renderCell(value, onEdit, header.config));

                try {
                    if (header.config.isEditable) {
                        const input = typeof plugin.getInputComponent === 'function'
                            ? plugin.getInputComponent(value, onEdit)
                            : BaseTypePlugin.prototype.getInputComponent(value, onEdit);

                        td.appendChild(input);
                    }
                    else {
                        let span = document.createElement('span');
                        span.className = 'cell-value';
                        span.innerText = value !== undefined ? String(value) : '';
                        td.appendChild(span);
                    }
                }
                catch (error) {
                    console.error(`Error rendering cell for key "${key}" with value "${value}":\n`, error);

                    switch (error.name) {
                        case 'RangeError':
                            td.innerText = `YYYY-MM-DD`;
                            break;
                        case 'TypeError':
                            td.innerText = `Invalid value: ${value}`;
                            break;
                        case 'SyntaxError':
                            td.innerText = `Syntax Error: ${error.message}`;
                            break;
                        case 'GridError':
                            td.innerText = `Grid Error: ${error.message}`;
                            break;
                        default:
                            td.innerText = `Error: ${error.message}`;
                    }
                    td.style.backgroundColor = 'red';
                }


                // Apply custom CSS classes if provided
                if (!!header.config.cellClass) {
                    td.classList.add(...header.config.cellClass.split(' '));
                }

                // If td is not a td html element, log it, the value and the key and the plugin
                if (!(td instanceof HTMLTableCellElement)) {
                    console.error(plugin.name + '.renderCell() did not return a td element', { td, value, key, plugin });
                    td = document.createElement('td');
                    td.style.backgroundColor = 'red';
                    td.innerText = `Invalid cell`;
                }

                td.classList.add('body-cell');
                td.style.height = `${this.config.rowHeight}px`;
                tr.appendChild(td);
            });
        });

        return tr;
    }


    approximateColumnWidth(column) {
        function approximateWidth(sampleData) {
            const maxLength = Math.max(...sampleData.map((item) => String(item).length));
            return Math.max(50, maxLength * 8.75); // 8 pixels per character, minimum width of 50px
        }

        //if column name is passed, calculate width for that column only
        if (column) {
            const sampleData = this.engine.getData(0, true);
            return approximateWidth([sampleData[column].toString()]);
        }

        const columns = this.engine.getColumns();
        const columnWidths = {};

        columns.forEach((column) => {
            //const sampleData = this.showData.map((item) => item[column]);
            //columnWidths[column] = approximateWidth(sampleData);
            const sampleData = this.engine.getData(0, true);
            if (sampleData && sampleData[column] !== undefined) {
                columnWidths[column] = approximateWidth([sampleData[column]]);
            } else {
                columnWidths[column] = this.config.minColumnWidth; // Fallback to minimum width if no data
            }
        });

        return columnWidths;
    }

    #_setWidths(widths) {
        for (let i = 0; i < widths.length; i++) {
            this.setWidth(i, widths[i]);
        }
    }

    autoFitCellWidth() {
        this.#_setWidths(Object.values(this.approximateColumnWidth()))
    }

    setWidth(column, width) {
        this.colGroup1.children[column + 1].style.width = `${width}px`;
        this.colGroup2.children[column + 1].style.width = `${width}px`;
    }
}

// DynamicGrid\typePlugins\BooleanTypePlugin.js
// @requires ./BaseTypePlugin.js

class BooleanTypePlugin extends BaseTypePlugin {
    constructor() {
        super();
        this.sortingHint = 'boolean';
    }

    validate(value) {
        return [true, false, 'true', 'false', 1, 0, '1', '0'].includes(value);
    }

    parseValue(value) {
        return value === true || value === 'true' || value === 1 || value === '1';
    }

    getInputComponent(currentValue, onChange) {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = '_'
        input.checked = this.parseValue(currentValue);
        input.addEventListener('change', () => onChange(input.checked));
        return input;
    }

    getContextMenuItems(columnName, engine, ui) {
        return [
            {
                type: 'action',
                label: 'Only True',
                action: () => {
                    engine.setSelect(columnName, '==', true);
                    ui.render(engine.runCurrentQuery());
                }
            },
            {
                type: 'action',
                label: 'Only False',
                action: () => {
                    engine.setSelect(columnName, '==', false);
                    ui.render(engine.runCurrentQuery());
                }
            },
            {
                type: 'action',
                label: 'Clear Filter',
                action: () => {
                    engine.removeSelect(columnName);
                    ui.render(engine.runCurrentQuery());
                }
            },
            {
                type: 'sort',
                label: 'Sort',
                sortingHint: this.sortingHint
            }
        ]
    }
}

// DynamicGrid\typePlugins\DateTypePlugin.js
// @requires ./BaseTypePlugin.js

class DateTypePlugin extends BaseTypePlugin {
    constructor(options = {}) {
        super();
        this.sortingHint = 'date';
        this.minDate = options.minDate || null;
        this.maxDate = options.maxDate || null;
    }

    validate(value) {
        return !isNaN(Date.parse(value));
    }

    parseValue(value) {
        return new Date(value);
    }

    getInputComponent(currentValue, onChange) {
        const input = document.createElement('input');
        input.type = 'date';
        input.name = '_'
        input.value = currentValue ? new Date(currentValue).toISOString().split('T')[0] : '';
        if (this.minDate) {
            input.min = new Date(this.minDate).toISOString().split('T')[0];
        }
        if (this.maxDate) {
            input.max = new Date(this.maxDate).toISOString().split('T')[0];
        }
        input.addEventListener('change', () => onChange(input.value));
        return input;
    }
}

// DynamicGrid\typePlugins\EmailTypePlugin.js
// @requires ./BaseTypePlugin.js

class EmailTypePlugin extends BaseTypePlugin {
    constructor() {
        super();
        this.sortingHint = 'string';
    }

    validate(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    parseValue(value) {
        return value ? String(value).toLowerCase().trim() : '';
    }

    getInputComponent(currentValue, onChange) {
        const input = document.createElement('input');
        input.type = 'email';
        input.name = '_'
        input.value = currentValue ?? '';
        input.addEventListener('input', (e) => onChange(e.target.value));
        return input;
    }
}

// DynamicGrid\typePlugins\EnumTypePlugin.js
// @requires ./BaseTypePlugin.js

class EnumTypePlugin extends BaseTypePlugin {
    constructor(config = []) {
        super();
        this.options = config;
        this.sortingHint = 'string';
    }

    validate(value) {
        return this.options.includes(value);
    }

    parseValue(value) {
        return value?.toString();
    }

    getInputComponent(currentValue, onChange) {
        const select = document.createElement('select');
        select.name = '_';
        this.options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt === currentValue) option.selected = true;
            select.appendChild(option);
        });
        select.addEventListener('change', () => onChange(select.value));
        return select;
    }
}

// DynamicGrid\typePlugins\NumberTypePlugin.js
// @requires ./BaseTypePlugin.js

class NumberTypePlugin extends BaseTypePlugin {
    constructor() {
        super();
        this.operators = ['>', '<', '>=', '<=', '><'];
        this.sortingHint = 'number';
    }

    validate(value) {
        return !isNaN(value);
    }

    parseValue(value) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
    }

    evaluateCondition(dataValue, operator, compareValue) {
        switch (operator) {
            case '==': return dataValue === compareValue;
            case '!=': return dataValue !== compareValue;
            case '>':  return dataValue > compareValue;
            case '<':  return dataValue < compareValue;
            case '>=': return dataValue >= compareValue;
            case '<=': return dataValue <= compareValue;
            default:   return false;
        }
    }

    getInputComponent(currentValue, onChange) {
        const input = document.createElement('input');
        input.type = 'text';
        input.name = '_'
        input.pattern = '\d*'; // Allows only numeric input on mobile devices
        input.value = currentValue ?? '';
        input.addEventListener('input', () => onChange(parseFloat(input.value)));
        return input;
    }

    getContextMenuItems(columnName, engine, ui) {
        return [
            {
                type: 'filter',
                label: 'Filter',
                operators: this.operators
            },
            {
                type: 'sort',
                label: 'Sort',
                sortingHint: this.sortingHint
            },
            {
                type: 'action',
                label: 'Calculate Stats',
                action: () => this.calculateStats(columnName)
            }
        ];
    }

    calculateStats(columnName) {
        // Plugin-specific implementation
    }
}


// DynamicGrid\typePlugins\PhoneNumberTypePlugin.js
// @requires ./BaseTypePlugin.js

class PhoneNumberTypePlugin extends BaseTypePlugin {
    constructor() {
        super();
        this.operators = ['%=', '=%', '*=', '!*=', '==', '!='];
        this.sortingHint = 'string';
    }

    validate(value) {
        return !isNaN(value);
    }

    parseValue(value) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
    }


    evaluateCondition(dataValue, operator, compareValue) {
        switch (operator) {
            case '==':  return dataValue === compareValue;
            case '!=':  return dataValue !== compareValue;
            case '%=':  return String(dataValue).startsWith(compareValue);
            case '=%':  return String(dataValue).endsWith(compareValue);
            case '*=':  return String(dataValue).includes(compareValue);
            case '!*=': return !String(dataValue).includes(compareValue);
            default: return false;
        }
    }

    getInputComponent(currentValue, onChange) {
        const input = document.createElement('input');
        input.type = 'tel';
        input.name = '_'
        input.pattern = '\\+((?:9[679]|8[035789]|6[789]|5[90]|42|3[578]|2[1-689])|9[0-58]|8[1246]|6[0-6]|5[1-8]|4[013-9]|3[0-469]|2[70]|7|1)(?:\\W*\\d){0,13}\\d';
        input.value = currentValue ?? '';
        input.addEventListener('input', () => onChange(input.value));
        return input;
    }
}


// DynamicGrid\typePlugins\StringTypePlugin.js
// @requires ./BaseTypePlugin.js

class StringTypePlugin extends BaseTypePlugin {
    constructor() {
        super();
        this.operators = ['%=', '=%', '*=', '!*='];
        this.sortingHint = 'string';
    }

    validate(value) {
        return typeof value === 'string';
    }

    parseValue(value) {
        return value == null ? '' : String(value);
    }

    evaluateCondition(dataValue, operator, compareValue) {
        switch (operator) {
            case '%=':  return String(dataValue).startsWith(compareValue);
            case '=%':  return String(dataValue).endsWith(compareValue);
            case '*=':  return String(dataValue).includes(compareValue);
            case '!*=': return !String(dataValue).includes(compareValue);
            default: return false;
        }
    }

    getContextMenuItems(columnName, engine, ui) {
        return [
            {
                type: 'filter',
                label: 'Filter',
                operators: this.operators
            },
            {
                type: 'sort',
                label: 'Sort',
                sortingHint: this.sortingHint
            }
        ];
    }
}

// DynamicGrid\SJQLEngine.js
// @requires ./exportConnectors/ExportConnector.js
// @requires ./DynamicGridUtils.js
// @requires ./typePlugins/BaseTypePlugin.js
// @requires ./EditTracker.js
// @requires ./QueryParser.js

/**
 * @file manages the SQL-like query engine for the grid, handling data parsing, indexing, and query execution.
 * @module SJQLEngine
 */
class SJQLEngine {
    constructor(engine_config, eventEmitter) {
        this.data = [];
        this.headers = [];
        this.plugins = [];
        this.connectors = [];
        this.futureQuery = [];
        this.QueryParser = new QueryParser(engine_config);
        this.updateTracker = new EditTracker();

        this.config = {
            //UseDataIndexing: engine_config.UseDataIndexing || true,
        };

        this.APIConnector = engine_config.APIConnector || null;

        this.eventEmitter = eventEmitter;

        this.currentQueryStr = '';
    }

    createDataIndex() {
        //if (!this.config.UseDataIndexing) return;

        // Create indexes for faster querying
        this.dataIndexes = {};
        Object.keys(this.headers).forEach(header => {
            this.dataIndexes[header] = new Map();
            this.data.forEach((row, idx) => {
                const value = row[header];
                if (!this.dataIndexes[header].has(value)) {
                    this.dataIndexes[header].set(value, new Set());
                }
                this.dataIndexes[header].get(value).add(idx);
            });
        });
    }

    autoDetectHeaders(data) {
        //if value is true or false, it's a boolean
        //else if value is a number, it's a number
        //else it's a string
        for (const key of Object.keys(data)) {
            if (data[key] === true || data[key] === false) {
                this.headers[key] = { type: 'boolean', isUnique: false, isHidden: false, isEditable: true };
            }
            else if (!isNaN(data[key])) {
                this.headers[key] = { type: 'number', isUnique: false, isHidden: false, isEditable: true  };
            }
            //The regex check for data formats (with built-in validation: 32-13-2023 invalid; 31-01-2023 valid)
            //else if (data[key].test(/(0?[1-9]|[12][0-9]|3[01])-(0?[1-9]|1[0-2])-(\d{4})/)) {
            else if (data[key].match(/^(0?[1-9]|[12][0-9]|3[01])-(0?[1-9]|1[0-2])-(\d{4})$/)) {
                this.headers[key] = { type: 'date', isUnique: false, isHidden: false, isEditable: true  };
            }
            else {
                this.headers[key] = { type: 'string', isUnique: false, isHidden: false, isEditable: true  };
            }
        }
    }

    /**
     * Retrieves the data at the specified index.
     * @param index {number} - The index of the data to retrieve.
     * @returns {Promise<Object> | Object} - The data at the specified index, or a promise that resolves to the data.
     */
    getData(index, noPromise = false) {
        const isValidIndex = this.data && this.data.length > 0 && index < this.data.length;
        index = (index < 0 ? this.data.length + index : index);

        if (index === undefined || index === null || !isValidIndex) {
            console.warn('No data provided, returning empty object');
            if (noPromise) return {};
            return new Promise((resolve, reject) => {
                resolve({});
            });
        }

        if (noPromise) {
            if (!isValidIndex) throw new Error('No data to return (data is empty, or index is out of bounds)');
            const { internal_id, ...data } = this.data[index];
            return data;
        }

        return new Promise((resolve, reject) => {
            if (!isValidIndex) return reject(new Error('No data to return (data is empty, or index is out of bounds)'));
            const { internal_id, ...data } = this.data[index];
            resolve(data);
        });
    }


    getHeader(key) {
        if (!this.headers || Object.keys(this.headers).length === 0) {
            throw new GridError('No headers provided, returning empty object');
        }

        if (key === undefined || key === null) {
            console.warn('No key provided, returning all headers');
            return this.headers;
        }

        if (this.headers[key]) {
            return this.headers[key];
        } else {
            throw new GridError(`Header not found for key: ${key} ${this.headers} ${key}`);
        }
    }

    /**
     * Retrieves all the columns from the data.
     * @returns {string[]|*[]}
     */
    getColumns() {
        if (!this.data || this.data.length === 0) {
            console.warn('No data provided, returning empty array');
            return [];
        }

        return Object.keys(this.data[0]).filter(key => key !== 'internal_id');
    }

    sortData(data, field, direction, typePlugin) {
        const hint = typePlugin?.sortingHint || 'string';

        return [...data].sort((a, b) => {

            const aVal = typePlugin.parseValue(a[field]);
            const bVal = typePlugin.parseValue(b[field]);

            if (hint === 'number') return direction === 'asc' ? aVal - bVal : bVal - aVal;
            if (hint === 'boolean') return direction === 'asc' ? (aVal === bVal ? 0 : aVal ? 1 : -1) : (aVal === bVal ? 0 : aVal ? -1 : 1);
            if (hint === 'string' || hint === 'text') return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            // For date, we assume the values are in a format that can be parsed by Date
            if (hint === 'date') {
                const aDate = new Date(aVal);
                const bDate = new Date(bVal);
                return direction === 'asc' ? aDate - bDate : bDate - aDate;
            }
        });
    }

    query(query = '') {
        if (!this.data || this.data.length === 0) {
            console.warn('No data provided, returning empty array');
            return [];
        }

        if (!query || query === '') {
            console.warn('No query provided, returning all data');
            this.currentQueryStr = '';
            return this.data.map((_, index) => index);
        }

        const parsedQuery = this.QueryParser.parseQuery(query, this.plugins, this.headers);
        return this.#_query(parsedQuery);
    }


    #_query(query) {

        // Early exit if no queries
        if (!query || query.length === 0) {
            this.currentQueryStr = '';
            console.warn('No valid query provided, returning NO data');
            return []
        }

        // Separate queries by type
        const selectQueries = [];
        let sortQuery = null, rangeQuery = null, groupQuery = null, fuzzyQuery = null;;

        // Pre-process queries
        for (const q of query) {
            switch (q.queryType) {
                case 'SELECT': selectQueries.push(q); break;
                case 'SORT': sortQuery = q; break;
                case 'RANGE': rangeQuery = q; break;
                case 'GROUP': groupQuery = q; break;
                case 'FUZZY': fuzzyQuery = q; break;
            }
        }

        // Save the current query string
        this.currentQueryStr = '';
        selectQueries.forEach(q => this.currentQueryStr += q.field + ' ' + q.operator + ' ' + q.value + ' and ');
        if (sortQuery) this.currentQueryStr += 'sort ' + sortQuery.field + ' ' + sortQuery.value + ' and ';
        if (rangeQuery) this.currentQueryStr += 'range ' + rangeQuery.lower + ' ' + rangeQuery.upper + ' and ';
        if (groupQuery) this.currentQueryStr += 'group ' + groupQuery.field + ' and ';
        if (fuzzyQuery) this.currentQueryStr += 'search ' + fuzzyQuery.value + ' and ';
        this.currentQueryStr = this.currentQueryStr.slice(0, -5);

        // let log = "";
        // if (selectQueries.length > 0) log += 'SELECT queries: ' + selectQueries.map(q => q.field + ' ' + q.operator + ' ' + q.value).join(', ') + '\n';
        // if (sortQuery) log += 'SORT query: ' + sortQuery.field + ' ' + sortQuery.value + '\n';
        // if (rangeQuery) log += 'RANGE query: ' + rangeQuery.lower + ' ' + rangeQuery.upper + '\n';
        // if (groupQuery) log += 'GROUP query: ' + groupQuery.field + '\n';
        // log += this.currentQueryStr;

        // Initialize valid indices as all data indices
        let validIndices = new Set(this.data.keys());
        let groupedData = null;

        console.log(selectQueries, sortQuery, rangeQuery, groupQuery, fuzzyQuery);

        // Process SELECT queries
        for (const q of selectQueries) {
            q.field = findMatchingIndexKey(Object.keys(this.data[0]), q.field, this.config);
            const plugin = this.getHeader(q.field)?.plugin || new this.getPlugin(q.type, true);
            if (!plugin) throw new GridError(`No plugin found for header (${q.type}) for key (${q.field})`);

            validIndices = plugin.evaluate(q, this.dataIndexes[q.field], this.data, validIndices);
        }

        // Process RANGE query
        if (rangeQuery) {
            const first = validIndices.values().next().value;
            const lower = rangeQuery.upper < 0 ? this.data.length + rangeQuery.upper : Math.max(0, first + rangeQuery.lower);
            const upper = rangeQuery.upper < 0 ? this.data.length : Math.min(this.data.length - 1, first + rangeQuery.upper - 1);
            validIndices = new Set(Array.from({ length: upper - lower + 1 }, (_, i) => i + lower));
        }

        // Process GROUP query
        if (groupQuery) {
            const groupField = findMatchingIndexKey(Object.keys(this.data[0]), groupQuery.field, this.config);
            groupedData = {};

            // Group rows by the specified field
            for (const index of validIndices) {
                const row = this.data[index];
                const groupKey = row[groupField];
                (groupedData[groupKey] ||= []).push(row.internal_id); // Use nullish coalescing for concise grouping
            }

            // Sort groups if required
            if (sortQuery) {
                console.warn('Sorting grouped data is not yet supported');
            }

            return groupedData;
        }

        // Process Fuzzy search
        if (fuzzyQuery) {
            const lowerSearch = fuzzyQuery.value;
            const allKeys = Object.keys(this.data[0]).filter(k => k !== 'internal_id');
            validIndices = new Set([...validIndices].filter(index => {
                const row = this.data[index];
                return allKeys.some(key =>
                    String(row[key]).toLowerCase().includes(lowerSearch)
                );
            }));
        }

        // Sort if no grouping
        if (sortQuery) {
            //use this.sortData
            const sortedData = this.sortData(
                this.data.filter((_, i) => validIndices.has(i)),
                sortQuery.field,
                sortQuery.value,
                //this.getPlugin(sortQuery.type)
                this.headers[sortQuery.field]?.plugin || new this.getPlugin(sortQuery.type, true)
            );
            return sortedData.map(row => row.internal_id); // Return only internal_ids
        }

        return Array.from(validIndices);
    }

    //================================================== SELECT ==================================================
    addSelect(key, operator, value) {
        if (!key || !operator || value === undefined || value === '') return;

        const newClause = `${key} ${operator} ${value}`;

        if (this.currentQueryStr.length === 0)
            this.currentQueryStr = newClause;
        else
            this.currentQueryStr += ` and ${newClause}`;
    }

    setSelect(key, operator, value) {
        this.removeSelect(key);
        this.addSelect(key, operator, value);
    }

    removeSelect(key, operator, value) {
        let originalQueryStr = this.currentQueryStr;

        if (key !== undefined && operator === undefined && value === undefined) {
            // Remove all clauses with the specified key
            this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith(key)).join(' and ');
        } else if (key !== undefined && operator !== undefined && value === undefined) {
            // Remove all clauses with the specified key and operator
            this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith(`${key} ${operator}`)).join(' and ');
        } else if (key !== undefined && operator !== undefined && value !== undefined) {
            // Remove the specific clause
            const clauseToRemove = `${key} ${operator} ${value}`;
            this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => clause.trim() !== clauseToRemove).join(' and ');
        }

        return originalQueryStr !== this.currentQueryStr;
    }

    //================================================== SORT ==================================================
    setSort(key, direction) {
        if (key === undefined || direction === undefined) {
            this.removeSort();
            return;
        }

        const newClause = `sort ${key} ${direction}`;

        this.removeSort();

        if (this.currentQueryStr.length === 0)
            this.currentQueryStr = newClause;
        else
            this.currentQueryStr += ` and ${newClause}`;
    }

    removeSort() {
        // Remove the sort clause
        this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith('sort')).join(' and ');
    }

    //================================================== RANGE ==================================================
    setRange(lower, upper) {
        if (lower === undefined || upper === undefined) {
            this.removeRange();
            return;
        }

        const newClause = `range ${lower} ${upper}`;

        this.removeRange();

        if (this.currentQueryStr.length === 0)
            this.currentQueryStr = newClause;
        else
            this.currentQueryStr += ` and ${newClause}`;
    }

    removeRange() {
        // Remove the range clause
        this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith('range')).join(' and ');
    }

    //================================================== GROUP ==================================================
    setGroup(key) {
        if (key === undefined){
            this.removeGroup();
            return;
        }

        const newClause = `group ${key}`;

        this.removeGroup();

        if (this.currentQueryStr.length === 0)
            this.currentQueryStr = newClause;
        else
            this.currentQueryStr += ` and ${newClause}`;
    }

    removeGroup() {
        // Remove the group clause
        this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith('group')).join(' and ');
    }

    runCurrentQuery() {
        this.eventEmitter.emit('engine-query-update', this.currentQueryStr);
        return this.query(this.currentQueryStr);
    }

    //================================================== PLUGIN SYSTEM ==================================================
    addPlugin(plugin, dontOverride = false) {
        const testInstance = new plugin();

        if (!(testInstance instanceof BaseTypePlugin)) {
            throw new GridError('Plugin must extend BaseTypePlugin');
        }

        //if already exists, remove it and add the new one, while warning the user
        const existingPlugin = this.getPlugin(testInstance.constructor.name, true);
        if (dontOverride && existingPlugin) return;
        if (existingPlugin && !dontOverride) {
            console.warn('Plugin already exists, removing the old plugin');
            //set the new plugin to have key of the name of the plugin
            this.plugins[testInstance.constructor.name.replace("TypePlugin", "").toLowerCase()] = plugin;
        }
        else {
            this.plugins[testInstance.constructor.name.replace("TypePlugin", "").toLowerCase()] = plugin;
        }
    }

    /**
     * Retrieves a plugin by its name.
     *
     * @param {string} name - The name of the plugin to retrieve.
     * @param {boolean} [justChecking=false] - If true, only checks if the plugin exists without throwing an error.
     * @returns {BaseTypePlugin|boolean} - The plugin if found, or false if not found and justChecking is true.
     * @throws {GridError} - If the plugin name is not provided or the plugin is not found and justChecking is false.
     */
    getPlugin(name, justChecking = false) {
        if (!name) throw new GridError('Plugin name not provided');
        if (typeof name !== 'string') return false;

        var plugin = this.plugins[name.replace("TypePlugin", "")] || this.plugins[this.headers[name]?.type];

        if (!plugin && !justChecking) throw new GridError('Plugin not found for column: ' + name);
        else if (!plugin && justChecking)  return false;

        return plugin;
    }

    generatePluginInstance(name, config = {}) {
        const Plugin = this.getPlugin(name);
        if (!Plugin) throw new GridError('Plugin not found: ' + name);

        // Create a new instance of the plugin
        const pluginInstance = new Plugin(config);
        pluginInstance.name = name;

        return pluginInstance;
    }

    //================================================== EXPORT CONNECTORS ==================================================
    addConnector(Connector, dontOverride = false) {
        if (!(Connector instanceof ExportConnector)) {
            throw new GridError('Connector must extend ExportConnector');
        }

        //if already exists, remove it and add the new one, while warning the user
        const existingConnector = this.getConnector(Connector.name, true);
        if (dontOverride && existingConnector) return;
        if (existingConnector && !dontOverride) {
            console.warn('Connector already exists, removing the old Connector');
            //set the new Connector to have key of the name of the Connector
            this.connectors[Connector.name.replace("ExportConnector", "")] = Connector;
        }
        else {
            this.connectors[Connector.name.replace("ExportConnector", "")] = Connector;
        }
    }

    /**
     * Retrieves a Connector by its name.
     *
     * @param {string} name - The name of the Connector to retrieve.
     * @param {boolean} [justChecking=false] - If true, only checks if the Connector exists without throwing an error.
     * @returns {ExportConnector|boolean} - The Connector if found, or false if not found and justChecking is true.
     * @throws {GridError} - If the Connector name is not provided or the Connector is not found and justChecking is false.
     */
    getConnector(name, justChecking = false) {
        if (!name) throw new GridError('Connector name not provided');
        if (typeof name !== 'string') return false;

        const Connector = this.connectors[name];

        if (!Connector && !justChecking) throw new GridError('Connector not found: ' + name);
        else if (!Connector && justChecking)  return false;


        return Connector;
    }

    destroy() {
        this.data = [];
        this.headers = [];
        this.plugins = [];
        this.connectors = [];
        this.futureQuery = [];
        this.QueryParser = null;
        this.updateTracker = null;
        this.config = {};
        this.APIConnector = null;
        this.eventEmitter.removeAllListeners();
        this.eventEmitter = null;
    }

    //================================================== IMPORT ==================================================
    importData(data, config) {
        if (this.data && this.data.length > 0) {
            throw new GridError('Data already imported, re-importing data is not (yet) supported');
        }

        if (config.type === undefined || config.type === 'object') {
            this.#parseObjectData(data, config);
        }
        else if (config.type === 'json') {
            this.#parseJsonData(data, config);
        } else if (config.type === 'csv') {
            this.#parseCSVData(data, config);
        } else {
            throw new GridError('Invalid data type');
        }

        //if headers are not provided, auto-detect them
        if (Object.keys(this.headers).length === 0) {
            console.warn('No headers provided, auto detecting headers, please provide so the system can you more optimal plugins');
            this.autoDetectHeaders(this.data[0]);
        }
    }

    alterData(datum, column, value) {
        console.log(datum, column, value);
        const oldValue = this.data[datum][column];
        if (this.data && this.data.length > 0) {
            this.data[datum][column] = value;
        }

        //recalculate the data index for the altered row
        if (this.dataIndexes && this.dataIndexes[column]) {

            if (this.dataIndexes[column].has(oldValue)) {
                this.dataIndexes[column].get(oldValue).delete(datum);
            }
            if (!this.dataIndexes[column].has(value)) {
                this.dataIndexes[column].set(value, new Set());
            }
            this.dataIndexes[column].get(value).add(datum);
        }

        //remove the previous data index for the altered row
    }


    #parseObjectData(data, config) {
        if (!(typeof data === 'object')) {
            throw new GridError('Data must be an object (parsed JSON)');
        }

        if (!Array.isArray(data)) {
            throw new GridError('Data must be an array');
        }

        if (data.length === 0) {
            console.warn('No data provided');
            return [];
        }

        this.data = data.map((item, index) => {
            const newItem = {};
            newItem['internal_id'] = index;
            for (const key of Object.keys(item)) {
                newItem[key] = item[key];
            }
            return newItem;
        });
    }

    #parseJsonData(data, config) {
        if (!(typeof data === 'string') && !(typeof data === 'object')) {
            throw new GridError('Data must be a string (raw JSON) OR an object (parsed JSON)');
        }

        data = typeof data === 'string' ? JSON.parse(data) : data;

        if (!Array.isArray(data)) {
            throw new GridError('Data must be an array');
        }

        if (data.length === 0) {
            console.warn('No data provided');
            return [];
        }

        this.data = data.map((item, index) => {
            const newItem = {};
            newItem['internal_id'] = index
            for (const key of Object.keys(item)) {
                newItem[key] = item[key];
            }
            return newItem;
        });
    }

    #parseCSVData(data, config) {
        const lines = data.split('\n');
        //split by the config.delimiter character, but only if it's not inside quotes
        const headers = lines[0].split(",").map(header => header.replace(/"/g, '').replace(" ", "_").replace("\r", ''));
        // console.log(headers);
        this.data = lines.slice(1).map((line, index) => {
            const values = line.split(/(?!"[a-zA-z0-9\s.()]*)(?:,|,"|",)(?![a-zA-z0-9\s.()]*")/mgi);
            const newItem = {};
            newItem['internal_id'] = index;
            headers.forEach((header, i) => {
                if (typeof values[i] === 'string')
                    values[i].endsWith('"') ? values[i] = values[i].slice(0, -1) : values[i];
                newItem[header] = values[i];
            });
            return newItem;
        })
        .slice(0, -1);
    }

    //=================================================== EXPORT ==================================================
    /**
     * Request and handle an export in the specified file type
     * @param {string} fileName - The name for the exported file
     * @param {string} fileType - The type of file to export (e.g., 'csv', 'xlsx')
     */
    async requestExport(fileName, fileType) {
        const Connector = this.getConnector(fileType);
        if (!Connector) {
            console.error('Connector not found: ' + fileType);
            return;
        }

        try {
            //export the data without the internal_id
            const exportResult = await Connector.smartExport(this.data.map(row => {
                const newRow = {};
                Object.keys(row).forEach(key => {
                    if (key !== 'internal_id') {
                        newRow[key] = row[key];
                    }
                });
                return newRow;
            }), this.headers, fileName);

            if (!exportResult) {
                console.warn('No data returned for export');
                return;
            }

            // Create a blob using the returned data
            const blob = new Blob([exportResult], {type: Connector.mimeType});

            // Create a download link and trigger it
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName || 'export'}.${Connector.extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error.message)
            alert('Export failed. See console for details.');
            return false;
        }

        return true;
    }

    getExportConnectors = () => Object.keys(this.connectors);
}

// DynamicGrid\DynamicGrid.js
/**
 * DynamicGrid is a library for rendering data in a grid format with dynamic querying capabilities.
 * @author Matt ter Steege (Kronk)
 * @license MIT
 */
// @requires ./exportConnectors/InherentExportConnector.js
// @requires ./DynamicGridUI.js
// @requires ./libs/EventEmitter.js
// @requires ./libs/KeyboardShortcuts.js
// @requires ./SJQLEngine.js
// @requires ./typePlugins/BooleanTypePlugin.js
// @requires ./typePlugins/DateTypePlugin.js
// @requires ./typePlugins/EmailTypePlugin.js
// @requires ./typePlugins/EnumTypePlugin.js
// @requires ./typePlugins/NumberTypePlugin.js
// @requires ./typePlugins/PhoneNumberTypePlugin.js
// @requires ./typePlugins/StringTypePlugin.js

class DynamicGrid {
    constructor(config) {
        // Initialize the event emitter
        this.eventEmitter = new EventEmitter();
        this.keyboardShortcuts = new KeyboardShortcuts();

        this.engine = new SJQLEngine(config.engine || {}, this.eventEmitter);
        // Initialize plugins
        this.engine.plugins = config.plugins ?? [];
        this.engine.addPlugin(StringTypePlugin, true);
        this.engine.addPlugin(NumberTypePlugin, true);
        this.engine.addPlugin(BooleanTypePlugin, true);
        this.engine.addPlugin(DateTypePlugin, true);
        this.engine.addPlugin(EmailTypePlugin, true);
        this.engine.addPlugin(EnumTypePlugin, true);
        this.engine.addPlugin(PhoneNumberTypePlugin, true);

        this.engine.connectors = config.connectors || [];
        this.engine.addConnector(new CSVExportConnector(), true);
        this.engine.addConnector(new XLSXExportConnector(), true);
        this.engine.addConnector(new JSONExportConnector(), true);
        this.engine.addConnector(new XMLExportConnector(), true);
        this.engine.addConnector(new HTMLExportConnector(), true);
        this.engine.addConnector(new TXTExportConnector(), true);


        // Set up headers
        if (config.headers) {
            Object.entries(config.headers).forEach(([key, value]) => {
                this.engine.headers[key] = {
                    // Core type system properties
                    name: value.name || key, // Use key as default name if not provided
                    type: value.type, // Default type is string
                    //plugin: this.engine.getPlugin(value.type) || null, // Get the plugin for the type

                    config: {
                        isUnique: value.isUnique || false,                                      //Default isUnique to false
                        isEditable: value.isEditable === undefined ? true : value.isEditable,   // Default isEditable to true
                        isGroupable: value.isGroupable === undefined ? true : value.isGroupable,// Default isGroupable to true
                        isSortable: value.isSortable === undefined ? true : value.isSortable,   // Default isSortable to true
                        spellCheck: value.spellCheck || false,                                  // Default spellCheck to false

                        // Styling
                        cellClass: value.cellClass || '',                                       // CSS class for cell
                        headerClass: value.headerClass || '',                                   // CSS class for header
                        cellStyle: value.cellStyle || {},                                       // Inline styles for cell

                        // Column sizing
                        width: value.width || 100,                                              // Default width in pixels
                        minWidth: value.minWidth || 0,                                          // Minimum width when resizing
                        maxWidth: value.maxWidth || 10000,                                      // Maximum width when resizing
                        resizable: value.resizable === undefined ? true : value.resizable,      // Default resizable to true

                        // Cell behavior
                        cellValueValidator: value.cellValueValidator || ((val) => { return {valid: true, message: ''}}),// Function to validate the cell value
                    },

                    options: value.options || {}, // Additional options for the header
                };

                this.engine.headers[key].plugin = this.engine.generatePluginInstance(value.type, this.engine.headers[key].options || {});
                this.engine.headers[key].plugin.operators = ['==', '!=', ...this.engine.headers[key].plugin.operators]; // Ensure basic equality operators are always available
            });
        }

        // Set up UI
        this.virtualScrolling = config.ui.virtualScrolling ?? true; // Enable virtual scrolling
        this.rowHeight = config.ui.rowHeight || 40; // Default row height in pixels
        this.visibleRows = config.ui.visibleRows || 20; // Number of rows to render at once
        this.ui = new DynamicGridUI(this, config.ui, this.eventEmitter);

        //SETUP update tracker fully
        this.keyboardShortcuts.addShortcut('ctrl+s', 'Shortcut to save the changed data', () => {
            this.eventEmitter.emit('save-changes-requested', {
                data: this.engine.updateTracker.updates,
                updateSuccess: () => this.engine.updateTracker.clear()
            });
        });

        this.eventEmitter.emit('grid-initialized', { config });
    }


    /**
     * Imports data into the engine and creates a data index.
     * @param {string|object} data - The data to import.
     * @param {Object} [config] - The configuration for importing data.
     */
    importData(data, config) {
        this.engine.importData(data, config);
        this.engine.createDataIndex();
        this.eventEmitter.emit('grid-data-imported', { data, config });
    }

    /**
     * Renders the UI based on the provided input.
     * @param {string} input - A query string or data object to render the UI.
     */
    render(input) {
        this.eventEmitter.emit('ui-render-start', { input });
        this.ui.render(this.engine.query(input));
        this.eventEmitter.emit('ui-render-end', { input });
    }

    /**
     * Renders the UI with the provided data. This method does not run any queries, so the data must be pre-processed already.
     * @param {object} input - The data to render.
     */
    renderRaw(input) {
        this.ui.render(input);
        this.eventEmitter.emit('ui-raw-rendered', { input });
    }

    //============================ SORTING, FILTERING, GROUPING, RANGE ============================
    /**
     * Adds a selection filter to the data.
     * @param {string} key - The key to filter by.
     * @param {string} operator - The operator to use for filtering.
     * @param {*} value - The value to filter by.
     */
    addSelect = (key, operator, value) => this.engine.addSelect(key, operator, value);

    /**
     * Sets a selection filter on the data. (This will override any existing filter for the same key.)
     * @param {string} key - The key to filter by.
     * @param {string} operator - The operator to use for filtering.
     * @param {*} value - The value to filter by.
     */
    setSelect = (key, operator, value) => this.engine.setSelect(key, operator, value);

    /**
     * Removes a selection filter from the data.
     * @param {string} key - The key to filter by.
     * @param {string} [operator] - The operator used for filtering.
     * @param {*} [value] - The value to filter by.
     */
    removeSelect = (key, operator, value) => this.engine.removeSelect(key, operator, value);

    /**
     * Sets the sort order for the data.
     * @param {string} key - The key to sort by.
     * @param {'asc'|'desc'} direction - The direction to sort.
     */
    setSort = (key, direction) => this.engine.setSort(key, direction);

    /**
     * Removes the sort order from the data.
     */
    removeSort = () => this.engine.removeSort();

    /**
     * Sets a range filter on the data.
     * @param {number} lower - The lower bound of the range.
     * @param {number} upper - The upper bound of the range.
     */
    setRange = (lower, upper) => this.engine.setRange(lower, upper);

    /**
     * Removes the range filter from the data.
     */
    removeRange = () => this.engine.removeRange();

    /**
     * Groups the data by the specified key.
     * @param {string} key - The key to group by.
     */
    setGroup = (key) => this.engine.setGroup(key);

    /**
     * Removes the grouping from the data.
     */
    removeGroup = () => this.engine.removeGroup();

    /**
     * Runs the current query and updates the grid.
     * @returns {*} - The result of the query.
     */
    runCurrentQuery = () => this.engine.runCurrentQuery();

    /**
     * Exports the current data in the specified format.
     * @param {string} [filename] - The name of the file to save.
     * @param {string} format - The format to export the data in. (optional if filename has extension)
     * @returns {void} - Results in an file download.
     */
    exportData = (filename, format) =>
        !format && filename && filename.includes('.')
            ? this.engine.requestExport(filename.split('.')[0], filename.split('.')[1])
            : this.engine.requestExport(filename, format);

    /**
     * Gets all export connectors.
     * @returns {Array<string>} - An array of all exportable formats.
     */
    get exportableFileFormats () {return this.engine.getExportConnectors();}

    /**
     * Subscribes to an event.
     * @param {string} eventName - The name of the event to subscribe to.
     * @param {Function} callback - The function to call when the event is triggered.
     */
    on = (eventName, callback) => this.eventEmitter.on(eventName, callback);
    subscribe = (eventName, callback) => this.eventEmitter.on(eventName, callback);

    /**
     * Unsubscribes from an event.
     * @param {string} eventName - The name of the event to unsubscribe from.
     * @param {Function} callback - The function to remove from the event listeners.
     */
    off = (eventName, callback) => this.eventEmitter.off(eventName, callback);
    unsubscribe = (eventName, callback) => this.eventEmitter.off(eventName, callback);

    /**
     * cleans up the grid and removes all event listeners.
     */
    destroy() {
        this.eventEmitter.removeAllListeners();
        this.ui.destroy();
        this.engine.destroy();
        this.keyboardShortcuts.destroy();
        this.eventEmitter = null;
        this.ui = null;
        this.engine = null;
        this.keyboardShortcuts = null;
    }
}


