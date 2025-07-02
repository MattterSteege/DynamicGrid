class DateTypePlugin extends BaseTypePlugin {
    constructor() {
        super();
        this.sortingHint = 'date';
    }

    validate(value) {
        return !isNaN(Date.parse(value));
    }

    parseValue(value) {
        return new Date(value);
    }

    getInputComponent(currentValue, onChange) {
        const input = document.createElement('input');
        input.type = 'date';
        input.value = currentValue ? new Date(currentValue).toISOString().split('T')[0] : '';
        input.addEventListener('change', () => onChange(input.value));
        return input;
    }
}