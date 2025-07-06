class StringTypePlugin extends BaseTypePlugin {
    constructor() {
        super();
        this.operators = ['%=', '=%', '*=', '!*='];
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
            case '%=':  return String(dataValue).startsWith(compareValue);
            case '=%':  return String(dataValue).endsWith(compareValue);
            case '*=':  return String(dataValue).includes(compareValue);
            case '!*=': return !String(dataValue).includes(compareValue);
            default: return false;
        }
    }

    getContextMenuItems(columnName, engine, ui) {
        return [
            {
                type: 'filter',
                label: 'Filter',
                operators: this.operators
            },
            {
                type: 'sort',
                label: 'Sort',
                sortingHint: this.sortingHint
            }
        ];
    }
}