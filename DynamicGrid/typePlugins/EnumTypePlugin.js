class EnumTypePlugin extends BaseTypePlugin {
    constructor(options = []) {
        super();
        this.options = options;
        this.sortingHint = 'string';
    }

    validate(value) {
        return this.options.includes(value);
    }

    parseValue(value) {
        return value?.toString();
    }

    getInputComponent(currentValue, onChange) {
        const select = document.createElement('select');
        this.options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt === currentValue) option.selected = true;
            select.appendChild(option);
        });
        select.addEventListener('change', () => onChange(select.value));
        return select;
    }
}