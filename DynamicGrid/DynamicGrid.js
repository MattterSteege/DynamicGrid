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
// @requires ./typePlugins/ButtonTypePlugin.js

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
        this.engine.addPlugin(ButtonTypePlugin, true);

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
                        cellValueValidator: value.cellValueValidator || undefined,// Function to validate the cell value
                        cellValueFormatter: value.cellValueFormatter || undefined, // Function to format the cell value for display
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
