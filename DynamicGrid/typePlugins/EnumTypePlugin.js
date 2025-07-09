import {BaseTypePlugin} from "./BaseTypePlugin.js";

export class EnumTypePlugin extends BaseTypePlugin {
    constructor(config = []) {
        super();
        this.options = config;
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
        select.name = '_';
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