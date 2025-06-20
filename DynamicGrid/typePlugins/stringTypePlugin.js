class stringTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = ['%=', '=%', '*=', '!*=', '==', '!=', '??', '!!', 'in'] //starts with, ends with, contains, does not contain, equals, not equals, empty, not empty, in
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
            case '??':
                return dataValue === null || dataValue === undefined || dataValue === '';
            case '!!':
                return dataValue !== null && dataValue !== undefined && dataValue !== '';
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
        return UI.contextMenu.showAt(x, y + height);
    }
}