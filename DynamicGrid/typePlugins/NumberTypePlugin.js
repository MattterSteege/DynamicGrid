class NumberTypePlugin extends BaseTypePlugin {
    constructor() {
        super();
        this.operators = ['==', '!=', '>', '<', '>=', '<='];
        this.sortingHint = 'number';
    }

    validate(value) {
        return !isNaN(value);
    }

    parseValue(value) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
    }

    evaluateCondition(dataValue, operator, compareValue) {
        switch (operator) {
            case '==': return dataValue === compareValue;
            case '!=': return dataValue !== compareValue;
            case '>':  return dataValue > compareValue;
            case '<':  return dataValue < compareValue;
            case '>=': return dataValue >= compareValue;
            case '<=': return dataValue <= compareValue;
            default:   return false;
        }
    }

    getInputComponent(currentValue, onChange) {
        const input = document.createElement('input');
        input.type = 'number';
        input.value = currentValue ?? '';
        input.addEventListener('input', () => onChange(parseFloat(input.value)));
        return input;
    }
}
