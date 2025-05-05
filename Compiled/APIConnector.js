class APIConnector {
    constructor(dynamicGrid, eventEmitter, config){

        this.dynamicGrid = dynamicGrid;
        this.eventEmitter = eventEmitter;

        this.endpoints = {
            get: config.endpoints.get || '',
            post: config.endpoints.post || '',
            put: config.endpoints.put || '',
            delete: config.endpoints.delete || '',
        }

        this.config = {
            timeoutDelay: config.options.timeoutDelay || 1000,
        }

        this.updates = [];



        //subscribe to events
        this.eventEmitter.subscribe('ui-cell-edit', this.onEdit.bind(this)); //When any cell is edited
        this.eventEmitter.subscribe('dg-save', this.onSave.bind(this)); //When the grid is saved
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
    onEdit(data){
        this.updates.push(data);

        if (this.config.timeoutDelay < 0) return;

        clearTimeout(this.updateTimeout);

        //send all updates to the API after x amount of time where no edits are made
        this.updateTimeout = setTimeout(async () => {
            const updates = this.updates;
            this.updates = [];
            this.post('update', updates)
            .then(response => {
                if (response.error) {
                    console.error('API Error:', response.error);
                    this.updates.push(...updates);
                }
                else {
                    this.eventEmitter.emit('dg-saved');
                }
            })
            .catch(error => {
                console.error('API Error:', error);
                this.updates.push(...updates);
            });
        }, this.config.timeoutDelay);
    }

    onSave(){
        if (this.updates.length === 0) return;

        const updates = this.updates;
        this.updates = [];
        this.post('update', updates)
        .then(response => {
            if (response.error) {
                console.error('API Error:', response.error);
                this.updates.push(...updates);
            }
            else {
                this.eventEmitter.emit('dg-saved');
            }
        })
        .catch(error => {
            console.error('API Error:', error);
            this.updates.push(...updates);
        });
    }

    //HELPERS
    async get(endpoint){
        const response = await fetch(this.endpoints.get + endpoint);
        return await response.json();
    }

    async post(endpoint, data){
        const response = await fetch(this.endpoints.post + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
        });
        return await response.json();
    }

    async put(endpoint, data){
        const response = await fetch(this.endpoints.put + endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
        });
        return await response.json();
    }

    async delete(endpoint){
        const response = await fetch(this.endpoints.delete + endpoint, {
            method: 'DELETE',
        });
        return await response.json();
    }
}