import { SJQLEngine } from './SJQLEngine.js';
import { stringTypePlugin } from './InherentTypePlugin.js';
import { numberTypePlugin } from './InherentTypePlugin.js';
import { booleanTypePlugin } from './InherentTypePlugin.js';

// Table component (basic implementation)
export class DynamicGrid {
    constructor() {
        this.engine = new SJQLEngine(this);

        //PLUGIN SYSTEM
        this.engine.addPlugin(new stringTypePlugin());
        this.engine.addPlugin(new numberTypePlugin());
        this.engine.addPlugin(new booleanTypePlugin());
    }

    //DATA SYSTEM
    setData(data) {
        this.engine.data = this.engine.parseData(data);
    }

    setHeaderTypes(headers) {
        //Array.from(headers).forEach(header => {
        //    const [key, type] = header.split(':');
        //    this.engine.headers[key] = type;
        //});
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