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

//TODO: find a diffrent host for xlsx.bundle.js
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
        script.src = "https://grid.kronk.tech/xlsx.bundle.js";
        //type is script
        script.type = 'application/javascript';
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
            const ws = XLSX.utils.json_to_sheet(data);

            const headerCount = Object.keys(headers).length

            ws['!autofilter'] = { ref:"A1:" + this.getExcelHeaderLetter(headerCount - 2) + "1" };
            ws['!cols'] = this.fitToColumn(data)

            ws['!cols'].forEach((col, index) => {
                const colLetter = this.getExcelHeaderLetter(index);
                ws[colLetter + '1'].s = {
                    font: { bold: true, color: { rgb: 'FFFFFF' } },
                    fill: { fgColor: { rgb: '4BACC6' } },
                    alignment: { horizontal: 'left', vertical: 'top' },
                };
            });

            XLSX.utils.book_append_sheet(workbook, ws, 'Sheet');

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

    fitToColumn(data, headers) {
        const widths = []
        for (const field in data[0]) {
            widths.push({
                wch: Math.max(
                    field.length + 3, // Add some padding for the filter button
                    ...data.map(item => item[field]?.toString()?.length ?? 0)
                )
            })
        }
        return widths
    }
}

class JSONExportConnector extends ExportConnector {
    constructor() {
        super();
        this.name = 'json'
        this.mimeType = 'application/json';
        this.extension = 'json';
    }

    export(data, headers, name) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid or empty data provided for JSON export');
        }

        // Convert the data object to a JSON string
        return JSON.stringify(data, null, 2);
    }
}

class XMLExportConnector extends ExportConnector {
    constructor() {
        super();
        this.name = 'xml'
        this.mimeType = 'application/xml';
        this.extension = 'xml';
    }

    export(data, headers, name) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid or empty data provided for XML export');
        }

        // Convert the data object to an XML string
        const xmlString = this.jsonToXML(data);
        return xmlString;
    }

    jsonToXML(json) {
        let xml = '<root>\n';
        json.forEach(item => {
            xml += '  <item>\n';
            for (const key in item) {
                xml += `    <${key}>${item[key]}</${key}>\n`;
            }
            xml += '  </item>\n';
        });
        xml += '</root>';
        return xml;
    }
}

class HTMLExportConnector extends ExportConnector {
    constructor() {
        super();
        this.name = 'html'
        this.mimeType = 'text/html';
        this.extension = 'html';
    }

    export(data, headers, name) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid or empty data provided for HTML export');
        }

        // Convert the data object to an HTML string
        let htmlString = '<table>\n';
        htmlString += this.headersToHTML(Object.keys(headers));
        htmlString += this.jsonToHTML(data);
        htmlString += '</table>';
        return htmlString;
    }

    headersToHTML(headers) {
        let html = '  <tr>\n';
        headers.forEach(header => {
            html += `    <th>${header}</th>\n`;
        });
        html += '  </tr>\n';
        return html;
    }

    jsonToHTML(json) {
        let html = '';
        json.forEach(item => {
            html += '  <tr>\n';
            for (const key in item) {
                html += `    <td>${item[key]}</td>\n`;
            }
            html += '  </tr>\n';
        });
        return html;
    }
}

class TXTExportConnector extends ExportConnector {
    constructor() {
        super();
        this.name = 'txt'
        this.mimeType = 'text/plain';
        this.extension = 'txt';
    }

    export(data, headers, name) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid or empty data provided for TXT export');
        }

        // Convert the data object to a TXT string
        return data.map(item => Object.values(item).join('\t')).join('\n');
    }
}

/*
Diffrent filetypes exporting should suppert:
- [x] CSV
- [x] XLSX
- [x] JSON
- [ ] PDF
- [x] XML
- [x] HTML
- [X] TXT
- [ ] SQL
- [ ] YAML
- [ ] Markdown
 */