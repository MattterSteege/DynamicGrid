class BooleanTypePlugin extends BaseTypePlugin {
    constructor() {
        super();
        this.sortingHint = 'boolean';
    }

    validate(value) {
        return [true, false, 'true', 'false', 1, 0, '1', '0'].includes(value);
    }

    parseValue(value) {
        return value === true || value === 'true' || value === 1 || value === '1';
    }

    getInputComponent(currentValue, onChange) {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = '_'
        input.checked = this.parseValue(currentValue);
        input.addEventListener('change', () => onChange(input.checked));
        return input;
    }
}