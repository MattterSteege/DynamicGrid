// @requires ./BaseTypePlugin.js

class ButtonTypePlugin extends BaseTypePlugin {
    constructor(config = []) {
        super();
        this.label = config.label || 'Button';
        this.onClick = config.onClick || (() => {});
        this.operatorLabels = [];
    }

    validate(value) {
        return this.options.includes(value);
    }

    parseValue(value) {
        return value?.toString();
    }

    getInputComponent(currentValue, onChange) {
        const button = document.createElement('button');
        button.type = 'button';
        button.name = '_';
        button.innerText = this.label;
        button.addEventListener('click', (event) => {
            onChange(currentValue);
            this.onClick(currentValue);
        });
        return button;
    }

    getContextMenuItems(columnName, engine, ui) {
        return [
            {
                type: 'filter',
                label: 'Filter',
                operators: ['==', '!=']
            },
            {
                type: 'sort',
                label: 'Sort',
                sortingHint: this.sortingHint
            }
        ];
    }
}