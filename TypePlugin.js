class TypePlugin {
    constructor() {
        this.name = this.constructor.name;
    }

    // These methods are only used by the parent class


    // These methods should be overridden by the child class
    getHeaderFormat(value) {
        value.toString();
    }

    validate(value) {
        return true;
    }
}