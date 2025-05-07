//throw new GridError('Invalid grid data'); <-- (sends error to console without stack trace)
class GridError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GridError';
        this.stack = '';
    }
}

function FastHash(object) {
    const string = JSON.stringify(object);

    let hash = 0;
    for (let i = 0; i < string.length; i++) {
        hash = ((hash << 5) - hash) + string.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

/**
* Code to find the closest matching key in a list of keys (with some config options)
* @param {Array<string>} dataIndexesKeys
* @param {string} field
* @param {Object} config
* @returns {string}
*/
function MeantIndexKey(dataIndexesKeys, field, config) {
    // I'm SO sorry for this code (•́︵•̀)
    return dataIndexesKeys.find(key => {
        let normalizedKey = '';
        let normalizedField = '';
        if (config.SymbolsToIgnore.length){

            normalizedKey = key.replace(new RegExp(`[${config.SymbolsToIgnore.join('')}]`, 'g'), '');
            normalizedField = field.replace(new RegExp(`[${config.SymbolsToIgnore.join('')}]`, 'g'), '');
        }
        else{
            normalizedKey = key;
            normalizedField = field;
        }

        if (!config.useStrictCase) {
            normalizedKey = normalizedKey.toLowerCase();
            normalizedField = normalizedField.toLowerCase();
        }

        return normalizedKey === normalizedField
    });
}

/**
 * Gets the first item from a structure that may include numeric or named keys.
 * @param {Object|Array} data The structure to get the first item from.
 * @returns {any|boolean} The first item or false if the input is invalid.
 */
function firstItem(data) {
    if (!data || typeof data !== 'object') return false;

    if (Array.isArray(data)) {
        // Handle standard arrays
        return data[0];
    }

    // Handle objects with numeric and named keys
    const keys = Object.keys(data);

    return data[keys[0]];
}

/**
 * removes a entry from an array
 * @param {Array<string>} entry
 * @returns {Array<string>}
 */
Array.prototype.remove = function (entry) {
    const index = this.indexOf(entry);
    if (index > -1) {
        this.splice(index, 1);
    }
    return this;

}

/**
 * Waits for the state to become true, checking every second.
 * @returns {Promise<boolean>} A promise that resolves when the state is true.
 * @author jabaa
 * @see https://stackoverflow.com/a/69424610/18411025
 */
async function waitState() {
    return new Promise(resolve => {
        let timerId = setInterval(checkState, 1000);

        function checkState() {
            if (o.state == true) {
                clearInterval(timerId);
                resolve(o.state);
            }
        }
    });
}

Number.prototype.padLeft = function (n, str) {
    let s = String(this);
    while (s.length < n) {
        s = str + s;
    }
    return s;
}

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

Date.prototype.addHours = function(hours) {
    var date = new Date(this.valueOf());
    date.setHours(date.getHours() + hours);
    return date;
}

Date.prototype.addMinutes = function(minutes) {
    var date = new Date(this.valueOf());
    date.setMinutes(date.getMinutes() + minutes);
    return date;
}

Date.prototype.addSeconds = function(seconds) {
    var date = new Date(this.valueOf());
    date.setSeconds(date.getSeconds() + seconds);
    return date;
}

Date.prototype.addMilliseconds = function(milliseconds) {
    var date = new Date(this.valueOf());
    date.setMilliseconds(date.getMilliseconds() + milliseconds);
    return date;
}
