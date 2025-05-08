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


//TODO: implement https://www.npmjs.com/package/xlsx-js-style too!
class XLSXExportConnector extends ExportConnector {
    constructor() {
        super();
        this.name = 'xlsx'
        this.mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        this.extension = 'xlsx';

        // Initialize library loading
        this.loadLibrary();
    }

    /**
     * Load the SheetJS library in advance
     */
    loadLibrary() {
        // Check if the library is already loaded
        if (window.XLSX) return;

        // Create and append the script tag
        const script = document.createElement('script');
        script.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
        document.head.appendChild(script);
    }

    /**
     * Synchronously exports data to XLSX format
     * @param {Array<Object>} data - The data to export
     * @returns {Uint8Array} - The XLSX file as a binary array
     */
    export(data, headers, name) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid or empty data provided for XLSX export');
        }

        if (!window.XLSX) {
            throw new Error('XLSX library not loaded. Please try again in a moment.');
        }

        try {
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet');

            const headerCount = Object.keys(headers).length

            worksheet['!autofilter'] = { ref:"A1:" + this.getExcelHeaderLetter(headerCount - 1) + "1" };

            // Generate XLSX as an array
            const excelData = XLSX.write(workbook, {
                type: 'array',
                bookType: 'xlsx'
            });

            return excelData;
        } catch (error) {
            console.error('XLSX export failed:', error);
            throw error;
        }
    }

    getExcelHeaderLetter(index) {
        // Convert index to Excel column letter (A, B, C, ... AA, AB, ...)
        let letter = '';
        while (index >= 0) {
            letter = String.fromCharCode((index % 26) + 65) + letter;
            index = Math.floor(index / 26) - 1;
        }
        return letter;
    }
}