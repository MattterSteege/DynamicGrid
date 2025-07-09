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
     * @return {any} a single blob that complies with the defined filetype
     */
    export(data, headers, name) {
        throw new Error('Export or ExportAsync method not implemented');
    }

    /**
     * Exports the data in the specified format and triggers a download.
     * @param data {Array<Object>} data - The data to export.
     * @param headers {Object<Object>} headers - The headers to export.
     * @param name {String} name - The name of the file to be downloaded.
     * @returns {Promise<any>} - A promise that resolves when the export is complete.
     */
    exportAsync(data, headers, name) {
        throw new Error('ExportAsync or Export method not implemented');
    }

    _isMethodOverridden(methodName) {
        // Walk up the prototype chain to find where the method is defined
        let currentProto = Object.getPrototypeOf(this);

        while (currentProto && currentProto !== ExportConnector.prototype) {
            if (currentProto.hasOwnProperty(methodName)) {
                return true; // Found in a subclass
            }
            currentProto = Object.getPrototypeOf(currentProto);
        }

        return false; // Only found in base class
    }

    // Universal export with smart routing
    async smartExport(data, headers, name) {
        const hasExport = this._isMethodOverridden('export');
        const hasExportAsync = this._isMethodOverridden('exportAsync');

        if (hasExport && hasExportAsync) {
            // Both implemented - prefer sync for better performance
            return this.export(data, headers, name);
        } else if (hasExport) {
            return this.export(data, headers, name);
        } else if (hasExportAsync) {
            return await this.exportAsync(data, headers, name);
        } else {
            throw new Error('No export method implemented in subclass');
        }
    }
}