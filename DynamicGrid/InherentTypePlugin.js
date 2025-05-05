class stringTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = ['%=', '=%', '*=', '!*=', '==', '!=', 'in'] //starts with, ends with, contains, does not contain, equals, not equals, in
    }

    validate(value) {
        return typeof value === 'string';
    }

    parseValue(value) {
        if (value === null || value === undefined) return null;
        return String(value);
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
        this.operators = ['>', '<', '>=', '<=', '==', '!=', 'in', '><']; //greater than, less than, greater than or equal, less than or equal, equals, not equals, in, between
    }

    validate(value) {
        // Check if the value is a number or can be converted to a number
        if (value === null || value === undefined) return false;

        return !isNaN(Number(value)) ||
               (value.split('-').length === 2 && !isNaN(Number(value.split('-')[0])) && !isNaN(Number(value.split('-')[1])));
    }

    parseValue(value) {
        if (value === null || value === undefined) return null;
        return Number(value);
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

        if (operator === 'in') {
            value = JSON.parse(value);
        }
        else if (operator === '><') {
            value = value.split("-");
        }

        if (Array.isArray(value) && value.length > 0 && operator === 'in') {
            return value.includes(dataValue);
        }

        if (Array.isArray(value) && value.length > 0 && operator === '><') {
            if (isNaN(value[0]) || isNaN(value[1])) throw new Error('between operator requires two numbers');
            if (value[0] > value[1]) throw new Error('between operator requires first value to be less than second value');

            console.log(value[0] + ' < ' + dataValue + ' < ' + value[1], dataValue >= value[0] && dataValue <= value[1]);

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
        const vanTot = {van: Number.MIN_SAFE_INTEGER, tot: Number.MAX_SAFE_INTEGER};

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

                            engine.setSelect(key, '><', vanTot.van + "-" + vanTot.tot);
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
                            engine.setSelect(key, '><', vanTot.van + "-" + vanTot.tot);
                            UI.render(engine.runCurrentQuery());
                        },
                        showWhen: {
                            elementId: 'dropdown-id',
                            value: ['><'],
                        }
                    })
            });


        UI.contextMenu
            .button('Sort ' + key + ' ascending', () => {
                engine.setSort(key, 'asc');
                UI.render(engine.runCurrentQuery());
            })
            .button('Sort ' + key + ' descending', () => {
                engine.setSort(key, 'desc');
                UI.render(engine.runCurrentQuery());
            })
            .button('Unsort ' + key, () => {
                engine.setSort(key);
                UI.render(engine.runCurrentQuery());
            });

        if (!typeOptions.isUnique && typeOptions.isGroupable) {
            UI.contextMenu
                .separator()
                .button('Group by ' + key, () => {
                    engine.setGroup(key);
                    UI.render(engine.runCurrentQuery());
                })
                .button('Un-group', () => {
                    engine.setGroup();
                    UI.render(engine.runCurrentQuery());
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

    parseValue(value) {
        if (value === null || value === undefined) return null;
        return Boolean(value);
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
                engine.setSort(key, 'asc');
                UI.render(engine.runCurrentQuery());
            })
            .button('Sort ' + key + ' descending', () => {
                engine.setSort(key, 'desc');
                UI.render(engine.runCurrentQuery());
            })
            .button('Unsort ' + key, () => {
                engine.setSort(key);
                UI.render(engine.runCurrentQuery());
            })
            .separator()
            .button('Only show true', () => {
                engine.addSelect(key, '==', 'true');
                engine.removeSelect(key, '==', 'false');
                UI.render(engine.runCurrentQuery());
            })
            .button('Only show false', () => {
                engine.addSelect(key, '==', 'false');
                engine.removeSelect(key, '==', 'true');
                UI.render(engine.runCurrentQuery());
            })
            .button('Show all', () => {
                engine.removeSelect(key, '==', 'true');
                engine.removeSelect(key, '==', 'false');
                UI.render(engine.runCurrentQuery());
            })
            .separator()
            .button('Group by ' + key, () => {
                engine.setGroup(key);
                UI.render(engine.runCurrentQuery());
            })
            .button('Un-group', () => {
                engine.setGroup();
                UI.render(engine.runCurrentQuery());
            });
        // Display the context menu at the specified coordinates
        UI.contextMenu.showAt(x, y + height);
    }
}

//TODO: add the following types: date