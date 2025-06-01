/**
 * DynamicGrid is a library for rendering data in a grid format with dynamic querying capabilities.
 * @license MIT
 */

class DynamicGrid {
    constructor(config) {
        // Initialize the event emitter
        this.eventEmitter = new EventEmitter();
        this.keyboardShortcuts = new KeyboardShortcuts();

        // Initialize the query engine
        this.engine = new SJQLEngine(config.engine || {}, this.eventEmitter);
        // Initialize plugins
        this.engine.plugins = config.plugins ?? [];
        this.engine.addPlugin(new stringTypePlugin, true);
        this.engine.addPlugin(new numberTypePlugin, true);
        this.engine.addPlugin(new booleanTypePlugin, true);
        this.engine.addPlugin(new dateTypePlugin, true);

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

                if (typeof value === 'string') {
                    this.engine.headers[key] = { type: value, isUnique: false, isGroupable: true, isHidden: false, isEditable: true };
                }
                else {
                    this.engine.headers[key] = {
                        type: value.type || key,
                        isUnique: value.isUnique || false,
                        isGroupable: value.isGroupable  === undefined ? true : value.isGroupable,
                        isHidden: value.isHidden || false,
                        isEditable: value.isEditable === undefined ? true : value.isEditable,
                    };
                }
            });
        }

        // Set up UI
        this.virtualScrolling = config.ui.virtualScrolling ?? true; // Enable virtual scrolling
        this.rowHeight = config.ui.rowHeight || 40; // Default row height in pixels
        this.visibleRows = config.ui.visibleRows || 20; // Number of rows to render at once
        this.ui = new DynamicGridUI(this, config.ui, this.eventEmitter);

        // Set up **possible** API connector
        if (config.APIConnector && config.APIConnector.connector) {
            const APIconfig = config.APIConnector;
            this.APIConnector = new config.APIConnector.connector(this, APIconfig);
            delete APIconfig.connector;

            this.APIConnector.fetchData().then((data) => {
                this.importData(data, { type: 'json' });
                this.render();
            });
        }

        this.eventEmitter.emit('grid-initialized', { config });
    }


    /**
     * Imports data into the engine and creates a data index.
     * @param {string|object} data - The data to import.
     * @param {Object} [config] - The configuration for importing data.
     * @preserve
     */
    importData(data, config) {
        this.engine.importData(data, config);
        this.engine.createDataIndex();
        this.eventEmitter.emit('grid-data-imported', { data, config });
    }

    /**
     * Renders the UI based on the provided input.
     * @param {string} input - A query string or data object to render the UI.
     * @preserve
     */
    render(input) {
        this.eventEmitter.emit('ui-render-start', { input });
        this.ui.render(this.engine.query(input));
        this.eventEmitter.emit('ui-render-end', { input });
    }

    /**
     * Renders the UI with the provided data. This method does not run any queries, so the data must be pre-processed already.
     * @param {object} input - The data to render.
     * @preserve
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
}
