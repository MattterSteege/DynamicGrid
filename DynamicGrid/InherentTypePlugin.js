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

    showMore(key, element, dynamicGrid) {

        const {x, y} = element.getBoundingClientRect();

        // Define the context menu configuration
        const items =  [
            { text: 'Sort ' + key + ' ascending', onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'asc')) },
            { text: 'Sort ' + key + ' descending', onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'desc')) },
            { text: 'Unsort ' + key, onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'original')) },
            null,
            { text: 'Group by ' + key, onclick: () => dynamicGrid.renderRaw(dynamicGrid.groupBy(key)) },
            { text: 'Un-group', onclick: () => dynamicGrid.renderRaw(dynamicGrid.groupBy()) }
        ];

        // Initialize the context menu
        const menu = new ContextMenu(document.body, items)
        menu.display(x, y + 30);
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

        if (operator === 'in') {
            value = JSON.parse(value);
        }

        if (Array.isArray(value) && value.length > 0 && operator === 'in') {
            return value.includes(dataValue);
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

    showMore(key, element, dynamicGrid) {

        const {x, y} = element.getBoundingClientRect();

        // Define the context menu configuration
        const items =  [
            { text: 'Sort ' + key + ' ascending', onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'asc')) },
            { text: 'Sort ' + key + ' descending', onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'desc')) },
            { text: 'Unsort ' + key, onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'original')) },
            null,
            { text: 'Group by ' + key, onclick: () => dynamicGrid.renderRaw(dynamicGrid.groupBy(key)) },
            { text: 'Un-group', onclick: () => dynamicGrid.renderRaw(dynamicGrid.groupBy()) }
        ];

        // Initialize the context menu
        const menu = new ContextMenu(document.body, items)
        menu.display(x, y + 30);
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

    showMore(key, element, dynamicGrid) {

        const {x, y} = element.getBoundingClientRect();

        // Define the context menu configuration
        const items =  [
            { text: 'Show ' + key + ' ascending', onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'asc')) },
            { text: 'Sort ' + key + ' descending', onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'desc')) },
            { text: 'Unsort ' + key, onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'original')) },
            null,
            { text: 'Only show true', onclick: () => {
                    dynamicGrid.addSelect(key, '==', 'true');
                    dynamicGrid.removeSelect(key, '==', 'false');
                    dynamicGrid.renderRaw(dynamicGrid.runSelect());
                }
            },
            { text: 'Only show false', onclick: () => {
                    dynamicGrid.addSelect(key, '==', 'false');
                    dynamicGrid.removeSelect(key, '==', 'true');
                    dynamicGrid.renderRaw(dynamicGrid.runSelect());
                }
            },
            { text: 'Show all', onclick: () => {
                    dynamicGrid.removeSelect(key, '==', 'true');
                    dynamicGrid.removeSelect(key, '==', 'false');
                    dynamicGrid.renderRaw(dynamicGrid.runSelect());
                }
            },
            null,
            { text: 'Group by ' + key, onclick: () => dynamicGrid.renderRaw(dynamicGrid.groupBy(key)) },
            { text: 'Un-group', onclick: () => dynamicGrid.renderRaw(dynamicGrid.groupBy()) }
        ];

        // Initialize the context menu
        const menu = new ContextMenu(document.body, items)
        menu.display(x, y + 30);
    }
}

//TODO: add the following types: date