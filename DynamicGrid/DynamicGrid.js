class DynamicGrid {
    constructor(config) {
        // Initialize the query engine
        this.engine = new SJQLEngine(this);
        this.ui = new DynamicGridUI(this, config.containerId);

        // Set up headers
        if (config.headers) {
            Object.entries(config.headers).forEach(([key, value]) => {
                this.engine.headers[key] = value.toLowerCase();
            });
        }

        // Initialize plugins
        this.engine.plugins = config.plugins ?? [];
        this.engine.addPlugin(new stringTypePlugin, true);
        this.engine.addPlugin(new numberTypePlugin, true);
        this.engine.addPlugin(new booleanTypePlugin, true);
    }



    // Set or update data
    setData(data) {
        this.engine.data = this.engine.parseData(data);
    }

    // Set or update header types
    setHeaderTypes(headers) {
        Object.entries(headers).forEach(([key, value]) => {
            this.engine.headers[key] = value.toLowerCase();
        });
    }

    //wrapper methods
    render = () => {
        console.time('render');
        this.ui.render(this.engine.query());
        console.timeEnd('render');
    }
    //query the data and render the results
    query = (query) => {
        console.time('query');
        this.ui.render(this.engine.query(query));
        console.timeEnd('query');
    }
}