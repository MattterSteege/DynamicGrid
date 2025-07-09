// @requires ./BaseTypePlugin.js

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

    getContextMenuItems(columnName, engine, ui) {
        return [
            {
                type: 'action',
                label: 'Only True',
                action: () => {
                    engine.setSelect(columnName, '==', true);
                    ui.render(engine.runCurrentQuery());
                }
            },
            {
                type: 'action',
                label: 'Only False',
                action: () => {
                    engine.setSelect(columnName, '==', false);
                    ui.render(engine.runCurrentQuery());
                }
            },
            {
                type: 'action',
                label: 'Clear Filter',
                action: () => {
                    engine.removeSelect(columnName);
                    ui.render(engine.runCurrentQuery());
                }
            },
            {
                type: 'sort',
                label: 'Sort',
                sortingHint: this.sortingHint
            }
        ]
    }
}