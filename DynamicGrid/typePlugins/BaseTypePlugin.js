class BaseTypePlugin {
    constructor() {
        if (this.constructor === BaseTypePlugin) {
            throw new Error("BaseTypePlugin is abstract");
        }

        this.operators = ['==', '!='];
        this.sortingHint = 'string'; // of 'number', 'boolean', etc.
    }

    validate(value) {
        throw new Error("validate must be implemented");
    }

    parseValue(value) {
        throw new Error("parseValue must be implemented");
    }

    evaluateCondition(dataValue, operator, compareValue) {
        switch (operator) {
            case '==': return dataValue === compareValue;
            case '!=': return dataValue !== compareValue;
            default: return false;
        }
    }

    evaluate(query, dataIndexes, data, indices) {
        const { field, operator, value } = query;
        const parsedValue = this.parseValue(value);

        const match = (dataVal) => {
            const parsed = this.parseValue(dataVal);
            return this.evaluateCondition(parsed, operator, parsedValue);
        };

        if (dataIndexes && indices && dataIndexes.size <= indices.size) {
            for (const index of dataIndexes.keys()) {
                if (!match(index)) {
                    dataIndexes.get(index).forEach(i => indices.delete(i));
                }
            }
        } else {
            for (const index of indices) {
                if (!match(data[index][field])) {
                    indices.delete(index);
                }
            }
        }

        return indices;
    }
}
