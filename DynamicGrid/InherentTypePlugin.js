class stringTypePlugin extends TypePlugin {
    constructor() {
        super();
    }

    validate(value) {
        return typeof value === 'string';
    }

    getJSQLFormat(value) {
        //remove first and last character (only if they are both quotes)
        if ((value[0] === '"' && value[value.length - 1] === '"') || (value[0] === "'" && value[value.length - 1] === "'")) {
            return value.substring(1, value.length - 1);
        }

        return value;
    }

    //query = {field: 'name', operator: 'eq', value: 'John'}
    evaluate(query, data) {
        let {field, operator, value} = query;

        if (operator === 'in') {
            value = JSON.parse(value);
        }

        return data.filter(item => {
            return this._evaluate(item[field], operator, value);
        });
    }

    //dataValue is the value of the field in the data, value is the value in the query
    _evaluate(dataValue, operator, value) {

        if (Array.isArray(value) && value.length > 0 && operator === 'in') {
            return value.includes(dataValue);
        }

        if (typeof value === 'string') {
            switch (operator) {
                case 'eq':
                    return dataValue === value;
                case 'neq':
                    return dataValue !== value;
                case 'em':
                    return (!value || value.length === 0);
                case 'nem':
                    return (value && value.length > 0);
                case 'swi':
                    return dataValue.startsWith(value);
                case 'ewi':
                    return dataValue.endsWith(value);
                case 'co':
                    return dataValue.includes(value);
                case 'nco':
                    return !dataValue.includes(value);
            }
        }

        return false;
    }

    //render the header of the column
    renderHeader(key) {
        const elem = document.createElement('th');
        elem.innerHTML = key;
        return elem;
    }

    renderCell(value) {
        const elem = document.createElement('td');
        elem.innerHTML = value;
        return elem;
    }

    //==================================================================================================================
    addOperators() {
        super.addOperators();
        this.operators.push(...[
            { name: 'swi', operator: '%=' },  // Starts with
            { name: 'ewi', operator: '=%' },  // Ends with
            { name: 'co', operator: '*=' },   // Contains
            { name: 'nco', operator: '!*=' }, // Does not contain
            { name: 'in', operator: 'in' }    // In (square brackets indicate inclusion)
        ]);
    }
}

class numberTypePlugin extends TypePlugin {
    constructor() {
        super();
    }

    validate(value) {
        return !isNaN(Number(value));
    }

    getJSQLFormat(value) {
        if (isNaN(Number(value))) {
            throw new Error('Value is not a number');
        }

        return Number(value);
    }

    evaluate(query, data) {
        let {field, operator, value} = query;

        if (operator === 'in') {
            value = JSON.parse(value);
        }

        return data.filter(item => {
            return this._evaluate(item[field], operator, value);
        });
    }

    _evaluate(dataValue, operator, value) {
        if (Array.isArray(value) && value.length > 0 && operator === 'in') {
            return value.includes(dataValue);
        }

        if (typeof value === 'number') {
            switch (operator) {
                case 'eq':
                    return dataValue === value;
                case 'neq':
                    return dataValue !== value;
                case 'gt':
                    return dataValue > value;
                case 'lt':
                    return dataValue < value;
                case 'gte':
                    return dataValue >= value;
                case 'lte':
                    return dataValue <= value;
            }
        }

        return false;
    }

    //render the header of the column
    renderHeader(key) {
        const elem = document.createElement('th');
        elem.innerHTML = key;
        return elem;
    }

    renderCell(value) {
        const elem = document.createElement('td');
        elem.innerHTML = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); //add dots for thousands
        return elem;
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

    //==================================================================================================================
    addOperators() {
        super.addOperators();
        this.operators.push(...[
            { name: 'gt', operator: '>' },    // Greater than
            { name: 'lt', operator: '<' },    // Less than
            { name: 'gte', operator: '>=' },  // Greater than or equals
            { name: 'lte', operator: '<=' },  // Less than or equals
            { name: 'in', operator: 'in' }    // In (square brackets indicate inclusion)
        ]);
    }
}

class booleanTypePlugin extends TypePlugin {
    constructor() {
        super();
    }

    validate(value) {
        if (typeof value === 'boolean')
            return true;
        else if (typeof value === 'string')
            return value === 'true' || value === 'false';

        return false;
    }

    getJSQLFormat(value) {
        return value.toLowerCase() === 'true';
    }

    evaluate(query, data) {
        const {field, operator, value} = query;
        return data.filter(item => {
            return this._evaluate(item[field], operator, value);
        });
    }

    _evaluate(dataValue, operator, value) {
        if (Array.isArray(value) && value.length > 0 && operator === 'in') {
            return value.forEach(val => {
                if (this._evaluate(dataValue, operator, val)) {
                    return true;
                }
            });
        }

        if (typeof value === 'boolean') {
            switch (operator) {
                case 'eq':
                    return dataValue === value;
                case 'neq':
                    return dataValue !== value;
            }
        }

        return false;
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

    //render the header of the column
    renderHeader(key) {
        const elem = document.createElement('th');
        elem.innerHTML = key;
        return elem;
    }

    renderCell(value) {
        //render a checkbox that is checked if value is true
        const elem = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = value;
        checkbox.disabled = true;
        elem.appendChild(checkbox);
        return elem;
    }
}

//TODO: add the following types: date