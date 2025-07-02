class EmailTypePlugin extends BaseTypePlugin {
    constructor() {
        super();
        this.sortingHint = 'string';
    }

    validate(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    parseValue(value) {
        return value ? String(value).toLowerCase().trim() : '';
    }

    getInputComponent(currentValue, onChange) {
        const input = document.createElement('input');
        input.type = 'email';
        input.value = currentValue ?? '';
        input.addEventListener('input', (e) => onChange(e.target.value));
        return input;
    }
}