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

        console.log(normalizedKey, normalizedField);

        return normalizedKey === normalizedField
    });
}