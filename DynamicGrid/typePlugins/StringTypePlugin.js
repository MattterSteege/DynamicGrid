class stringTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = ['%=', '=%', '*=', '!*=', '==', '!=', '??', '!!', 'in'];
    }

    validate(value) {
        return typeof value === 'string';
    }

    parseValue(value) {
        if (value === null || value === undefined) return null;
        return String(value);
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
        // Handle 'in' operator early and return
        if (operator === 'in') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) && parsed.includes(dataValue);
            } catch {
                return false; // Invalid JSON
            }
        }

        // Normalize nullish check
        const isEmpty = (v) => v === null || v === undefined || v === '';

        switch (operator) {
            case '==':  return dataValue === value;
            case '!=':  return dataValue !== value;
            case '%=':  return String(dataValue).startsWith(value);
            case '=%':  return String(dataValue).endsWith(value);
            case '*=':  return String(dataValue).includes(value);
            case '!*=': return !String(dataValue).includes(value);
            case '??':  return isEmpty(dataValue);
            case '!!':  {
                console.log(!isEmpty(dataValue), dataValue);
                return !isEmpty(dataValue);
            }
            default:    return false;
        }
    }


    sort(query, data) {
        const {field, value} = query;
        return data.sort((a, b) => {
            if (value === 'asc') {
                return a[field].localeCompare(b[field]);
            } else if (value === 'desc') {
                return b[field].localeCompare(a[field]);
            }
        });
    }

    showMore(key, element, engine, UI, columnConfig = {}) {
        UI.contextMenu.clear();

        // String-specific filter submenu
        UI.contextMenu
            .submenu('Filter ' + key, (submenu) => {
                var operator = '==';
                submenu
                    .dropdown('Filter ' + key, [
                        { label: 'Gelijk aan', value: '==' },
                        { label: 'Niet gelijk aan', value: '!=' },
                        { label: 'Begint met', value: '%=' },
                        { label: 'Eindigt met', value: '=%' },
                        { label: 'Bevat', value: '*=' },
                        { label: 'Bevat niet', value: '!*=' },
                        { label: 'Is leeg', value: '??' },
                        { label: 'Is niet leeg', value: '!!' },
                    ], {
                        value: '==',
                        onChange: (value) => {
                            operator = value;
                        },
                        id: 'dropdown-id'
                    })
                    .input('Filter', {
                        placeholder: 'Filter',
                        onChange: (value) => {
                            engine.setSelect(key, operator, value);
                            UI.render(engine.runCurrentQuery());
                        },
                        showWhen: {
                            elementId: 'dropdown-id',
                            value: ['==', '!=', '%=', '=%', '*=', '!*='],
                        }
                    });
            });

        // Call parent method for common functionality
        return super.showMore(key, element, engine, UI, columnConfig);
    }
}