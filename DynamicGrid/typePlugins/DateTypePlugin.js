import {BaseTypePlugin} from "./BaseTypePlugin.js";

export class DateTypePlugin extends BaseTypePlugin {
    constructor(options = {}) {
        super();
        this.sortingHint = 'date';
        this.minDate = options.minDate || null;
        this.maxDate = options.maxDate || null;
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
        input.name = '_'
        input.value = currentValue ? new Date(currentValue).toISOString().split('T')[0] : '';
        if (this.minDate) {
            input.min = new Date(this.minDate).toISOString().split('T')[0];
        }
        if (this.maxDate) {
            input.max = new Date(this.maxDate).toISOString().split('T')[0];
        }
        input.addEventListener('change', () => onChange(input.value));
        return input;
    }
}