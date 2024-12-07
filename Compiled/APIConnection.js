class APIConnection {
    constructor(config){
        this.config = {
            baseURL: config.baseURL || '', // https://api.example.com/api/v1/
        }

        this.eventEmitter = null; //set/overwritten in init
    }

    init(eventEmitter){
        this.eventEmitter = eventEmitter;


        return true;
    }

    updateData(object){
        throw new Error("Method 'updateData(object)' not implemented.");
    }
}