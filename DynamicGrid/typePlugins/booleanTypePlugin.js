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
        if (value === true || value === 'true' || value === 1 || value === '1') return true;
        if (value === false || value === 'false' || value === 0 || value === '0') return false;
        throw new Error('Invalid boolean value: ' + value);
    }

    evaluate(query, dataIndexes, data, indices) {
        console.log(query.field, query.value);
        query.value = query.value === true;
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
        return this.parseValue(dataValue) === this.parseValue(value);
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
        const cell = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttributeNode(document.createAttribute('disabled'));
        value ? checkbox.setAttributeNode(document.createAttribute('checked')) : null;
        checkbox.style.width = '-webkit-fill-available';
        cell.appendChild(checkbox);
        return cell;
    }

    renderEditableCell(value, onEdit) {
        const cell = document.createElement('td');

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
        return UI.contextMenu.showAt(x, y + height);
    }
}