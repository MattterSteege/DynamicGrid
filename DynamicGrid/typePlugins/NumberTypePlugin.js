class NumberTypePlugin extends BaseTypePlugin {
    constructor() {
        super();
        this.operators = ['>', '<', '>=', '<='];
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
        input.type = 'text';
        input.name = '_'
        input.pattern = '\d*'; // Allows only numeric input on mobile devices
        input.value = currentValue ?? '';
        input.addEventListener('input', () => onChange(parseFloat(input.value)));
        return input;
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
            },
            {
                type: 'action',
                label: 'Calculate Stats',
                action: () => this.calculateStats(columnName)
            }
        ];
    }

    calculateStats(columnName) {
        // Plugin-specific implementation
    }
}
