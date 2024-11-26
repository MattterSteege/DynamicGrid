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
        if (config.SymbolsToIgnore.length)
            normalizedKey = key.replace(new RegExp(`[${config.SymbolsToIgnore.join('')}]`, 'g'), '');
        else
            normalizedKey = key;
        if (!config.useStrictCase)
            normalizedKey = normalizedKey.toLowerCase();

        let normalizedField = '';
        if (config.SymbolsToIgnore.length)
            normalizedField = field.replace(new RegExp(`[${config.SymbolsToIgnore.join('')}]`, 'g'), '');
        else
            normalizedField = field;
        if (!config.useStrictCase)
            normalizedField = normalizedField.toLowerCase();

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
 * Gives the sum of an numbers array in 0(1) time.
 * @param {Array<number>} numbers The array of numbers to sum.
 * @returns {number} The sum of the numbers.
 */
function sum(numbers) {
    return numbers.reduce((acc, num) => acc + num, 0);
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