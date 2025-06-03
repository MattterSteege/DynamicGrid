/**
 * Date type plugin for the DynamicGrid
 * @class dateTypePlugin
 * @description This plugin is used to handle date values in the DynamicGrid.
 * @constructor
 */
class dateTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = ['==', '!=', '>', '<', '>=', '<=', 'in', '><']; //equals, not equals, greater than, less than, greater than or equal, less than or equal, in, between
        this.dateFormat = 'd-m-yyyy'; // Default date format
    }

    validate(value) {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') {
            return (this.parseValue(value) instanceof Date)
        }
        else if (value instanceof Date) {
            throw new GridError('Date values should be provided as strings in d-m-yyyy format, not as Date objects.');
        }
        return false;
    }

    parseValue(value) {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') {
            //check if string is in d-m-yyyy format
            const dateParts = value.split('-');
            if (dateParts.length !== 3) {
                throw new Error('Invalid date format, expected d-m-yyyy');
            }
            const a = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10); // Months are zero-based in JavaScript
            const c = parseInt(dateParts[2], 10);
            if (isNaN(a) || isNaN(month) || isNaN(c)) {
                throw new Error('Invalid date format, expected d-m-yyyy');
            }

            if (a >= 1000) {
                //a is a year, so we need to create a date object with the year, month and day
                return new Date(a, month - 1, c);
            }
            else {
                //a is a day, month is already zero-based, c is the year
                return new Date(c, month - 1, a);
            }

        }
        else {
            throw new Error('Invalid date value: ' + value + '. Date values should be provided as strings in [d]d-[m]m-yyyy format.');
        }
    }

    evaluate(query, dataIndexes, data, indices) {
        //loop over the indices and remove the ones that do not match the query
        //console.log('using ' + (dataIndexes?.size <= indices?.size ? 'dataIndexes' : 'indices') + ' sorting for dateTypePlugin');
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
            return value.includes(dataValue.toString());
        }

        const dateValue = this.parseValue(dataValue);
        const queryDate = this.parseValue(value);

        switch (operator) {
            case '==':
                return dateValue.toString() === queryDate.toString();
            case '!=':
                return dateValue.toString() !== queryDate.toString();
            case '>':
                return dateValue.toDate() > queryDate.toDate();
            case '<':
                return dateValue.toDate() < queryDate.toDate();
            case '>=':
                return dateValue.toDate() >= queryDate.toDate();
            case '<=':
                return dateValue.toDate() <= queryDate.toDate();
            case '><':
                if (!Array.isArray(queryDate)) throw new Error('between operator requires two dates');
                return dateValue.toDate() >= queryDate[0].toDate() && dateValue.toDate() <= queryDate[1].toDate();
        }
    }

    renderCell(value) {
        const cell = document.createElement('td');
        if (value === null || value === undefined) {
            cell.innerText = '';
            return cell;
        }
        cell.textContent = value.toString();
        return cell;
    }

    renderEditableCell(value, onEdit) {
        value = this.parseValue(value); // Ensure value is a Date object
        const cell = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'date';
        input.value = value.getFullYear() + '-' + (value.getMonth() + 1).toString().padStart(2, '0') + '-' + value.getDate().toString().padStart(2, '0');
        input.placeholder = this.dateFormat;

        input.addEventListener('change', (e) => {
            try {
                console.log(e.target.value);
                const newValue = this.parseValue(e.target.value);
                onEdit(newValue.getDate() + '-' + (newValue.getMonth() + 1) + '-' + newValue.getFullYear());
            } catch (error) {
                console.error('Invalid date format:', error);
            }
        });

        cell.appendChild(input);
        return cell;
    }
}
