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

        // Set up headers
        if (config.headers) {
            Object.entries(config.headers).forEach(([key, value]) => {

                if (typeof value === 'string') {
                    this.engine.headers[key] = { type: value, isUnique: false, isHidden: false, isEditable: true };
                }
                else {
                    this.engine.headers[key] = {
                        type: value.type || key,
                        isUnique: value.isUnique || false,
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
            this.APIConnector = new config.APIConnector.connector(this, this.eventEmitter, APIconfig);
            delete APIconfig.connector;
        }
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
    }

    /**
     * Renders the UI based on the provided input.
     * @param {string} input - A query string or data object to render the UI.
     * @preserve
     */
    render(input) {
        this.ui.render(this.engine.query(input));
    }

    /**
     * Renders the UI with the provided data. This method does not run any queries, so the data must be pre-processed already.
     * @param {object} input - The data to render.
     * @preserve
     */
    renderRaw(input) {
        this.ui.render(input);
    }

    /**
     * Sorts the data by the specified key and direction.
     * @param {string} key - The key to sort by.
     * @param {'asc'|'desc'} direction - The direction to sort.
     * @preserve
     */
    sort = (key, direction) => {
        this.engine.sort(key, direction);
    }

    /**
     * Groups the data by the specified key.
     * @param {string} [key] - The key to group by.
     * @preserve
     */
    groupBy = key => {
        this.engine.groupBy(key);
    }

    /**
     * Adds a selection filter to the data.
     * @param {string} key - The key to filter by.
     * @param {string} operator - The operator to use for filtering.
     * @param {*} value - The value to filter by.
     * @preserve
     */
    addSelect = (key, operator, value) => this.engine.addSelect(key, operator, value);


    /**
     * Removes a selection filter from the data.
     * @param {string} key - The key to filter by.
     * @param {string} [operator] - The operator used for filtering.
     * @param {*} [value] - The value to filter by.
     * @preserve
     */
    removeSelect = (key, operator, value) => this.engine.removeSelect(key, operator, value);


    /**
     * Runs all the selection filters on the data.
     * @preserve
     */
    runSelect = () => {
        this.engine.runSelect();
    }

    addConnector(connector){
        connector.callbacks = {

        }
    }
}