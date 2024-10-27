class TypePlugin {
    constructor() {
        this.name = this.constructor.name;

        this.operators = [
            { name: 'eq', operator: '==' },   // Equals
            { name: 'neq', operator: '!=' },  // Not equals
            { name: 'em', operator: '""' },   // Is empty (double quotes to indicate empty)
            { name: 'nem', operator: '!""' }  // Is not empty
        ];
    }

    // These methods should be overridden by the child class
    getJSQLFormat(value) {
        console.warn("getHeaderFormat not implemented for plugin: ", this.name);
        return value.toString();
    }

    //check if the value is valid for the plugin
    validate(value) {
        console.warn("validate not implemented for plugin: ", this.name);
        return true;
    }

    //evaluate the query based on a row of data
    evaluate(query, data) {
        console.warn("evaluate not implemented for plugin: ", this.name);
        return data;
    }

    //================================================== OPERATOR SYSTEM ==================================================
    getOperator(operatorOrName) {
        try {
            return this.operators.find(op => op.name === operatorOrName || op.operator === operatorOrName);
        }
        catch (e) {
            console.error(e);
            return undefined;
        }
    }
    getOperatorSymbols = () => this.operators.map(op => op.operator);
    getOperatorNames = () => this.operators.map(op => op.name);

    //================================================== RENDERING SYSTEM ==================================================
    renderHeader(key) {
        console.warn("renderHeader not implemented for plugin: ", this.name);
        const elem = document.createElement('th');
        elem.innerHTML = key;
        return elem;
    }
}