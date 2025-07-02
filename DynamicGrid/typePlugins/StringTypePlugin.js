class StringTypePlugin extends BaseTypePlugin {
    constructor() {
        super();
        this.operators = ['==', '!=', '*='];
        this.sortingHint = 'string';
    }

    validate(value) {
        return typeof value === 'string';
    }

    parseValue(value) {
        return value == null ? '' : String(value);
    }

    evaluateCondition(dataValue, operator, compareValue) {
        switch (operator) {
            case '==': return dataValue === compareValue;
            case '!=': return dataValue !== compareValue;
            case '*=': return dataValue.includes(compareValue);
            default: return false;
        }
    }
}