class ExportConnector {
    constructor() {
        this.name = 'ExportConnector';
        this.mimeType = 'application/octet-stream';
        this.extension = 'bin';
    }

    /**
     * The entrance point which is overwritten by the child, turns the data object into an downloadable blob for the client (must be overridden)
     * @param data
     * @param headers
     * @example
     * const data = [
     *  {
     *    index: 0,
     *    guid: 'e60c31c4-4b72-4835-94d4-6c2bf44f38ae',
     *    isActive: false,
     *    balance: 1230.39,
     *    ...
     *  },
     *  ...
     *  ];
     *
     *  export(data); //-> file blob
     *  @returns a single blob that complies with the defined filetype
     *  @override
     */
    export(data, headers) {
        throw new Error('Export method not implemented');
    }
}