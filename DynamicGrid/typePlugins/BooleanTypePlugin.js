class booleanTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = ['==', '!='];
    }

    validate(value) {
        return typeof value === 'boolean' || value === 'true' || value === 'false' ||
               value === 1 || value === 0 || value === '1' || value === '0';
    }

    parseValue(value) {
        if (value === null || value === undefined) return null;
        if (value === true || value === 'true' || value === 1 || value === '1') return true;
        if (value === false || value === 'false' || value === 0 || value === '0') return false;
        return Boolean(value);
    }

    evaluate(query, dataIndexes, data, indices) {
        if (dataIndexes && indices && dataIndexes.size <= indices.size) {
            for (const index of dataIndexes.keys()) {
                if (!this.evaluateCondition(index, query.operator, query.value)) {
                    dataIndexes.get(index).forEach(idx => indices.delete(idx));
                }
            }
        } else {
            for (const index of indices) {
                if (!this.evaluateCondition(data[index][query.field], query.operator, query.value)) {
                    indices.delete(index);
                }
            }
        }
        return indices;
    }

    evaluateCondition(dataValue, operator, value) {
        const parsedDataValue = this.parseValue(dataValue);
        const parsedValue = this.parseValue(value);

        switch (operator) {
            case '==': return parsedDataValue === parsedValue;
            case '!=': return parsedDataValue !== parsedValue;
            default: return false;
        }
    }

    sort(query, data) {
        const {field, value} = query;
        return data.sort((a, b) => {
            const aVal = this.parseValue(a[field]) ? 1 : 0;
            const bVal = this.parseValue(b[field]) ? 1 : 0;

            if (value === 'asc') {
                return aVal - bVal;
            } else if (value === 'desc') {
                return bVal - aVal;
            }
        });
    }

    renderCell(value, onEdit, columnConfig = {}) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = this.parseValue(value);
        checkbox.style.width = '-webkit-fill-available';

        if (columnConfig.isEditable) {
            checkbox.addEventListener('change', (e) => {
                onEdit(checkbox.checked);
            });
        }
        else {
            checkbox.disabled = true;
            checkbox.style.pointerEvents = 'none';
        }

        return checkbox;
    }

    showMore(key, element, engine, UI, columnConfig = {}) {
        UI.contextMenu.clear();

        // Boolean-specific filter submenu
        UI.contextMenu
            .submenu('Filter ' + key, (submenu) => {
                submenu
                    .button('Alleen waar', () => {
                        engine.setSelect(key, '==', true);
                        UI.render(engine.runCurrentQuery());
                    })
                    .button('Alleen onwaar', () => {
                        engine.setSelect(key, '==', false);
                        UI.render(engine.runCurrentQuery());
                    })
                    .button('Toon alles', () => {
                        engine.removeSelect(key, '==', true);
                        engine.removeSelect(key, '==', false);
                        UI.render(engine.runCurrentQuery());
                    });
            });

        // Call parent method for common functionality
        return super.showMore(key, element, engine, UI, columnConfig);
    }
}