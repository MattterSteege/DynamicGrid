class TypePlugin {
    constructor() {
        this.name = this.constructor.name;
    }

    // These methods should be overridden by the child class
    getJSQLFormat(value) {
        console.warn("getHeaderFormat not implemented for plugin: ", this.name);
        value.toString();
    }

    validate(value) {
        console.warn("validate not implemented for plugin: ", this.name);
        return true;
    }

    evaluate(query, data) {
        console.warn("evaluate not implemented for plugin: ", this.name);
        return data;
    }
}