// Table component (basic implementation)
class DynamicGrid {
    constructor() {
        this.engine = new SJQLEngine(this);
        this.plugins = [];
        this.currentQuery = {};

        //PLUGIN SYSTEM
        this.addPlugin(new stringTypePlugin());
        this.addPlugin(new numberTypePlugin());
        this.addPlugin(new dateTypePlugin());

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

    getPlugin(name) {
        if (!name.endsWith('TypePlugin')) {
            name = name + 'TypePlugin';
        }

        const plugin = this.plugins.find(plugin => plugin.name === name);

        if (!plugin) {
            throw new Error('Plugin not found');
        }

        return plugin;
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