class DynamicGrid {
    constructor(config) {

        // Initialize the query engine
        this.engine = new SJQLEngine(config.engine);
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
        this.queryCache = new Map(); // Cache for query results
        this.ui = new DynamicGridUI(this, config.ui);
    }

    // Set or update data
    setData(data) {
        this.queryCache.clear(); // Clear cache when new data is set
        this.engine.parseData(data);
        this.engine.createDataIndex();
    }

    //wrapper methods
    render(query) {
        console.time('render');
        this.ui.render(this.engine.query(query));
        console.timeEnd('render');
    }
}