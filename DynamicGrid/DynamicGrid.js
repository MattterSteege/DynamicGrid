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

    }

    renderHeader() {
        console.log(this.engine.headers);
    }
}