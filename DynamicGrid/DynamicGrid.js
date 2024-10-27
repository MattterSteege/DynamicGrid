// Table component (basic implementation)
class DynamicGrid {
    constructor() {
        this.engine = new SJQLEngine(this);

        //PLUGIN SYSTEM
        this.engine.addPlugin(new stringTypePlugin());
        this.engine.addPlugin(new numberTypePlugin());
        this.engine.addPlugin(new dateTypePlugin());
        this.engine.addPlugin(new booleanTypePlugin());
    }

    //DATA SYSTEM
    setData(data) {
        this.engine.data = this.engine.parseData(data);
    }

    setHeaderTypes(headers) {
        this.engine.headers = headers;
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