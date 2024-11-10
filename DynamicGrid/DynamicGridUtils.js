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