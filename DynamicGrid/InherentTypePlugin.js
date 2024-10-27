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

class dateTypePlugin extends TypePlugin {
    constructor() {
        super();
    }

    validate(value) {
        return !isNaN(Date.parse(value));
    }

    getJSQLFormat(value) {
        if (isNaN(Date.parse(value))) {
            throw new Error('Value is not a date');
        }

        //return new Date(value);
        return value;
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

        value = this._parseDate(value);
        dataValue = this._parseDate(dataValue);

        if (typeof value === 'object') {
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

    _parseDate(date) {
        //DATE: YYYY-MM-DD
        //DATETIME: YYYY-MM-DD HH:MM:SS
        //TIMESTAMP: 0 - 10000.... //UNIX TIMESTAMP

        const YEAR = /^\d{4}$/;
        const DATE = /^\d{4}-\d{2}-\d{2}$/;
        const DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
        const TIMESTAMP = /^\d+$/;

        if (YEAR.test(date)) {
            //parse year
            return new Date(Number(date), 0, 1);
        }

        if (DATE.test(date)) {
            //parse date
            const [year, month, day] = date.split('-');
            return new Date(year, month - 1, day);
        }

        if (DATETIME.test(date)) {
            //parse date time
            const [_date, time] = date.split(' ');
            const [year, month, day] = _date.split('-');
            const [hour, minute, second] = time.split(':');

            return new Date(year, month - 1, day, hour, minute, second);
        }

        if (TIMESTAMP.test(date)) {

            if (isNaN(Number(date))) {
                throw new Error('Value is not a number');
            }

            if (date.length > 10) {
                //parse milliseconds
                return new Date(Number(date));
            }

            //parse timestamp
            return new Date(Number(date) * 1000);
        }
    }

    //render the header of the column
    renderHeader(key) {
        const elem = document.createElement('th');
        elem.innerHTML = key;
        return elem;
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

    //render the header of the column
    renderHeader(key) {
        const elem = document.createElement('th');
        elem.innerHTML = key;
        return elem;
    }
}

//TODO: add the following types: array, object, null, undefined, function, symbol, bigint