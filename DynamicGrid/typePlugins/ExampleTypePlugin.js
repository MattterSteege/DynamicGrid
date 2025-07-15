// @requires ./BaseTypePlugin.js

class ExampleTypePlugin extends BaseTypePlugin {
    constructor() {
        super();
        this.sortingHint = 'boolean';
    }

    validate(value) {
        return true
    }

    parseValue(value) {
        return true;
    }

    getInputComponent(currentValue, onChange) {
        const input = document.createElement('input');
        input.type = '';
        input.name = '_'
        input.value = this.parseValue(currentValue);
        input.addEventListener('change', () => onChange(input.value));
        return input;
    }

    getContextMenuItems(columnName, engine, ui) {
        return []
    }

    evaluateCondition(dataValue, operator, compareValue) {
        return undefined;
    }

    sortData(data, order = 'asc') {
        return [];
    }
}