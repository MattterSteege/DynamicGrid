/**
 * Initializes the KeyboardShortcuts instance and binds the event listener.
 * @example
 * const shortcuts = new KeyboardShortcuts();
 * shortcuts.addShortcut('ctrl+s', event => console.log('Save'));
 * shortcuts.addShortcut('ctrl+z', event => console.log('Undo'));
 * shortcuts.addShortcut('ctrl+y', event => console.log('Redo'));
 *
 * shortcuts.listShortcuts(); // ['ctrl+s', 'ctrl+z', 'ctrl+y']
 *
 * shortcuts.removeShortcut('ctrl+z');
 * shortcuts.clearShortcuts();
 *
 * shortcuts.destroy();
 * @author Matt ter Steege (Kronk)
 */
class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.listener = this.#_handleKeyPress.bind(this);
        document.addEventListener('keydown', this.listener);
    }

    /**
     * Normalizes a key string by converting it to lowercase and removing whitespace.
     * @param {string} key - The key string to normalize.
     * @returns {string} The normalized key string.
     */
    #_normalizeKey(key) {
        return key.toLowerCase().replace(/\s+/g, '');
    }

    /**
     * Handles the keydown event and executes the corresponding shortcut callback if available.
     * This also prevents the default browser behavior for the shortcut key combination.
     * @param {KeyboardEvent} event - The keydown event.
     */
    #_handleKeyPress(event) {
        const pressedKey = this.#_normalizeKey(
            `${event.ctrlKey ? 'ctrl+' : ''}${event.shiftKey ? 'shift+' : ''}${event.altKey ? 'alt+' : ''}${event.metaKey ? 'meta+' : ''}${event.key}`
        );
        const callback = this.shortcuts.get(pressedKey);
        if (callback) {
            event.preventDefault();
            callback(event);
        }
    }

    /**
     * Adds a new keyboard shortcut.
     * @param {string} keys - The key combination for the shortcut (e.g., "ctrl+s").
     * @param {string} description - A description of the shortcut (optional, for documentation purposes).
     * @param {Function} callback - The function to execute when the shortcut is triggered.
     */
    addShortcut(keys, description, callback) {
        const normalizedKeys = this.#_normalizeKey(keys);
        if (this.shortcuts.has(normalizedKeys)) {
            console.warn(`Shortcut '${keys}' is already assigned.`);
        } else {
            this.shortcuts.set(normalizedKeys, callback);
        }
    }

    /**
     * Removes an existing keyboard shortcut.
     * @param {string} keys - The key combination of the shortcut to remove.
     */
    removeShortcut(keys) {
        const normalizedKeys = this.#_normalizeKey(keys);
        if (this.shortcuts.has(normalizedKeys)) {
            this.shortcuts.delete(normalizedKeys);
        } else {
            console.warn(`Shortcut '${keys}' does not exist.`);
        }
    }

    /**
     * Lists all registered keyboard shortcuts.
     * @returns {string[]} An array of registered key combinations.
     */
    listShortcuts() {
        return Array.from(this.shortcuts.keys());
    }

    /**
     * Clears all registered keyboard shortcuts.
     */
    clearShortcuts() {
        this.shortcuts.clear();
    }

    /**
     * Destroys the KeyboardShortcuts instance by removing the event listener and clearing shortcuts.
     */
    destroy() {
        document.removeEventListener('keydown', this.listener);
        this.clearShortcuts();
    }
}