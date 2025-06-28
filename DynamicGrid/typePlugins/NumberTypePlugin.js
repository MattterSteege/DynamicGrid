class NumberTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = [
            '>', '<', '>=', '<=', '==', '!=', 'in', '><'
        ]; // greater than, less than, greater than or equal, less than or equal, equals, not equals, in, between
    }

    validate(value) {
        if (value === null || value === undefined) return false;
        if (typeof value === 'number') return !isNaN(value);

        const valueStr = String(value).replace(',', '.');
        return (
            !isNaN(Number(valueStr)) ||
            (valueStr.includes('-') && valueStr.split('-').every(part => !isNaN(this.parseValue(part))))
        );
    }

    parseValue(value) {
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') return value;

        const strValue = value.toString();
        if (strValue.includes('-')) {
            const parts = strValue.split('-');
            return [this.parseValue(parts[0]), this.parseValue(parts[1])];
        }

        return Number(strValue.replace(',', '.'));
    }

    // indices is a set of indices that match the query
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
        if (operator === 'in') {
            value = JSON.parse(value);
        }

        if (operator === 'in' && Array.isArray(value) && value.length > 0) {
            return value.includes(dataValue);
        }

        switch (operator) {
            case '>': return dataValue > value;
            case '<': return dataValue < value;
            case '>=': return dataValue >= value;
            case '<=': return dataValue <= value;
            case '==': return dataValue === value;
            case '!=': return dataValue !== value;
            case '><':
                if (!Array.isArray(value) || value.length !== 2) {
                    throw new Error('between operator requires two numbers');
                }
                let [a, b] = value;
                if (isNaN(a) || isNaN(b)) throw new Error('between operator requires two numbers');
                if (a > b) [a, b] = [b, a];
                return dataValue >= a && dataValue <= b;
            default:
                return false;
        }
    }

    renderCell(value, onEdit, columnConfig = {}) {
        const cell = document.createElement('span');
        if (isNaN(value)) {
            cell.innerText = '';
            return cell;
        }

        const parts = value.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        cell.textContent = parts.join(',');
        return cell;
    }

    sort(query, data) {
        const { field, value } = query;
        return data.sort((a, b) => {
            if (value === 'asc') {
                return a[field] - b[field];
            } else if (value === 'desc') {
                return b[field] - a[field];
            }
            return 0;
        });
    }

    showMore(key, element, engine, UI, columnConfig) {
        const vanTot = { van: Number.MIN_SAFE_INTEGER, tot: Number.MAX_SAFE_INTEGER };

        UI.contextMenu.clear();
        UI.contextMenu
            .submenu('Filter ' + key, (submenu) => {
                let operator = '==';
                submenu
                    .dropdown('Filter ' + key, [
                        { label: 'Gelijk aan', value: '==' },
                        { label: 'Niet gelijk aan', value: '!=' },
                        { label: 'Groter dan', value: '>' },
                        { label: 'Groter dan of gelijk aan', value: '>=' },
                        { label: 'Kleiner dan', value: '<' },
                        { label: 'Kleiner dan of gelijk aan', value: '<=' },
                        { label: 'tussen', value: '><' },
                        { label: 'blank', value: '== null' },
                        { label: 'niet blank', value: '!= null' },
                    ], {
                        value: '==',
                        onChange: (val) => {
                            operator = val;
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
                            value: ['==', '!=', '>', '<', '>=', '<='],
                        }
                    })
                    .input('Filter', {
                        placeholder: 'Van',
                        onChange: (value) => {
                            vanTot.van = value || Number.MIN_SAFE_INTEGER;
                            if (vanTot.tot === Number.MAX_SAFE_INTEGER || vanTot.van > vanTot.tot) return;
                            engine.setSelect(key, '><', vanTot.van + '-' + vanTot.tot);
                            UI.render(engine.runCurrentQuery());
                        },
                        showWhen: {
                            elementId: 'dropdown-id',
                            value: ['><'],
                        }
                    })
                    .input('Filter', {
                        placeholder: 'Tot',
                        onChange: (value) => {
                            vanTot.tot = value || Number.MAX_SAFE_INTEGER;
                            if (vanTot.van === Number.MIN_SAFE_INTEGER || vanTot.tot <= vanTot.van) return;
                            engine.setSelect(key, '><', vanTot.van + '-' + vanTot.tot);
                            UI.render(engine.runCurrentQuery());
                        },
                        showWhen: {
                            elementId: 'dropdown-id',
                            value: ['><'],
                        }
                    });
            });

        return super.showMore(key, element, engine, UI, columnConfig);
    }
}