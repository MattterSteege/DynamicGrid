class CSVExportConnector extends ExportConnector {
    constructor() {
        super();
        this.name = 'csv'
        this.mimeType = 'text/csv';
        this.extension = 'csv';
        this.delimiter = ';';
    }

    /**
     * Converts the data object into a CSV string.
     * @param {Array<Object>} data - The data to export.
     * @returns {string} - The CSV string.
     */
    export(data) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid or empty data provided for CSV export');
        }

        // Extract headers from the keys of the first object
        const headers = Object.keys(data[0]);

        // Map data rows to CSV format
        const rows = data.map(row =>
            headers.map(header => {
                const value = row[header];
                // Escape double quotes and wrap values in quotes if necessary
                return typeof value === 'string' && value.includes(this.delimiter)
                    ? `"${value.replace(/"/g, '""')}"`
                    : value;
            }).join(this.delimiter)
        );

        // Combine headers and rows into a single CSV string
        return [headers.join(this.delimiter), ...rows].join('\n');
    }
}

class XLSXExportConnector extends ExportConnector {
    constructor() {
        super();
        this.name = 'xlsx'
        this.mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        this.extension = 'xlsx';
    }


    //TODO: fix xlsx export
    export(data, headers) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = "https://unpkg.com/write-excel-file@1.4.30/bundle/write-excel-file.min.js";
            script.onload = () => {
                const rebuildHeaders = Object.keys(headers)
                    .filter((key) => headers.hasOwnProperty(key))
                    .map((key) => {
                        const header = headers[key];
                        return {
                            column: key,
                            type: header.type === 'string' ? String
                                : header.type === 'Number' ? Number
                                    : header.type === 'Boolean' ? Boolean
                                        : Date
                        };
                    });

                console.log(data, headers, rebuildHeaders);

                const blob = writeXlsxFile(data, {
                    columns: rebuildHeaders,
                    fileName: 'file.xlsx'
                });

                resolve(blob);
            };

            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    //https://unpkg.com/write-excel-file@1.4.30/bundle/write-excel-file.min.js
}