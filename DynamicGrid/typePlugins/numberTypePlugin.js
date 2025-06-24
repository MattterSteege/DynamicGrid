class numberTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = ['>', '<', '>=', '<=', '==', '!=', 'in', '><']; //greater than, less than, greater than or equal, less than or equal, equals, not equals, in, between
    }

    validate(value) {
        // Check if the value is a number or can be converted to a number
        if (value === null || value === undefined) return false;

        if (typeof value === 'number') return !isNaN(value);

        const valueStr = String(value).replace(',', '.'); // Replace comma with dot for decimal numbers

        return !isNaN(Number(valueStr)) ||
               (valueStr.includes('-') && valueStr.split('-').every(part => !isNaN(this.parseValue(part))));
    }

    parseValue(value) {
        if (value === null || value === undefined) return null;

        if (typeof value === 'number') return value;

        if (value.toString().split('-').length > 1) {
            // If the value is a range (e.g. "10-20"), split it and parse each part
            const parts = value.toString().split('-');
            return [this.parseValue(parts[0]), this.parseValue(parts[1])];
        }

        value = value.replace(',', '.'); // Replace comma with dot for decimal numbers
        return Number(value);
    }

    //indices is a set of indices that match the query
    evaluate(query, dataIndexes, data, indices) {

        // console.log(query.field, query.operator, query.value);

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

        if (operator === 'in' && Array.isArray(value) && value.length > 0) {
            return value.includes(dataValue);
        }

        // if (operator === '><' && Array.isArray(value) && value.length > 0) {
        //     let a = value[0], b = value[1];
        //     if (isNaN(a) || isNaN(b)) throw new Error('between operator requires two numbers');
        //     if (a > b) [a, b] = [b, a]; // Swap values if they are in the wrong order
        //     return dataValue >= a && dataValue <= b;
        // }

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
            case '><':
                if (!Array.isArray(value) || value.length !== 2) {
                    throw new Error('between operator requires two numbers');
                }
                let a = value[0], b = value[1];
                if (isNaN(a) || isNaN(b)) throw new Error('between operator requires two numbers');
                if (a > b) [a, b] = [b, a]; // Swap values if they are in the wrong order
                return dataValue >= a && dataValue <= b;
        }
    }

    renderCell(value) {
        const cell = document.createElement('td');
        if (isNaN(value)) {
            cell.innerText = '';
            return cell;
        }

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

        if (!typeOptions.config.isUnique && typeOptions.isGroupable) {
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