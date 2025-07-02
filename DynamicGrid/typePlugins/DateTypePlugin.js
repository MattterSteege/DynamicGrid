class DateTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = ['==', '!=', '>', '<', '>=', '<=', 'in', '><'];
        this.dateFormat = 'd-m-yyyy';
    }

    validate(value) {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') {
            try {
                return this.parseValue(value) instanceof Date;
            } catch {
                return false;
            }
        }
        if (value instanceof Date) {
            throw new GridError('Date values should be provided as strings in d-m-yyyy format, not as Date objects.');
        }
        return false;
    }

    parseValue(value) {
        if (value instanceof Date) {
            return value;
        }
        if (typeof value === 'string') {
            // Accepts d-m-yy, d-m-yyyy, dd-mm-yy, dd-mm-yyyy, etc.
            const regex = /^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/;
            const match = value.match(regex);
            if (!match) {
                throw new Error('Invalid date format, expected d[d]-m[m]-yy[yy]');
            }

            let day = parseInt(match[1], 10);
            let month = parseInt(match[2], 10);
            let year = parseInt(match[3], 10);

            if (isNaN(day) || isNaN(month) || isNaN(year)) {
                throw new Error('Invalid date format, expected d[d]-m[m]-yy[yy]');
            }

            // Handle 2-digit years as 2000-2099
            if (year < 100) {
                year += 2000;
            }

            // JS months are 0-based
            const date = new Date(year, month - 1, day);

            // Check for invalid dates (e.g., 31-02-2023)
            if (
                date.getFullYear() !== year ||
                date.getMonth() !== month - 1 ||
                date.getDate() !== day
            ) {
                throw new Error('Invalid date value, out of range');
            }

            return date;
        } else {
            throw new Error('Invalid date value: ' + value + '. Date values should be provided as strings in d[d]-m[m]-yy[yy] format.');
        }
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
        dataValue = this.parseValue(dataValue);
        value = this.parseValue(value);
        if (!dataValue || !value) return false;

        switch (operator) {
            case '==': return dataValue.getTime() === value.getTime();
            case '!=': return dataValue.getTime() !== value.getTime();
            case '>':  return dataValue.getTime() > value.getTime();
            case '<':  return dataValue.getTime() < value.getTime();
            case '>=': return dataValue.getTime() >= value.getTime();
            case '<=': return dataValue.getTime() <= value.getTime();
            case '><':
                try {
                    const dates = JSON.parse(value);
                    if (!Array.isArray(dates) || dates.length !== 2) return false;
                    const startDate = this.parseValue(dates[0]);
                    const endDate = this.parseValue(dates[1]);
                    return dataValue.getTime() >= startDate.getTime() && dataValue.getTime() <= endDate.getTime();
                } catch {
                    return false;
                }
            default: return false;
        }
    }

    sort(query, data) {
        const {field, value} = query;
        return data.sort((a, b) => {
            const dateA = this.parseValue(a[field]);
            const dateB = this.parseValue(b[field]);

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;

            const comparison = dateA.getTime() - dateB.getTime();
            return value === 'asc' ? comparison : -comparison;
        });
    }

    renderCell(value, onEdit, columnConfig = {}) {
        if (columnConfig.isEditable) {
            return this.renderEditableCell(value, onEdit);
        }

        const cell = document.createElement('span');
        cell.textContent = value ?? '';
        return cell;
    }

    renderEditableCell(value, onEdit) {
        const input = document.createElement('input');
        input.type = 'date';

        if (value) {
            const dateValue = this.parseValue(value);
            input.value = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`;
        }

        input.placeholder = this.dateFormat;

        input.addEventListener('change', (e) => {
            try {
                const newValue = e.target.value
                    ? this.parseValue(e.target.value.split('-').reverse().join('-'))
                    : null;
                onEdit(newValue ? `${newValue.getDate()}-${newValue.getMonth() + 1}-${newValue.getFullYear()}` : null);
            } catch (error) {
                console.error('Invalid date format:', error);
            }
        });

        return input;
    }

    showMore(key, element, engine, UI, columnConfig = {}) {
        UI.contextMenu.clear();

        // Date-specific filter submenu
        UI.contextMenu
            .submenu('Filter ' + key, (submenu) => {
                var operator = '==';
                submenu
                    .dropdown('Filter ' + key, [
                        { label: 'Gelijk aan', value: '==' },
                        { label: 'Niet gelijk aan', value: '!=' },
                        { label: 'Voor', value: '<' },
                        { label: 'Na', value: '>' },
                        { label: 'Voor of op', value: '<=' },
                        { label: 'Na of op', value: '>=' },
                        { label: 'Tussen', value: '><' }
                    ], {
                        value: '==',
                        onChange: (value) => {
                            operator = value;
                        },
                        id: 'dropdown-id'
                    })
                    .input('Datum (d-m-yyyy)', {
                        placeholder: 'd-m-yyyy',
                        onChange: (value) => {
                            engine.setSelect(key, operator, value);
                            UI.render(engine.runCurrentQuery());
                        },
                        showWhen: {
                            elementId: 'dropdown-id',
                            value: ['==', '!=', '<', '>', '<=', '>='],
                        }
                    })
                    .input('Van datum (d-m-yyyy)', {
                        placeholder: 'd-m-yyyy',
                        onChange: (fromValue) => {
                            const toInput = submenu.element.querySelector('#from-date-input');
                            const toValue = toInput ? toInput.value : '';
                            if (fromValue && toValue) {
                                engine.setSelect(key, '><', JSON.stringify([fromValue, toValue]));
                                UI.render(engine.runCurrentQuery());
                            }
                        },
                        showWhen: {
                            elementId: 'dropdown-id',
                            value: ['><'],
                        },
                        id: 'from-date-input'
                    })
                    .input('Tot datum (d-m-yyyy)', {
                        placeholder: 'Tot datum (d-m-yyyy)',
                        onChange: (toValue) => {
                            const fromInput = submenu.element.querySelector('#to-date-input');
                            const fromValue = fromInput ? fromInput.value : '';
                            if (fromValue && toValue) {
                                engine.setSelect(key, '><', JSON.stringify([fromValue, toValue]));
                                UI.render(engine.runCurrentQuery());
                            }
                        },
                        showWhen: {
                            elementId: 'dropdown-id',
                            value: ['><'],
                        },
                        id: 'to-date-input'
                    });
            });

        // Call parent method for common functionality
        return super.showMore(key, element, engine, UI, columnConfig);
    }
}