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
            // for (const index of indices) {
            //     if (!this.evaluateCondition(data[index][query.field], query.operator, query.value)) {
            //         indices.delete(index);
            //     }
            // }
            console.error('dataIndexes is not defined or indices is larger than dataIndexes, this is a big nono!');
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

        if (operator === '><' && Array.isArray(value) && value.length > 0) {
            let a = value[0], b = value[1];
            if (isNaN(a) || isNaN(b)) throw new Error('between operator requires two numbers');
            if (a > b) [a, b] = [b, a]; // Swap values if they are in the wrong order
            return dataValue >= a && dataValue <= b;
        }

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
        console.log('value', value);
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

/**
 * Date type plugin for the DynamicGrid
 * @class dateTypePlugin
 * @extends numberTypePlugin
 * @description This plugin is used to handle date values in the DynamicGrid. It extends the numberTypePlugin and provides additional functionality for parsing, rendering, and editing date values.
 * @constructor
 * @param {boolean} [onlyDate=false] - If true, only the date part will be shown (no time)
 * @param {boolean} [writeMonthFully=false] - If true, the month will be written fully (e.g. January instead of 01)
 */
class dateTypePlugin extends numberTypePlugin {
    constructor(onlyDate = false, writeMonthAsText = true) {
        super();

        this.options = {
            onlyDate: onlyDate, //only show date (no HH:mm:ss)
            writeMonthAsText: writeMonthAsText, //write month short (e.g. Jan instead of 01)
        }

        this.monthsShort = [
            'jan', 'feb', 'mar', 'apr', 'mei', 'jun',
            'jul', 'aug', 'sep', 'okt', 'nov', 'dec'
        ];

        this.monthsShortEnglish = [
            'jan', 'feb', 'mar', 'apr', 'may', 'jun',
            'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
        ];
    }

    /**
     * Parse the value to a date
     * @param value
     * @returns {number} - The date in milliseconds since 1970
     * @example
     * const allowedDatesFormats = [
     *     '13-09-2024', // dd-MM-yyyy
     *     '13-Sep-2024', // dd-MMM-yyyy
     *     '13-September-2024', // dd-MMMM-yyyy
     *     '13-09-24', // dd-MM-yy
     *     '13-Sep-24', // dd-MMM-yy
     *     '13-September-24', // dd-MMMM-yy
     *     '13-09-2024 14:30:00', // dd-MM-yyyy HH:mm:ss
     *     '13-Sep-2024 14:30:00', // dd-MMM-yyyy HH:mm:ss
     *     '13-September-2024 14:30:00', // dd-MMMM-yyyy HH:mm:ss
     *     '13-09-24 14:30:00', // dd-MM-yy HH:mm:ss
     *     '13-Sep-24 14:30:00', // dd-MMM-yy HH:mm:ss
     *     '13-September-24 14:30:00', // dd-MMMM-yy HH:mm:ss
     *     1694591400000, // Timestamp in milliseconds
     *     1694591400 // Timestamp in seconds
     * ]
     */
    parseValue(value) {
        //value is either a datestring or a timestamp in seconds or milliseconds
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') {

            //parse this date to UTC ms timestamp
            //[d|dd]-[MM|MMM|MMMM]-[yy|yyyy] [HH:mm:ss]
            const dateParts = value.split(' ');
            const date = dateParts[0].split('-');
            const time = dateParts[1] ? dateParts[1].split(':') : ['0', '0', '0'];
            const day = parseInt(date[0]);
            const month = isNaN(Number(date[1])) ? this.monthsShort.indexOf(date[1].substring(0,3).toLowerCase()) + 1 === -1 ? this.monthsShortEnglish.indexOf(date[1].substring(0,3).toLowerCase()) + 1 : this.monthsShort.indexOf(date[1].substring(0,3).toLowerCase()) + 1 : parseInt(date[1]);
            const year = parseInt(date[2]) < 1000 ? parseInt(date[2]) + 2000 : parseInt(date[2]);
            const hours = parseInt(time[0] ?? '0');
            const minutes = parseInt(time[1] ?? '0');
            const seconds = parseInt(time[2] ?? '0');
            const d = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
            const utc = d.getTime();
            //console.log('parsed date', d, utc);
            //check if the date is in seconds or milliseconds
            if (utc < 1e10) { //1e10
                return utc * 1000;
            }
            else {
                return utc;
            }
        }
        else if (typeof value === 'number') {
            //check if the value is in seconds or milliseconds
            if (value < 1e10) { //1e10
                value *= 1000;
            }
            return value;
        }
    }

    dateToString(date) {
        if (date === null || date === undefined) return null;
        const d = new Date(0);

        if (date < 1e10) { //1e10
            date *= 1000;
        }

        d.setUTCMilliseconds(date);
        
        /*
        when onlyDate is true, return the date in the format dd-MM-yyyy
        when onlyDate is false, return the date in the format dd-MM-yyyy HH:mm:ss
            if HH:mm:ss is 00:00:00, return the date in the format dd-MM-yyyy
        when writeMonthAsText is true, return the date in the format dd-MMM-yyyy
        when writeMonthAsText is false, return the date in the format dd-MM-yyyy
         */

        const day = d.getUTCDate().toString().padStart(2, '0');
        const month = this.options.writeMonthAsText ? this.monthsShort[d.getUTCMonth()] : (d.getUTCMonth() + 1).toString().padStart(2, '0');
        const year = d.getUTCFullYear().toString().padStart(4, '0');
        const hours = d.getUTCHours().toString().padStart(2, '0');
        const minutes = d.getUTCMinutes().toString().padStart(2, '0');
        const dateString = this.options.onlyDate || (hours + minutes === "0000") ? `${day}-${month}-${year}` : `${day}-${month}-${year} ${hours}:${minutes}`;
        return dateString;
    }

    renderCell(value) {
        const cell = document.createElement('td');
        cell.innerText = this.dateToString(value);
        return cell;
    }

    renderEditableCell(value, onEdit) {
        const cell = this.renderCell(value);
        cell.contentEditable = true;

        cell.addEventListener('focusout', (e) => {

            console.log(cell.innerText, this.parseValue(cell.innerText));

            const date = this.parseValue(cell.innerText);

            onEdit(date);

            cell.innerText = this.dateToString(date);
        });

        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                cell.blur();
                e.preventDefault();
            }
        });

        return cell;
    }
}