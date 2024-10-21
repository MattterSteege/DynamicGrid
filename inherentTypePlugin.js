class stringTypePlugin extends TypePlugin {
    constructor() {
        super();
    }

    validate(value) {
        return typeof value === 'string';
    }

    getHeaderFormat(value) {
        //remove first and last character (only if they are both quotes)
        if ((value[0] === '"' && value[value.length - 1] === '"') || (value[0] === "'" && value[value.length - 1] === "'")) {
            return value.substring(1, value.length - 1);
        }
    }
}

class numberTypePlugin extends TypePlugin {
    constructor() {
        super();
    }

    validate(value) {
        return !isNaN(Number(value));
    }

    getHeaderFormat(value) {
        if (isNaN(Number(value))) {
            throw new Error('Value is not a number');
        }

        return Number(value);
    }
}