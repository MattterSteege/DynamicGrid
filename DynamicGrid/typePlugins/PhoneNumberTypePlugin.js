// @requires ./BaseTypePlugin.js

class PhoneNumberTypePlugin extends BaseTypePlugin {
    constructor() {
        super();
        this.operators = ['%=', '=%', '*=', '!*=', '==', '!='];
        this.sortingHint = 'string';
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
            case '==':  return dataValue === compareValue;
            case '!=':  return dataValue !== compareValue;
            case '%=':  return String(dataValue).startsWith(compareValue);
            case '=%':  return String(dataValue).endsWith(compareValue);
            case '*=':  return String(dataValue).includes(compareValue);
            case '!*=': return !String(dataValue).includes(compareValue);
            default: return false;
        }
    }

    getInputComponent(currentValue, onChange) {
        const input = document.createElement('input');
        input.type = 'tel';
        input.name = '_'
        input.pattern = '\\+((?:9[679]|8[035789]|6[789]|5[90]|42|3[578]|2[1-689])|9[0-58]|8[1246]|6[0-6]|5[1-8]|4[013-9]|3[0-469]|2[70]|7|1)(?:\\W*\\d){0,13}\\d';
        input.value = currentValue ?? '';
        input.addEventListener('input', () => onChange(input.value));
        return input;
    }
}
