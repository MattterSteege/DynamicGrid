//throw new GridError('Invalid grid data'); <-- (sends error to console without stack trace)
class GridError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GridError';
        this.stack = '';
    }
}

function FastHash(string) {
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
 * Pins the location of an element to another element so that it moves with it
 * when the other element is moved, while also responding to scrolling and resizing.
 * @param baseElem
 * @param ElemToPin
 * @returns {boolean}
 */
function pinElement(baseElem, ElemToPin) {
    if (!baseElem || !ElemToPin) return false;

    // Update the position of ElemToPin relative to baseElem
    function updatePosition() {
        const baseRect = baseElem.getBoundingClientRect();
        const top = baseRect.top + window.scrollY;
        const left = baseRect.left + window.scrollX;
        ElemToPin.style.position = 'absolute';
        ElemToPin.style.top = `${top + baseRect.height}px`;
        ElemToPin.style.left = `${left}px`;
    }

    // Initial positioning
    updatePosition();

    // Attach event listeners for scroll and resize
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return true;
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
