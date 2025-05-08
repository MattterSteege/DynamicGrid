class ExportConnector {
    constructor() {
        this.name = 'ExportConnector';
        this.mimeType = 'application/octet-stream';
        this.extension = 'bin';
    }

    /**
     * The entrance point which is overwritten by the child, turns the data object into an downloadable blob for the client (must be overridden)
     * @param data {Array<Object>} data - The data to export.
     * @param headers {Object<Object>} headers - The headers to export.
     * @param name {String} name - The name of the file to be downloaded.
     * @example
     * //If you want to know the format of the data object,
     * //go to the console when an datagrid is instantiated and type
     * DynamicGrid.engine.data
     * DynamicGrid.engine.headers
     * @returns a single blob that complies with the defined filetype
     * @override Must be overridden by the child class
     */
    export(data, headers, name) {
        throw new Error('Export method not implemented');
    }
}