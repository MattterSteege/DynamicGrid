// Table component (basic implementation)
class DynamicGrid {
    constructor() {
        this.engine = new SJQLEngine(this);
        this.plugins = [];
        this.currentQuery = {};

        //PLUGIN SYSTEM
        this.addPlugin(new stringTypePlugin());
        this.addPlugin(new numberTypePlugin());

        //CONSTANTS
        this.constants = new DynamicGridConstants();
    }

    //PLUGIN SYSTEM
    addPlugin(plugin) {
        if (!(plugin instanceof TypePlugin)) {
            throw new Error('Plugin must extend TypePlugin');
        }

        this.plugins.push(plugin);
        this.engine.plugins = this.plugins;
    }
    //END PLUGIN SYSTEM

    //DATA SYSTEM
    setData(data) {
        this.engine.data = this.engine.parseData(data);
    }

    setHeaderTypes(headers) {
        this.engine.headers = headers;
    }
    //END DATA SYSTEM
}