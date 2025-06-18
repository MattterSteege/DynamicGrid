class EditTracker {
    constructor() {
        this.updates = [];
    }


    /**
     * @example
     * //data provided to the onEdit function
     *[
     *   {
     *        "column": STRING,               // The column name that was edited
     *        "row": {                        // the row that was edited in it's previous state
     *            "internal_id": NUMBER,      // The internal ID used inside the grid
     *            ...                         // Other row data (depends on the data source)
     *        },
     *        "previousValue": OBJECT,        // The previous value of the cell
     *        "newValue": OBJECT              // The new value of the cell
     *    },
     *    ...
     *];
     */
    addEdit(data) {
        this.updates.push(data);
        this.updates = this.cleanUpdates(this.updates);
    }

    cleanUpdates(updates) {
        const latestUpdates = new Map();

        // Group updates by row internal_id + column, and keep only the last one
        updates.forEach((update) => {
            const key = `${update.row.internal_id}_${update.column}`;
            latestUpdates.set(key, {...update});
        });

        // Filter out any updates where previousValue === newValue
        return Array.from(latestUpdates.values()).filter(update => update.previousValue !== update.newValue);
    }

    clear() {
        this.updates = [];

        //find all .body-cell.edited and remove the edited class
        const editedCells = document.querySelectorAll('.body-cell.edited');
        editedCells.forEach(cell => {
            cell.classList.remove('edited');
        });
    }
}