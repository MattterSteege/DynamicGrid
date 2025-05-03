class stringTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = ['%=', '=%', '*=', '!*=', '==', '!=', 'in'] //starts with, ends with, contains, does not contain, equals, not equals, in
    }

    validate(value) {
        return typeof value === 'string';
    }

    //query = {field: 'name', operator: 'eq', value: 'John'}
    evaluate(query, dataIndexes, data, indices) {
        //loop over the indices and remove the ones that do not match the query
        //console.log('using ' + (dataIndexes?.size <= indices?.size ? 'dataIndexes' : 'indices') + ' sorting for stringTypePlugin');
        if (dataIndexes && indices && dataIndexes.size <= indices.size) {
            for (const index of dataIndexes.keys()) {
                if (!this.evaluateCondition(index, query.operator, query.value)) {
                    dataIndexes.get(index).forEach(idx => indices.delete(idx));
                }
            }
        }
        else {
            for (const index of indices) {
                if (!this.evaluateCondition(data[index][query.field], query.operator, query.value)) {
                    indices.delete(index);
                }
            }
        }

        return indices;
    }

    //dataValue is the value of the field in the data, value is the value in the query
    evaluateCondition(dataValue, operator, value) {
        if (operator === 'in') {
            value = JSON.parse(value);
        }

        if (Array.isArray(value) && value.length > 0 && operator === 'in') {
            return value.includes(dataValue);
        }

        switch (operator) {
            case '==':
                return dataValue === value;
            case '!=':
                return dataValue !== value;
            case '%=':
                return dataValue.startsWith(value);
            case '=%':
                return dataValue.endsWith(value);
            case '*=':
                return dataValue.includes(value);
            case '!*=':
                return !dataValue.includes(value);
        }

        return false;
    }

    sort(query, data) {
        const {field, value} = query;
        return data.sort((a, b) => {
            if (value === 'asc') {
                return a[field].localeCompare(b[field]);
            }
            else if (value === 'desc') {
                return b[field].localeCompare(a[field]);
            }
        });
    }
}

class numberTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = ['>', '<', '>=', '<=', '==', '!=', 'in']; //greater than, less than, greater than or equal, less than or equal, equals, not equals
    }

    validate(value) {
        return !isNaN(Number(value));
    }

    //indices is a set of indices that match the query
    evaluate(query, dataIndexes, data, indices) {

        //loop over the indices and remove the ones that do not match the query
        //.log('using ' + (dataIndexes?.size <= indices?.size ? 'dataIndexes' : 'indices') + ' sorting for numberTypePlugin');
        if (dataIndexes && indices && dataIndexes.size <= indices.size) {
            for (const index of dataIndexes.keys()) {
                if (!this.evaluateCondition(index, query.operator, query.value)) {
                    dataIndexes.get(index).forEach(idx => indices.delete(idx));
                }
            }
        }
        else {
            for (const index of indices) {
                if (!this.evaluateCondition(data[index][query.field], query.operator, query.value)) {
                    indices.delete(index);
                }
            }
        }

        return indices;
    }

    evaluateCondition(dataValue, operator, value) {

        if (operator === 'in' || operator === '><') {
            value = JSON.parse(value);
        }

        if (Array.isArray(value) && value.length > 0 && operator === 'in') {
            return value.includes(dataValue);
        }

        if (Array.isArray(value) && value.length > 0 && operator === '><') {
            if (value.length !== 2) {
                throw new Error('between operator requires two values');
            }
            return dataValue >= value[0] && dataValue <= value[1];
        }



        dataValue = Number(dataValue);
        value = Number(value);

        switch (operator) {
            case '>':
                return dataValue > value;
            case '<':
                return dataValue < value;
            case '>=':
                return dataValue >= value;
            case '<=':
                return dataValue <= value;
            case '==':
                return dataValue === value;
            case '!=':
                return dataValue !== value;
        }
    }

    renderCell(value) {
        const cell = document.createElement('div');
        const parts = value.toString().split("."); // Ensure two decimal places
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "."); // Add dots for thousands
        cell.textContent = parts.join(",");
        return cell;
    }

    sort(query, data) {
        const {field, value} = query;
        return data.sort((a, b) => {
            if (value === 'asc') {
                return a[field] - b[field];
            }
            else if (value === 'desc') {
                return b[field] - a[field];
            }
        });
    }

    showMore(key, element, engine, UI) {
        const {x, y, width, height} = element.getBoundingClientRect();
        const typeOptions = engine.headers[key];

        console.log(typeOptions);

        UI.contextMenu.clear();
        UI.contextMenu
            .submenu('Filter ' + key, (submenu) => {
                var operator = '==';
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
                    onChange: (value) => {
                        operator = value;
                    },
                    id: 'dropdown-id'
                })
                    .input('Filter', {
                        placeholder: 'Filter',
                        onChange: (value) => {
                            engine.setSelect(key, operator, value);
                            UI.render(engine.runSelect());
                        },
                        showWhen: {
                            elementId: 'dropdown-id',
                            value: ['==', '!=', '>', '<', '>=', '<='],
                        }
                    })
                    .input('Filter', {
                        placeholder: 'Van',
                        onChange: (value) => {
                            engine.setSelect(key, operator, value);
                            UI.render(engine.runSelect());
                        },
                        showWhen: {
                            elementId: 'dropdown-id',
                            value: ['><'],
                        }
                    })
                    .input('Filter', {
                        placeholder: 'Tot',
                        onChange: (value) => {
                            engine.setSelect(key, operator, value);
                            UI.render(engine.runSelect());
                        },
                        showWhen: {
                            elementId: 'dropdown-id',
                            value: ['><'],
                        }
                    })
            });


        UI.contextMenu
            .button('Sort ' + key + ' ascending', () => {
                UI.render(engine.sort(key, 'asc'));
            })
            .button('Sort ' + key + ' descending', () => {
                UI.render(engine.sort(key, 'desc'));
            })
            .button('Unsort ' + key, () => {
                UI.render(engine.sort(key, 'original'));
            });

        if (!typeOptions.isUnique && typeOptions.isGroupable) {
            UI.contextMenu
                .separator()
                .button('Group by ' + key, () => {
                    UI.render(engine.groupBy(key));
                })
                .button('Un-group', () => {
                    UI.render(engine.groupBy());
                })
        }

        // Display the context menu at the specified coordinates
        UI.contextMenu.showAt(x, y + height);
    }
}

class booleanTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = ['==', '!='];
    }

    validate(value) {
        value = Boolean(value);
        return value === true || value === false;
    }

    evaluate(query, dataIndexes, data, indices) {
        query.value = query.value === 'true';
        if (dataIndexes){
            //since we have already filtered the data based on the value,
            //we can just return the set of indices (because there are only two possible values)
            const allowedValues = dataIndexes.get(query.value);
            return new Set([...indices].filter(idx => allowedValues.has(idx)));
        }
        else {
            return new Set(data
                .map((row, i) => row[query.field] === query.value ? i : null)
                .filter(x => x !== null));
        }
    }

    evaluateCondition(dataValue, operator, value) {
        return Boolean(dataValue) === Boolean(value);
    }

    sort(query, data) {
        const {field, value} = query;
        return data.sort((a, b) => {
            if (value === 'asc') {
                return a[field] - b[field];
            }
            else if (value === 'desc') {
                return b[field] - a[field];
            }
        });
    }

    renderCell(value) {
        const cell = document.createElement('div');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttributeNode(document.createAttribute('disabled'));
        value ? checkbox.setAttributeNode(document.createAttribute('checked')) : null;
        checkbox.style.width = '-webkit-fill-available';
        cell.appendChild(checkbox);
        return cell;
    }

    renderEditableCell(value, onEdit) {
        const cell = document.createElement('div');

        //render a checkbox that is checked if value is true
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        value ? checkbox.setAttributeNode(document.createAttribute('checked')) : null;
        checkbox.style.width = '-webkit-fill-available';
        checkbox.name = 'checkbox';

        checkbox.addEventListener('change', (e) => {
            //eventEmitter.emit('UI.CellEdit', { originEvent: e, edit: checkbox.checked });
            onEdit(checkbox.checked);
        });

        cell.appendChild(checkbox);
        return cell;
    }

    showMore(key, element, engine, UI) {

        const {x, y, width, height} = element.getBoundingClientRect();
        UI.contextMenu.clear();
        UI.contextMenu
            .button('Sort ' + key + ' ascending', () => {
                UI.render(engine.sort(key, 'asc'));
            })
            .button('Sort ' + key + ' descending', () => {
                UI.render(engine.sort(key, 'desc'));
            })
            .button('Unsort ' + key, () => {
                UI.render(engine.sort(key, 'original'));
            })
            .separator()
            .button('Only show true', () => {
                engine.addSelect(key, '==', 'true');
                engine.removeSelect(key, '==', 'false');
                UI.render(engine.runSelect());
            })
            .button('Only show false', () => {
                engine.addSelect(key, '==', 'false');
                engine.removeSelect(key, '==', 'true');
                UI.render(engine.runSelect());
            })
            .button('Show all', () => {
                engine.removeSelect(key, '==', 'true');
                engine.removeSelect(key, '==', 'false');
                UI.render(engine.runSelect());
            })
            .separator()
            .button('Group by ' + key, () => {
                UI.render(engine.groupBy(key));
            })
            .button('Un-group', () => {
                UI.render(engine.groupBy());
            });
        // Display the context menu at the specified coordinates
        UI.contextMenu.showAt(x, y + height);
    }
}

//TODO: add the following types: date