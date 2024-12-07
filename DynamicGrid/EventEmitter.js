/**
 * A simple event emitter class.
 * @class
 * @example
 * const emitter = new EventEmitter();
 * emitter.sub('event', data => console.log(data));
 * emitter.emit('event', 'Hello, world!');
 * // Output: Hello, world!
 */
class EventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribe to an event.
     * @param {string} event - The name of the event to subscribe to. (case-insensitive)
     * @param {Function} listener - The callback function to execute when the event is emitted.
     */
    sub(event, listener) {
        if (!this.events[event.toLocaleLowerCase()]) {
            this.events[event.toLocaleLowerCase()] = [];
        }
        this.events[event.toLocaleLowerCase()].push(listener);
    }

    /**
     * Unsubscribe from an event.
     * @param {string} event - The name of the event to unsubscribe from. (case-insensitive)
     * @param {Function} listenerToRemove - The callback function to remove from the event.
     */
    unsub(event, listenerToRemove) {
        if (!this.events[event.toLocaleLowerCase()]) return;

        this.events[event.toLocaleLowerCase()] = this.events[event.toLocaleLowerCase()].filter(listener => listener !== listenerToRemove);
    }

    /**
     * Emit an event.
     * @param {string} event - The name of the event to emit. (case-insensitive)
     * @param {*} data - The data to pass to the event listeners.
     */
    emit(event, data) {
        if (!this.events[event.toLocaleLowerCase()]) return;

        this.events[event.toLocaleLowerCase()].forEach(listener => listener(data));
    }
}