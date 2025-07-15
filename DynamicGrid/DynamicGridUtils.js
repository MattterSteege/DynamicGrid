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
function findMatchingIndexKey(dataIndexesKeys, field, config) {

    const normalize = str => {
        let result = str;
        if (config.SymbolsToIgnore?.length) {
            const regex = new RegExp(`[${config.SymbolsToIgnore.join('').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g');
            result = result.replace(regex, '');
        }
        return config.useStrictCase ? result : result.toLowerCase();
    };

    const normalizedField = normalize(field);
    return dataIndexesKeys.find(key => normalize(key) === normalizedField);
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

/**
 * Parses a formatted number string into a float based on locale settings.
 * @param {string} input - The formatted number string to parse.
 * @param {string|Object} [localeOrConfig='us'] - The locale identifier (e.g., 'us', 'eu') or a custom config object.
 * @throws {Error} If the locale or config object is invalid.
 * @example
 * //The config object should have the following structure:
 * {
 *   decimal: string, // The decimal separator (e.g., '.', ',')
 *   thousand: string, // The thousand separator (e.g., ',', '.')
 * }
 * @returns {number}
 */
function localeParseFloat(input, localeOrConfig = 'us') {
    if (typeof input !== 'string') return NaN;

    const trimmed = input.trim();

    // Extended locale map
    const localeConfig = {
        us: { decimal: ".", thousand: "," },
        eu: { decimal: ",", thousand: "." }
        // You can add more presets here
    };

    // Resolve config
    const config = typeof localeOrConfig === 'string'
        ? localeConfig[localeOrConfig]
        : localeOrConfig;

    if (!config || !config.decimal || !config.thousand) {
        throw new Error("Invalid locale or config object provided");
    }

    const { decimal, thousand } = config;

    // Escape special chars
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Regex for validating formatted number string
    const pattern = new RegExp(
        `^[+-]?((\\d{1,3}(${esc(thousand)}\\d{3})*)|\\d+)?(${esc(decimal)}\\d+)?$`
    );

    if (!pattern.test(trimmed)) return NaN;

    // Normalize: remove thousand separators, replace decimal with "."
    const normalized = trimmed
        .split(thousand).join('')
        .replace(decimal, '.');

    const result = Number(normalized);

    return Number.isNaN(result) ? NaN : result;
}

