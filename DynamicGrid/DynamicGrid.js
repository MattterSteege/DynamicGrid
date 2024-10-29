// Table component (basic implementation)
class DynamicGrid {
    constructor(data) {
        this.engine = new SJQLEngine(this);

        //initialize the header types
        Object.entries(data.headers ?? {}).forEach(([key, value]) => {
            this.engine.headers[key] = value.toLowerCase();
        });




        //PLUGIN SYSTEM
        this.engine.plugins = data.plugins ?? [];

        this.engine.addPlugin(new stringTypePlugin(), true);
        this.engine.addPlugin(new numberTypePlugin(), true);
        this.engine.addPlugin(new booleanTypePlugin(), true);

    }

    //DATA SYSTEM
    setData(data) {
        this.engine.data = this.engine.parseData(data);
    }

    setHeaderTypes(headers) {
        Object.entries(headers).forEach(([key, value]) => {
            this.engine.headers[key] = value.toLowerCase();
        });
    }
    //END DATA SYSTEM

    //RENDERING SYSTEM
    render() {
        this.renderHeader();
    }

    renderHeader() {
        const header = document.createElement('tr');
        Object.entries(table.engine.headers).forEach(([key, value]) => {
            header.append(this.engine.getPlugin(value).renderHeader(key));
        });
        document.getElementById('table').appendChild(header);
    }
}