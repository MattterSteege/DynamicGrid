/**
 * DynamicGrid is a library for rendering data in a grid format with dynamic querying capabilities.
 * @license MIT
 */

class DynamicGrid {
    constructor(config) {

        // Initialize the query engine
        this.engine = new SJQLEngine(config.engine || {});
        // Initialize plugins
        this.engine.plugins = config.plugins ?? [];
        this.engine.addPlugin(new stringTypePlugin, true);
        this.engine.addPlugin(new numberTypePlugin, true);
        this.engine.addPlugin(new booleanTypePlugin, true);

        // Set up headers
        if (config.headers) {
            Object.entries(config.headers).forEach(([key, value]) => {
                this.engine.headers[key] = value.toLowerCase();
            });
        }

        // Set up UI
        this.virtualScrolling = config.ui.virtualScrolling ?? true; // Enable virtual scrolling
        this.rowHeight = config.ui.rowHeight || 40; // Default row height in pixels
        this.visibleRows = config.ui.visibleRows || 20; // Number of rows to render at once
        this.ui = new DynamicGridUI(this, config.ui);
    }


    /**
     * Imports data into the engine and creates a data index.
     * @param {Array} data - The data to import.
     * @param {Object} config - The configuration for importing data.
     * @preserve
     */
    importData(data, config) {
        this.engine.importData(data, config);
        this.engine.createDataIndex();
    }

    /**
     * Renders the UI based on the provided query.
     * @param {string} query - The query to render the data.
     * @preserve
     */
    render(query) {
        this.ui.render(this.engine.query(query));
    }

    /**
     * Sorts the data by the specified key and direction.
     * @param {string} key - The key to sort by.
     * @param {string} direction - The direction to sort ('asc' or 'desc').
     * @preserve
     */
    sort = (key, direction) => this.engine.sort(key, direction);

    /**
     * Groups the data by the specified key.
     * @param {string} key - The key to group by.
     * @preserve
     */
    groupBy = key => this.engine.groupBy(key);

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
     * @param {string} operator - The operator used for filtering.
     * @param {*} value - The value to filter by.
     * @preserve
     */
    removeSelect = (key, operator, value) => this.engine.removeSelect(key, operator, value);

    /**
     * Runs all the selection filters on the data.
     * @preserve
     */
    runSelects = () => this.engine.runSelects();
}