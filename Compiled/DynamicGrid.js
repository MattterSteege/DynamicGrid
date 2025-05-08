// ./DynamicGrid/DynamicGrid.js
/**
 * DynamicGrid is a library for rendering data in a grid format with dynamic querying capabilities.
 * @license MIT
 */

class DynamicGrid {
    constructor(config) {
        // Initialize the event emitter
        this.eventEmitter = new EventEmitter();
        this.keyboardShortcuts = new KeyboardShortcuts();

        // Initialize the query engine
        this.engine = new SJQLEngine(config.engine || {}, this.eventEmitter);
        // Initialize plugins
        this.engine.plugins = config.plugins ?? [];
        this.engine.addPlugin(new stringTypePlugin, true);
        this.engine.addPlugin(new numberTypePlugin, true);
        this.engine.addPlugin(new booleanTypePlugin, true);
        this.engine.addPlugin(new dateTypePlugin, true);

        this.engine.connectors = config.connectors || [];
        this.engine.addConnector(new CSVExportConnector(), true);
        this.engine.addConnector(new XLSXExportConnector(), true);
        this.engine.addConnector(new JSONExportConnector(), true);
        this.engine.addConnector(new XMLExportConnector(), true);
        this.engine.addConnector(new HTMLExportConnector(), true);
        this.engine.addConnector(new TXTExportConnector(), true);


        // Set up headers
        if (config.headers) {
            Object.entries(config.headers).forEach(([key, value]) => {

                if (typeof value === 'string') {
                    this.engine.headers[key] = { type: value, isUnique: false, isGroupable: true, isHidden: false, isEditable: true };
                }
                else {
                    this.engine.headers[key] = {
                        type: value.type || key,
                        isUnique: value.isUnique || false,
                        isGroupable: value.isGroupable  === undefined ? true : value.isGroupable,
                        isHidden: value.isHidden || false,
                        isEditable: value.isEditable === undefined ? true : value.isEditable,
                    };
                }
            });
        }

        // Set up UI
        this.virtualScrolling = config.ui.virtualScrolling ?? true; // Enable virtual scrolling
        this.rowHeight = config.ui.rowHeight || 40; // Default row height in pixels
        this.visibleRows = config.ui.visibleRows || 20; // Number of rows to render at once
        this.ui = new DynamicGridUI(this, config.ui, this.eventEmitter);

        // Set up **possible** API connector
        if (config.APIConnector && config.APIConnector.connector) {
            const APIconfig = config.APIConnector;
            this.APIConnector = new config.APIConnector.connector(this, this.eventEmitter, APIconfig);
            delete APIconfig.connector;
        }

        this.eventEmitter.emit('grid-initialized', { config });
    }


    /**
     * Imports data into the engine and creates a data index.
     * @param {string|object} data - The data to import.
     * @param {Object} [config] - The configuration for importing data.
     * @preserve
     */
    importData(data, config) {
        this.engine.importData(data, config);
        this.engine.createDataIndex();
        this.eventEmitter.emit('grid-data-imported', { data, config });
    }

    /**
     * Renders the UI based on the provided input.
     * @param {string} input - A query string or data object to render the UI.
     * @preserve
     */
    render(input) {
        this.ui.render(this.engine.query(input));
        this.eventEmitter.emit('ui-rendered', { input });
    }

    /**
     * Renders the UI with the provided data. This method does not run any queries, so the data must be pre-processed already.
     * @param {object} input - The data to render.
     * @preserve
     */
    renderRaw(input) {
        this.ui.render(input);
        this.eventEmitter.emit('ui-raw-rendered', { input });
    }

    //============================ SORTING, FILTERING, GROUPING, RANGE ============================
    /**
     * Adds a selection filter to the data.
     * @param {string} key - The key to filter by.
     * @param {string} operator - The operator to use for filtering.
     * @param {*} value - The value to filter by.
     */
    addSelect = (key, operator, value) => this.engine.addSelect(key, operator, value);

    /**
     * Sets a selection filter on the data. (This will override any existing filter for the same key.)
     * @param {string} key - The key to filter by.
     * @param {string} operator - The operator to use for filtering.
     * @param {*} value - The value to filter by.
     */
    setSelect = (key, operator, value) => this.engine.setSelect(key, operator, value);

    /**
     * Removes a selection filter from the data.
     * @param {string} key - The key to filter by.
     * @param {string} [operator] - The operator used for filtering.
     * @param {*} [value] - The value to filter by.
     */
    removeSelect = (key, operator, value) => this.engine.removeSelect(key, operator, value);

    /**
     * Sets the sort order for the data.
     * @param {string} key - The key to sort by.
     * @param {'asc'|'desc'} direction - The direction to sort.
     */
    setSort = (key, direction) => this.engine.setSort(key, direction);

    /**
     * Removes the sort order from the data.
     */
    removeSort = () => this.engine.removeSort();

    /**
     * Sets a range filter on the data.
     * @param {number} lower - The lower bound of the range.
     * @param {number} upper - The upper bound of the range.
     */
    setRange = (lower, upper) => this.engine.setRange(lower, upper);

    /**
     * Removes the range filter from the data.
     */
    removeRange = () => this.engine.removeRange();

    /**
     * Groups the data by the specified key.
     * @param {string} key - The key to group by.
     */
    setGroup = (key) => this.engine.setGroup(key);

    /**
     * Removes the grouping from the data.
     */
    removeGroup = () => this.engine.removeGroup();

    /**
     * Runs the current query and updates the grid.
     * @returns {*} - The result of the query.
     */
    runCurrentQuery = () => this.engine.runCurrentQuery();

    /**
     * Exports the current data in the specified format.
     * @param {string} [filename] - The name of the file to save.
     * @param {string} format - The format to export the data in. (optional if filename has extension)
     * @returns {void} - Results in an file download.
     */
    exportData = (filename, format) =>
        !format && filename && filename.includes('.')
            ? this.engine.requestExport(filename.split('.')[0], filename.split('.')[1])
            : this.engine.requestExport(filename, format);

    /**
     * Gets all export connectors.
     * @returns {Array<string>} - An array of all exportable formats.
     */
    get exportableFileFormats () {return this.engine.getExportConnectors();}
}


// ./DynamicGrid/DynamicGridUI.js
class DynamicGridUI {
    /**
     * @param {string} ui_config.containerId - The ID of the container for the grid. (required)
     * @param {number} ui_config.minColumnWidth - Minimum width for columns. (default: 5%)
     * @param {number} ui_config.rowHeight - Height of each row. (default: 40px)
     * @param {number} ui_config.bufferedRows - Number of buffered rows. (default: 10)
     * @param {'header'|'content'|'both'|'none'} ui_config.autoFitCellWidth - Determines how cell widths are auto-fitted. (default: 'header', options: 'header', 'content', 'both', 'none')
     * @param {KeyboardShortcuts} dynamicGrid.keyboardShortcuts - Keyboard shortcuts for the grid.
     * @param {SJQLEngine} dynamicGrid.engine - The query engine for the grid.
     * @event ui-cell-edit - Event fired when a cell is edited.
     */
    constructor(dynamicGrid, ui_config, eventEmitter) {
        this.dynamicGrid = dynamicGrid;
        this.containerId = ui_config.containerId;

        this.eventEmitter = eventEmitter;
        this.eventEmitter.emit('ui-initialized', { containerId: this.containerId });
        this.keyboardShortcuts = dynamicGrid.keyboardShortcuts;
        this.engine = dynamicGrid.engine;

        this.table = null;
        this.header = null;
        this.body = null;
        this.scrollContainer = null;

        this.config = {
            minColumnWidth: ui_config.minColumnWidth ?? 5,
            rowHeight: ui_config.rowHeight ?? 40,
            bufferedRows: ui_config.bufferedRows ?? 10,
            autoFitCellWidth: ui_config.autoFitCellWidth ?? 'header',

            allowFieldEditing: ui_config.allowFieldEditing ?? false,
        };

        this.#_init(this.containerId);

        this.UIChache = 0;
        this.UICacheRefresh = false;
        this.sortDirection = 'asc';


        //set up context menu
        this.contextMenu = new ContextMenu({
            width: 250,
            style: {
                accent: '#3b82f6',
                backgroundColor: '#ffffff',
                textColor: '#333333',
                padding: '4px',
            },
            closeOnClick: true,
            closeOnOutsideClick: true,
        });
    }

    render(data) {

        if (this.body && this.scrollContainer) {
            this.body.innerHTML = '';
            this.scrollContainer.innerHTML = '';
            this.body?.remove();
            this.scrollContainer?.remove();
        }

        if (!data || data.length === 0) {
            return;
        }

        const isGrouped = (data) => Array.isArray(firstItem(data));
        const isGroupedData = isGrouped(data);
        const columns = isGroupedData ? Object.keys(firstItem(data)[0]) : Object.keys(data[0]);
        const firstDataItem = isGroupedData ? firstItem(data)[0] : data[0];

        //check if the data has changed in its structure (can I keep the headers etc.)
        const cacheHash = FastHash(columns)
        this.UICacheRefresh = this.UIChache !== cacheHash;
        this.UIChache = cacheHash;

        if (this.UICacheRefresh) {
            this.table = this.#_createResizableTable(columns, firstDataItem, isGroupedData);
            this.#_initResizerDelegation();
        }

        this.#_renderTable(data, isGroupedData);
        this.eventEmitter.emit('ui-rendered', { data });
    }

    toggleColumn(index) {
        const columnWidth = this.columnWidths[index];
        this.columnWidths[index] = columnWidth === 0 ? 100 : 0;
        const showingColumns = this.columnWidths.filter(width => width > 0).length;
        this.columnWidths = this.columnWidths.map(width => width === 0 ? 0 : 100 / showingColumns);
        this.#_updateColumnWidths(this.table);
        this.eventEmitter.emit('ui-column-toggled', { index, columnWidths: this.columnWidths });
    }

    // ======================================== PRIVATE METHODS ========================================

    #_init(containerId) {
        this.container = document.querySelector(containerId);
        if (!this.container) {
            throw new GridError(`Container with id "${containerId}" not found`);
        }

        //register UI interactions and keyboard shortcuts
        this.keyboardShortcuts.addShortcut('ctrl+s', () => this.eventEmitter.emit('dg-save'));
        this.eventEmitter.emit('ui-container-initialized', { containerId });
    }


    #_initResizerDelegation() {
        this.table.addEventListener('mousedown', (e) => {
            const isMiddleButton = e.button === 1;

            const resizer = e.target.closest('.resizer');
            if (!resizer) return;

            const index = parseInt(resizer.getAttribute('data-index'), 10);
            let startX, startWidth, startNextWidth;

            const table = this.table;
            startX = e.clientX;
            startWidth = this.columnWidths[index];
            startNextWidth = this.columnWidths[index + 1];

            const onMouseMove = (e) => {
                const diff = e.clientX - startX;
                const widthChange = (diff / table.offsetWidth) * 100;

                const newWidth = startWidth + widthChange;
                const newNextWidth = startNextWidth - widthChange;

                if (newWidth >= this.config.minColumnWidth && newNextWidth >= this.config.minColumnWidth) {
                    this.columnWidths[index] = Number(newWidth.toFixed(2));
                    this.columnWidths[index + 1] = Number(newNextWidth.toFixed(2));
                    this.#_updateColumnWidths(table);
                }
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }


    #_renderTable(data, isGrouped) {
        const headers = isGrouped ? Object.keys(firstItem(data)[0]) : Object.keys(data[0]);
        headers.remove('internal_id');

        if (this.UICacheRefresh) {
            console.log('re-rendering header');
            // Generate header
            this.header = this.#_createTableHeader(headers);
            //this.table.style.gridTemplateColumns = headers.map((_, index) => `var(--column-width-${index + 1})`).join(' ');
            this.table.style.display = 'grid';
            this.table.style.gridTemplateRows = '40px 1fr';
            this.table.style.width = '100%';
            this.table.style.height = '100%';

            this.#_updateColumnWidths(this.table);
            this.table.appendChild(this.header);

        }

        // Virtual scrolling
        this.scrollContainer?.remove();
        this.scrollContainer = document.createElement('div');
        this.scrollContainer.className = 'scroll-container';
        this.scrollContainer.style.overflowY = 'auto';

        if (this.UICacheRefresh) {
            // Add a container for all rows
            this.body = document.createElement('div');
            this.body.className = 'body-container';
        }

        if (!isGrouped) {
            this.scrollContainer.appendChild(this.body);
            this.scrollContainer.addEventListener('scroll', () =>
                this.#_updateVisibleRows(data, headers, this.body, this.scrollContainer)
            );

            this.table.appendChild(this.scrollContainer);
            this.container.appendChild(this.table);
            this.#_updateVisibleRows(data, headers, this.body, this.scrollContainer);
        }
        else {

            this.body = this.#_createGroupedTable(data, headers);

            this.scrollContainer = document.createElement('div');
            this.scrollContainer.className = 'scroll-container';
            this.scrollContainer.style.overflowY = 'auto';

            this.scrollContainer.appendChild(this.body);
            this.table.appendChild(this.scrollContainer);
            this.container.appendChild(this.table);
        }
    }

    #_updateVisibleRows(data, headers, container, scrollContainer) {
        const totalRows = data.length;
        const totalHeight = totalRows * this.config.rowHeight;

        container.style.position = 'relative';
        container.style.height = `${totalHeight}px`;

        const scrollTop = scrollContainer.scrollTop;
        const containerHeight = scrollContainer.offsetHeight;

        const startRow = Math.max(0, Math.floor(scrollTop / this.config.rowHeight) - this.config.bufferedRows);
        const endRow = Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / this.config.rowHeight) + this.config.bufferedRows);

        const visibleRowsContainer = document.createElement('div');
        visibleRowsContainer.style.position = 'absolute';
        visibleRowsContainer.style.top = `${startRow * this.config.rowHeight}px`;
        visibleRowsContainer.style.left = '0';
        visibleRowsContainer.style.right = '0';
        visibleRowsContainer.style.display = 'grid';
        visibleRowsContainer.style.gridTemplateColumns = headers.map((_, index) => `var(--column-width-${index + 1})`).join(' ');

        for (let i = startRow; i < endRow; i++) {
            const tableRow = this.#_createTableRow();
            tableRow.setAttribute('data-index', data[i]['internal_id']);
            headers.forEach((header) => {
                const cell = this.#_createTableCell(data[i], header);
                tableRow.appendChild(cell);
            });

            visibleRowsContainer.appendChild(tableRow);
        }

        if (container.lastChild) {
            container.removeChild(container.lastChild);
        }
        container.appendChild(visibleRowsContainer);
        this.eventEmitter.emit('ui-visible-rows-updated', { startRow, endRow });
    }


    #_createGroupedTable(data, headers) {
        this.body?.remove();

        this.body = document.createElement('div');
        this.body.className = 'body-container';

        const keys = Object.keys(data);
        for (const key of keys) {
            const dataGroup = data[key];

            const details = document.createElement('details');
            details.open = false;
            details.style.margin = '0';
            details.style.padding = '0';
            details.style.border = '0';
            details.style.outline = '0';
            details.style.fontSize = '100%';
            details.style.verticalAlign = 'baseline';
            details.style.backgroundColor = 'transparent';
            details.style.display = 'block';

            details.addEventListener('toggle', (e) => {
                const isOpen = details.open;
                if (isOpen) {
                    this.#_updateVisibleRows(dataGroup, headers, viewer, scrollContainer);
                }
                else {
                    viewer.innerHTML = '';
                    viewer.removeAttribute('style');

                }
            })

            const summary = document.createElement('summary');
            summary.innerHTML = `<strong>${key}</strong>`;
            details.appendChild(summary);

            const scrollContainer = document.createElement('div');
            scrollContainer.className = 'scroll-container';
            scrollContainer.style.overflowY = 'auto';
            scrollContainer.style.maxHeight = '700px'; // Example height, customize as needed

            const viewer = document.createElement('div');
            viewer.className = 'viewer';
            scrollContainer.appendChild(viewer);

            details.appendChild(scrollContainer);

            // Populate rows inside viewer with virtual scrolling
            scrollContainer.addEventListener('scroll', () => {
                this.#_updateVisibleRows(dataGroup, headers, viewer, scrollContainer);
            });

            this.body.appendChild(details);
        }

        return this.body;
    }

    //======================================== TABLE FACTORY ========================================
    #_createResizableTable(columns, data, isgrouped) {
        if (!this.UICacheRefresh)
            return this.table;
        else
            this.table?.remove();

        if (isgrouped)
        {
            columns = Object.keys(data[0]);
        }

        this.columnWidths = this.#_calculateColumnWidths(data, columns);

        this.table = document.createElement('div');
        this.table.className = 'table';

        // Apply initial column widths
        this.#_updateColumnWidths(this.table);
        return this.table;
    }

    #_calculateColumnWidths(data, columns) {
        columns = columns.filter(column => column !== 'internal_id'); // Remove 'internal_id'

        //base the width of the columns on the length of the header as a percentage of the total header length
        if (this.config.autoFitCellWidth === 'header') {
            const charCount = columns.reduce((acc, header) => acc + header.length, 0);
            this.columnWidths = columns.map(header => (header.length / charCount) * 100);
        }
        //base the width of the columns on the length of the content as a percentage of the total content length
        else if (this.config.autoFitCellWidth === 'content') {
            const charCount = columns.reduce((acc, header) => acc + Math.max(data[header].toString().length, 5), 0);
            this.columnWidths = columns.map(header => (Math.max(data[header].toString().length, 5) / charCount) * 100);
        }
        //base the width of the columns on the length of the header and content as a percentage of the total header and content length
        else if (this.config.autoFitCellWidth === 'both') {
            const charCount = columns.reduce((acc, header) => acc + Math.max(header.length, 5) + Math.max(data[header].toString().length, 5), 0);
            this.columnWidths = columns.map(header => ((Math.max(header.length, 5) + Math.max(data[header].toString().length, 5)) / charCount) * 100);
        }
        //use 1/n*100% for each column where n is the number of columns
        else if (this.config.autoFitCellWidth === 'none' || !this.config.autoFitCellWidth) {
            this.columnWidths = Array(columns.length).fill(100 / columns.length);
        }

        return this.columnWidths;
    }

    #_createTableHeader(headers) {

        const createTableCell = (headers) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = headers;

            if (!this.engine.headers[headers].isEditable) {
                //subtle styling for non-editable cells
                cell.style.backgroundColor = '#fafafa';
                cell.style.color = '#333';
                cell.style.fontStyle = 'italic';
                cell.style.cursor = 'default';
            }

            return cell;
        }

        const header = document.createElement('div');
        header.className = 'row header';
        header.style.display = 'grid';
        header.style.gridTemplateColumns = headers.map((_, index) => `var(--column-width-${index + 1})`).join(' ');

        // Create header row
        headers.forEach((_header, index) => {
            const cell = createTableCell(_header);
            cell.title = _header;
            cell.setAttribute('value_type', this.engine.headers[_header].type);
            cell.setAttribute('editable', this.engine.headers[_header].isEditable);

            cell.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.sortColumn !== _header) {
                    this.sortColumn = _header;
                    this.sortDirection = 'asc';
                }
                else {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                }
                this.engine.setSort(this.sortColumn, this.sortDirection);
                this.render(this.engine.runCurrentQuery());
            });

            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.engine.getPlugin(cell.getAttribute('value_type')).showMore(cell.title, cell, this.engine, this);
            });

            index < headers.length - 1 && cell.appendChild(this.#_createResizer(index));

            header.appendChild(cell);
        });


        return header;
    }

    #_createTableRow() {
        const row = document.createElement('div');
        row.className = 'row';
        row.style.display = 'contents';
        return row;
    }

    #_createTableCell(data, column) {
        const content = data[column];
        const headerData = this.engine.headers[column];
        const plugin = this.engine.getPlugin(headerData.type);

        if (!this.config.allowFieldEditing || !headerData.isEditable) {
            const cell =  plugin.renderCell(content)

            cell.classList.add('cell');

            if (!headerData.isEditable) {
                //subtle styling for non-editable cells
                cell.style.backgroundColor = '#fafafa';
                cell.style.color = '#333';
                cell.style.fontStyle = 'italic';
                cell.style.cursor = 'default';
            }

            return cell;
        }
        else {
            const onEdit = (callback) => {
                callback = plugin.parseValue(callback);
                this.engine.alterData(data['internal_id'], column, callback);
                this.eventEmitter.emit('ui-cell-edit', { column: column, row: data, previousValue: content, newValue: callback });
            }

            const cell = plugin.renderEditableCell(content, onEdit);
            cell.classList.add('cell');
            return cell;
        }
    }

    #_createResizer(index) {
        const resizer = document.createElement('div');
        resizer.className = 'resizer';
        resizer.setAttribute('data-index', index);

        let startX, startWidth, startNextWidth;

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const table = resizer.closest('.table');
            startX = e.clientX;
            startWidth = this.columnWidths[index];
            startNextWidth = this.columnWidths[index + 1];

            const onMouseMove = (e) => {
                const diff = e.clientX - startX;
                const widthChange = (diff / table.offsetWidth) * 100;

                // Calculate new widths
                const newWidth = startWidth + widthChange;
                const newNextWidth = startNextWidth - widthChange;

                // Apply changes only if both columns remain within min width
                if (newWidth >= this.config.minColumnWidth && newNextWidth >= this.config.minColumnWidth) {
                    this.columnWidths[index] = Number(newWidth.toFixed(2));
                    this.columnWidths[index + 1] = Number(newNextWidth.toFixed(2));
                    this.#_updateColumnWidths(table);
                }
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        return resizer;
    }

    #_updateColumnWidths(table) {
        this.columnWidths.forEach((width, index) => {
            table.style.setProperty(`--column-width-${index + 1}`, `${width}%`);
        });
    }
}

/*
optimizations:
[ ] virtual scrolling
[ ] add one event listener to the table and use event delegation (use e.target to get the clicked element)



*/


// ./DynamicGrid/typePlugins/TypePlugin.js
/**
 * Abstract base class for type-specific plugins that handle data operations and rendering.
 * @abstract
 */
class TypePlugin {
    /**
     * Standard operators available to all type plugins
     * @readonly
     * @static
     */
    static DEFAULT_OPERATORS = ['==', '!=', 'in'];

    /**
     * Initialize the plugin
     */
    constructor() {
        if (this.constructor === TypePlugin) {
            throw new Error('TypePlugin is abstract and cannot be instantiated directly');
        }

        this.name = this.constructor.name;
        //if this.operators is set and the value it is set to is not equal to the default operators, then set the operators to those operators + the default operators
        this.operators = ['==', '!=', 'in'];
    }

    /**
     * Validate if a value is acceptable for this type
     * @param {*} value The value to validate
     * @returns {boolean} True if valid
     * @abstract
     */
    validate(value) {
        throw new Error('validate must be implemented by subclass');
    }

    /**
     * Parses the string representation of a value into the appropriate type
     * @param {string} value The string value to parse
     * @returns {*} Parsed value
     * @abstract
     */
    parseValue(value) {
        throw new Error('parseValue must be implemented by subclass');
    }

    /**
     * Evaluate a query against data
     * @param {Object} query Query to evaluate
     * @param {Map<string, Set>} dataIndexes Map of column names to indices
     * @param {Array<Array>} data Data rows to evaluate
     * @param {Set<number>} indices Set of row indices to consider
     * @returns {*} Query result
     * @abstract
     */
    evaluate(query, dataIndexes, data, indices) {
        throw new Error('evaluate must be implemented by subclass');
    }

    /**
     * Evaluate a condition against a data value
     * @param {*} dataValue Value from data
     * @param {string} operator Comparison operator
     * @param {*} compareValue Value to compare against
     * @returns {boolean} Result of comparison
     * @abstract
     */
    evaluateCondition(dataValue, operator, compareValue) {
        throw new Error('evaluateCondition must be implemented by subclass');
    }

    /**
     * Sort data based on query parameters
     * @param {{field: string, value: 'asc'|'desc'}} query Sort parameters
     * @param {Array<Object>} data Data to sort
     * @returns {Array<Object>} Sorted data
     */
    sort(query, data) {
        const { field, value: direction } = query;

        return [...data].sort((a, b) => {
            const comparison = String(a[field]).localeCompare(String(b[field]));
            return direction === 'asc' ? comparison : -comparison;
        });
    }

    /**
     * Check if an operator is supported
     * @param {string} operator Operator to check
     * @returns {boolean} True if operator is supported
     * @protected
     */
    checkOperator(operator) {
        return this.operators.find(op => op === operator) || false;
    }

    /**
     * Get all supported operator symbols
     * @returns {string[]} Array of operator symbols
     * @protected
     */
    getOperatorSymbols() {
        return [...this.operators];
    }


    /**
     * Create a table data cell
     * @param {*} value Cell value (that can be .toString()ed)
     * @return {HTMLElement} Data cell element (div)
     * @virtual (should be overridden, not required)
     */
    renderCell(value) {
        const cell = document.createElement('div');
        cell.innerText = String(value);
        return cell;
    }

    /**
     * Create a table data cell for editing
     * @param {*} value Cell value (that can be .toString()ed)
     * @param {Function} onEdit Callback function for when cell is edited
     * @returns {HTMLElement} Data cell element (div)
     * @virtual (should be overridden, not required)
     */
    renderEditableCell(value, onEdit) {
        const cell = document.createElement('div');
        cell.innerHTML = String(value);
        cell.contentEditable = true;
        cell.spellcheck = false;

        cell.addEventListener('focusout', (e) => {
            onEdit(cell.innerText);
        });

        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                cell.blur();
                e.preventDefault();
            }
        });

        return cell;
    }

    /**
     * Handle additional data loading
     * @param {string} key Data key
     * @param {HTMLElement} element Clicked element
     * @param {SJQLEngine} engine Query engine instance
     * @param {DynamicGridUI} UI User interface instance
     * @virtual (should be overridden, not required)
     */
    showMore(key, element, engine, UI) {
        const {x, y, width, height} = element.getBoundingClientRect();
        const typeOptions = engine.headers[key];

        console.log(typeOptions);

        UI.contextMenu.clear();
        UI.contextMenu
            .button('Sort ' + key + ' ascending', () => {
                engine.setSort(key, 'asc');
                UI.render(engine.runCurrentQuery());
            })
            .button('Sort ' + key + ' descending', () => {
                engine.setSort(key, 'desc');
                UI.render(engine.runCurrentQuery());
            })
            .button('Unsort ' + key, () => {
                engine.setSort(key);
                UI.render(engine.runCurrentQuery());
            });

        if (!typeOptions.isUnique && typeOptions.isGroupable) {
            UI.contextMenu
            .separator()
            .button('Group by ' + key, () => {
                engine.setGroup(key);
                UI.render(engine.runCurrentQuery());
            })
            .button('Un-group', () => {
                engine.setGroup();
                UI.render(engine.runCurrentQuery());
            })
        }

        // Display the context menu at the specified coordinates
        UI.contextMenu.showAt(x, y + height);
    }
}

// ./DynamicGrid/typePlugins/InherentTypePlugin.js
class stringTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = ['%=', '=%', '*=', '!*=', '==', '!=', 'in'] //starts with, ends with, contains, does not contain, equals, not equals, in
    }

    validate(value) {
        return typeof value === 'string';
    }

    parseValue(value) {
        if (value === null || value === undefined) return null;
        return String(value);
    }

    //query = {field: 'name', operator: 'eq', value: 'John'}
    evaluate(query, dataIndexes, data, indices) {
        //loop over the indices and remove the ones that do not match the query
        //console.log('using ' + (dataIndexes?.size <= indices?.size ? 'dataIndexes' : 'indices') + ' sorting for stringTypePlugin');
        if (dataIndexes && indices && dataIndexes.size <= indices.size) {
            for (const index of dataIndexes.keys()) {
                if (!this.evaluateCondition(index, query.operator, query.value)) {
                    dataIndexes.get(index).forEach(idx => indices.delete(idx));
                }
            }
        }
        else {
            for (const index of indices) {
                if (!this.evaluateCondition(data[index][query.field], query.operator, query.value)) {
                    indices.delete(index);
                }
            }
        }

        return indices;
    }

    //dataValue is the value of the field in the data, value is the value in the query
    evaluateCondition(dataValue, operator, value) {
        if (operator === 'in') {
            value = JSON.parse(value);
        }

        if (Array.isArray(value) && value.length > 0 && operator === 'in') {
            return value.includes(dataValue);
        }

        switch (operator) {
            case '==':
                return dataValue === value;
            case '!=':
                return dataValue !== value;
            case '%=':
                return dataValue.startsWith(value);
            case '=%':
                return dataValue.endsWith(value);
            case '*=':
                return dataValue.includes(value);
            case '!*=':
                return !dataValue.includes(value);
        }

        return false;
    }

    sort(query, data) {
        const {field, value} = query;
        return data.sort((a, b) => {
            if (value === 'asc') {
                return a[field].localeCompare(b[field]);
            }
            else if (value === 'desc') {
                return b[field].localeCompare(a[field]);
            }
        });
    }
}

class numberTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = ['>', '<', '>=', '<=', '==', '!=', 'in', '><']; //greater than, less than, greater than or equal, less than or equal, equals, not equals, in, between
    }

    validate(value) {
        // Check if the value is a number or can be converted to a number
        if (value === null || value === undefined) return false;

        return !isNaN(Number(value)) ||
               (value.split('-').length === 2 && !isNaN(Number(value.split('-')[0])) && !isNaN(Number(value.split('-')[1])));
    }

    parseValue(value) {
        if (value === null || value === undefined) return null;
        return Number(value);
    }

    //indices is a set of indices that match the query
    evaluate(query, dataIndexes, data, indices) {

        //loop over the indices and remove the ones that do not match the query
        //.log('using ' + (dataIndexes?.size <= indices?.size ? 'dataIndexes' : 'indices') + ' sorting for numberTypePlugin');
        if (dataIndexes && indices && dataIndexes.size <= indices.size) {
            for (const index of dataIndexes.keys()) {
                if (!this.evaluateCondition(index, query.operator, query.value)) {
                    dataIndexes.get(index).forEach(idx => indices.delete(idx));
                }
            }
        }
        else {
            for (const index of indices) {
                if (!this.evaluateCondition(data[index][query.field], query.operator, query.value)) {
                    indices.delete(index);
                }
            }
        }

        return indices;
    }

    evaluateCondition(dataValue, operator, value) {

        if (operator === 'in') {
            value = JSON.parse(value);
        }
        else if (operator === '><') {
            value = value.split("-");
        }

        if (Array.isArray(value) && value.length > 0 && operator === 'in') {
            return value.includes(dataValue);
        }

        if (Array.isArray(value) && value.length > 0 && operator === '><') {
            if (isNaN(value[0]) || isNaN(value[1])) throw new Error('between operator requires two numbers');
            if (value[0] > value[1]) throw new Error('between operator requires first value to be less than second value');

            console.log(value[0] + ' < ' + dataValue + ' < ' + value[1], dataValue >= value[0] && dataValue <= value[1]);

            return dataValue >= value[0] && dataValue <= value[1];
        }



        dataValue = Number(dataValue);
        value = Number(value);

        switch (operator) {
            case '>':
                return dataValue > value;
            case '<':
                return dataValue < value;
            case '>=':
                return dataValue >= value;
            case '<=':
                return dataValue <= value;
            case '==':
                return dataValue === value;
            case '!=':
                return dataValue !== value;
        }
    }

    renderCell(value) {
        const cell = document.createElement('div');
        const parts = value.toString().split("."); // Ensure two decimal places
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "."); // Add dots for thousands
        cell.textContent = parts.join(",");
        return cell;
    }

    sort(query, data) {
        const {field, value} = query;
        return data.sort((a, b) => {
            if (value === 'asc') {
                return a[field] - b[field];
            }
            else if (value === 'desc') {
                return b[field] - a[field];
            }
        });
    }

    showMore(key, element, engine, UI) {
        const {x, y, width, height} = element.getBoundingClientRect();
        const typeOptions = engine.headers[key];
        const vanTot = {van: Number.MIN_SAFE_INTEGER, tot: Number.MAX_SAFE_INTEGER};

        UI.contextMenu.clear();
        UI.contextMenu
            .submenu('Filter ' + key, (submenu) => {
                var operator = '==';
                submenu
                .dropdown('Filter ' + key, [
                    { label: 'Gelijk aan', value: '==' },
                    { label: 'Niet gelijk aan', value: '!=' },
                    { label: 'Groter dan', value: '>' },
                    { label: 'Groter dan of gelijk aan', value: '>=' },
                    { label: 'Kleiner dan', value: '<' },
                    { label: 'Kleiner dan of gelijk aan', value: '<=' },
                    { label: 'tussen', value: '><' },
                    { label: 'blank', value: '== null' },
                    { label: 'niet blank', value: '!= null' },
                ], {
                    value: '==',
                    onChange: (value) => {
                        operator = value;
                    },
                    id: 'dropdown-id'
                })
                    .input('Filter', {
                        placeholder: 'Filter',
                        onChange: (value) => {
                            engine.setSelect(key, operator, value);
                            UI.render(engine.runCurrentQuery());
                        },
                        showWhen: {
                            elementId: 'dropdown-id',
                            value: ['==', '!=', '>', '<', '>=', '<='],
                        }
                    })
                    .input('Filter', {
                        placeholder: 'Van',
                        onChange: (value) => {
                            vanTot.van = value || Number.MIN_SAFE_INTEGER;
                            if (vanTot.tot === Number.MAX_SAFE_INTEGER || vanTot.van > vanTot.tot) return;

                            engine.setSelect(key, '><', vanTot.van + "-" + vanTot.tot);
                            UI.render(engine.runCurrentQuery());
                        },
                        showWhen: {
                            elementId: 'dropdown-id',
                            value: ['><'],
                        }
                    })
                    .input('Filter', {
                        placeholder: 'Tot',
                        onChange: (value) => {
                            vanTot.tot = value || Number.MAX_SAFE_INTEGER;
                            if (vanTot.van === Number.MIN_SAFE_INTEGER || vanTot.tot <= vanTot.van) return;
                            engine.setSelect(key, '><', vanTot.van + "-" + vanTot.tot);
                            UI.render(engine.runCurrentQuery());
                        },
                        showWhen: {
                            elementId: 'dropdown-id',
                            value: ['><'],
                        }
                    })
            });


        UI.contextMenu
            .button('Sort ' + key + ' ascending', () => {
                engine.setSort(key, 'asc');
                UI.render(engine.runCurrentQuery());
            })
            .button('Sort ' + key + ' descending', () => {
                engine.setSort(key, 'desc');
                UI.render(engine.runCurrentQuery());
            })
            .button('Unsort ' + key, () => {
                engine.setSort(key);
                UI.render(engine.runCurrentQuery());
            });

        if (!typeOptions.isUnique && typeOptions.isGroupable) {
            UI.contextMenu
                .separator()
                .button('Group by ' + key, () => {
                    engine.setGroup(key);
                    UI.render(engine.runCurrentQuery());
                })
                .button('Un-group', () => {
                    engine.setGroup();
                    UI.render(engine.runCurrentQuery());
                })
        }

        // Display the context menu at the specified coordinates
        UI.contextMenu.showAt(x, y + height);
    }
}

class booleanTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = ['==', '!='];
    }

    validate(value) {
        value = Boolean(value);
        return value === true || value === false;
    }

    parseValue(value) {
        if (value === null || value === undefined) return null;
        return Boolean(value);
    }

    evaluate(query, dataIndexes, data, indices) {
        query.value = query.value === 'true';
        if (dataIndexes){
            //since we have already filtered the data based on the value,
            //we can just return the set of indices (because there are only two possible values)
            const allowedValues = dataIndexes.get(query.value);
            return new Set([...indices].filter(idx => allowedValues.has(idx)));
        }
        else {
            return new Set(data
                .map((row, i) => row[query.field] === query.value ? i : null)
                .filter(x => x !== null));
        }
    }

    evaluateCondition(dataValue, operator, value) {
        return Boolean(dataValue) === Boolean(value);
    }

    sort(query, data) {
        const {field, value} = query;
        return data.sort((a, b) => {
            if (value === 'asc') {
                return a[field] - b[field];
            }
            else if (value === 'desc') {
                return b[field] - a[field];
            }
        });
    }

    renderCell(value) {
        const cell = document.createElement('div');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttributeNode(document.createAttribute('disabled'));
        value ? checkbox.setAttributeNode(document.createAttribute('checked')) : null;
        checkbox.style.width = '-webkit-fill-available';
        cell.appendChild(checkbox);
        return cell;
    }

    renderEditableCell(value, onEdit) {
        const cell = document.createElement('div');

        //render a checkbox that is checked if value is true
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        value ? checkbox.setAttributeNode(document.createAttribute('checked')) : null;
        checkbox.style.width = '-webkit-fill-available';
        checkbox.name = 'checkbox';

        checkbox.addEventListener('change', (e) => {
            onEdit(checkbox.checked);
        });

        cell.appendChild(checkbox);
        return cell;
    }

    showMore(key, element, engine, UI) {

        const {x, y, width, height} = element.getBoundingClientRect();
        UI.contextMenu.clear();
        UI.contextMenu
            .button('Sort ' + key + ' ascending', () => {
                engine.setSort(key, 'asc');
                UI.render(engine.runCurrentQuery());
            })
            .button('Sort ' + key + ' descending', () => {
                engine.setSort(key, 'desc');
                UI.render(engine.runCurrentQuery());
            })
            .button('Unsort ' + key, () => {
                engine.setSort(key);
                UI.render(engine.runCurrentQuery());
            })
            .separator()
            .button('Only show true', () => {
                engine.addSelect(key, '==', 'true');
                engine.removeSelect(key, '==', 'false');
                UI.render(engine.runCurrentQuery());
            })
            .button('Only show false', () => {
                engine.addSelect(key, '==', 'false');
                engine.removeSelect(key, '==', 'true');
                UI.render(engine.runCurrentQuery());
            })
            .button('Show all', () => {
                engine.removeSelect(key, '==', 'true');
                engine.removeSelect(key, '==', 'false');
                UI.render(engine.runCurrentQuery());
            })
            .separator()
            .button('Group by ' + key, () => {
                engine.setGroup(key);
                UI.render(engine.runCurrentQuery());
            })
            .button('Un-group', () => {
                engine.setGroup();
                UI.render(engine.runCurrentQuery());
            });
        // Display the context menu at the specified coordinates
        UI.contextMenu.showAt(x, y + height);
    }
}

/**
 * Date type plugin for the DynamicGrid
 * @class dateTypePlugin
 * @extends numberTypePlugin
 * @description This plugin is used to handle date values in the DynamicGrid. It extends the numberTypePlugin and provides additional functionality for parsing, rendering, and editing date values.
 * @constructor
 * @param {boolean} [onlyDate=false] - If true, only the date part will be shown (no time)
 * @param {boolean} [writeMonthFully=false] - If true, the month will be written fully (e.g. January instead of 01)
 */
class dateTypePlugin extends numberTypePlugin {
    constructor(onlyDate = false, writeMonthAsText = true) {
        super();

        this.options = {
            onlyDate: onlyDate, //only show date (no HH:mm:ss)
            writeMonthAsText: writeMonthAsText, //write month short (e.g. Jan instead of 01)
        }

        this.monthsShort = [
            'jan', 'feb', 'mar', 'apr', 'mei', 'jun',
            'jul', 'aug', 'sep', 'okt', 'nov', 'dec'
        ];

        this.monthsShortEnglish = [
            'jan', 'feb', 'mar', 'apr', 'may', 'jun',
            'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
        ];
    }

    /**
     * Parse the value to a date
     * @param value
     * @returns {number} - The date in milliseconds since 1970
     * @example
     * const allowedDatesFormats = [
     *     '13-09-2024', // dd-MM-yyyy
     *     '13-Sep-2024', // dd-MMM-yyyy
     *     '13-September-2024', // dd-MMMM-yyyy
     *     '13-09-24', // dd-MM-yy
     *     '13-Sep-24', // dd-MMM-yy
     *     '13-September-24', // dd-MMMM-yy
     *     '13-09-2024 14:30:00', // dd-MM-yyyy HH:mm:ss
     *     '13-Sep-2024 14:30:00', // dd-MMM-yyyy HH:mm:ss
     *     '13-September-2024 14:30:00', // dd-MMMM-yyyy HH:mm:ss
     *     '13-09-24 14:30:00', // dd-MM-yy HH:mm:ss
     *     '13-Sep-24 14:30:00', // dd-MMM-yy HH:mm:ss
     *     '13-September-24 14:30:00', // dd-MMMM-yy HH:mm:ss
     *     1694591400000, // Timestamp in milliseconds
     *     1694591400 // Timestamp in seconds
     * ]
     */
    parseValue(value) {
        //value is either a datestring or a timestamp in seconds or milliseconds
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') {

            //parse this date to UTC ms timestamp
            //[d|dd]-[MM|MMM|MMMM]-[yy|yyyy] [HH:mm:ss]
            const dateParts = value.split(' ');
            const date = dateParts[0].split('-');
            const time = dateParts[1] ? dateParts[1].split(':') : ['0', '0', '0'];
            const day = parseInt(date[0]);
            const month = isNaN(Number(date[1])) ? this.monthsShort.indexOf(date[1].substring(0,3).toLowerCase()) + 1 === -1 ? this.monthsShortEnglish.indexOf(date[1].substring(0,3).toLowerCase()) + 1 : this.monthsShort.indexOf(date[1].substring(0,3).toLowerCase()) + 1 : parseInt(date[1]);
            const year = parseInt(date[2]) < 1000 ? parseInt(date[2]) + 2000 : parseInt(date[2]);
            const hours = parseInt(time[0] ?? '0');
            const minutes = parseInt(time[1] ?? '0');
            const seconds = parseInt(time[2] ?? '0');
            const d = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
            const utc = d.getTime();
            //console.log('parsed date', d, utc);
            //check if the date is in seconds or milliseconds
            if (utc < 1e10) { //1e10
                return utc * 1000;
            }
            else {
                return utc;
            }
        }
        else if (typeof value === 'number') {
            //check if the value is in seconds or milliseconds
            if (value < 1e10) { //1e10
                value *= 1000;
            }
            return value;
        }
    }

    dateToString(date) {
        if (date === null || date === undefined) return null;
        const d = new Date(0);

        if (date < 1e10) { //1e10
            date *= 1000;
        }

        d.setUTCMilliseconds(date);
        
        /*
        when onlyDate is true, return the date in the format dd-MM-yyyy
        when onlyDate is false, return the date in the format dd-MM-yyyy HH:mm:ss
            if HH:mm:ss is 00:00:00, return the date in the format dd-MM-yyyy
        when writeMonthAsText is true, return the date in the format dd-MMM-yyyy
        when writeMonthAsText is false, return the date in the format dd-MM-yyyy
         */

        const day = d.getUTCDate().toString().padStart(2, '0');
        const month = this.options.writeMonthAsText ? this.monthsShort[d.getUTCMonth()] : (d.getUTCMonth() + 1).toString().padStart(2, '0');
        const year = d.getUTCFullYear().toString().padStart(4, '0');
        const hours = d.getUTCHours().toString().padStart(2, '0');
        const minutes = d.getUTCMinutes().toString().padStart(2, '0');
        const dateString = this.options.onlyDate || (hours + minutes === "0000") ? `${day}-${month}-${year}` : `${day}-${month}-${year} ${hours}:${minutes}`;
        return dateString;
    }

    renderCell(value) {
        const cell = document.createElement('div');
        cell.innerText = this.dateToString(value);
        return cell;
    }

    renderEditableCell(value, onEdit) {
        const cell = this.renderCell(value);
        cell.contentEditable = true;

        cell.addEventListener('focusout', (e) => {

            console.log(cell.innerText, this.parseValue(cell.innerText));

            const date = this.parseValue(cell.innerText);

            onEdit(date);

            cell.innerText = this.dateToString(date);
        });

        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                cell.blur();
                e.preventDefault();
            }
        });

        return cell;
    }
}

// ./DynamicGrid/exportConnectors/ExportConnector.js
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
     * @override Must be overridden by the child class
     */
    export(data, headers, name) {
        throw new Error('Export method not implemented');
    }
}

// ./DynamicGrid/exportConnectors/InherentExportConnector.js
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
        script.src = "xlsx.bundle.js";
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

// ./DynamicGrid/QueryParser.js
class QueryParser {
    constructor(config) {
        this.config = {
            useStrictCase: config.useStrictCase || false,
            SymbolsToIgnore: config.SymbolsToIgnore || [' ', '_', '-']
        }
    }

    // Constants for special query types, make sure that the order is from most specific to least specific
    static QUERIES = {
        GROUP: /group\s+(.+)/i,      //'group [key]', group by key
        RANGE: /range\s+(-?\d+)-?(-?\d+)?/i,    //'range [value]', limit the number of results (value = 10, 20-30, -10)
        SORT: /sort\s+(.+)\s+(asc|desc)/i,//'sort [key] [value]', sort by key (sort name asc)
        SELECT: /(.+)\s+(\S+)\s+(.+)/i    //'[key] [operator] [value]', select items where key is value
    };

    //MAIN PARSING FUNCTION
    /**
     * Parses the query string into a query plan
     * @param query
     * @param plugins
     * @param headers
     * @returns {Array<{type: string, field: string, operator: string, value: string, queryType: string}>}
     */
    parseQuery(query, plugins, headers){
        return query.split(/\s+and\s+|\s+&&\s+/i)
                    .map(subQuery => this.parseSubQuery(subQuery.trim(), plugins, headers))
                    .filter(query => query.queryType);
    }


    parseSubQuery(subQuery, plugins, headers) {
        subQuery = subQuery.endsWith(' and') ? subQuery.slice(0, -4) : subQuery;

        if (!subQuery || subQuery.length === 0) {
            return {};
        }

        //from bottom to top, check if the QUERIES matches the subquery
        for (const [type, regex] of Object.entries(QueryParser.QUERIES)) {
            const match = regex.exec(subQuery);
            if (match) {
                return this.parseMatch(match, type, plugins, headers) || {};
            }
        }
        console.warn('Invalid query: ' + subQuery + '\n' + 'Valid queries are: ' + Object.keys(QueryParser.QUERIES).join(', ').toLowerCase() + '\n' + 'Query: ' + subQuery);
        return {};
    }

    /**
     * Parses a match into a query plan
     * @param match
     * @param type
     * @param plugins
     * @param headers
     * @returns {{type: string, field: string, operator: string, value: string, queryType: string}}
     */
    parseMatch(match, type, plugins, headers) {
        //console.log(match, type);
        if (type === 'SELECT') {
            let [_, key, operator, value] = match;
            key = MeantIndexKey(Object.keys(headers), key, this.config);
            const pluginType = headers[key].type;
            const plugin = plugins[pluginType];
            if (!plugin) {
                throw new GridError('No plugin found for header (' + pluginType + ') for key (' + key + ')\nDo you know certain that the name of the key is correct?');
            }

            let field = key;
            let operatorObj = plugin.checkOperator(operator);

            if (!operatorObj) {
                throw new GridError(this.formatOperatorError(operator, field + ' ' + operator + ' ' + value, plugin));
            }

            if (!plugin.validate(value)) return;

            return {type: pluginType, field, operator: operatorObj, value, queryType: 'SELECT'};
        }
        else if (type === 'SORT') {
            let [_, key, value] = match;
            const pluginType = headers[key].type;
            const plugin = plugins[pluginType];
            if (!plugin) {
                throw new GridError('No plugin found for header (' + pluginType + ') for key (' + key + ')');
            }
            return {type: pluginType, field: key, operator: 'sort', value, queryType: 'SORT'};
        }
        else if (type === 'RANGE') {
            let [_, lower, upper] = match;
            if (upper === undefined) {
                upper = lower;
                lower = 0;
            }
            lower = parseInt(lower);
            upper = parseInt(upper);
            return {type: 'range', lower, upper, queryType: 'RANGE'};
        }
        else if (type === 'GROUP') {
            let [_, key] = match;
            return {type: 'group', field: key, queryType: 'GROUP'};
        }
        else {
            console.warn('Invalid query: ' + match + '\n' + 'Valid queries are: ' + Object.keys(QueryParser.QUERIES).join(', ').toLowerCase());
            return {};
        }
    }

    formatOperatorError(operator, field, plugin) {
        return [
            '\n\nInvalid operator:    ' + operator,
            '       For query:    ' + field,
            '     options are:    ' + plugin.getOperatorSymbols().join(', '),
            '\n'
        ].join('\n');
    }
}



// ./DynamicGrid/SJQLEngine.js
/**
 * @file manages the SQL-like query engine for the grid, handling data parsing, indexing, and query execution.
 * @module SJQLEngine
 */
class SJQLEngine {
    constructor(engine_config, eventEmitter) {
        this.data = [];
        this.headers = [];
        this.plugins = [];
        this.connectors = [];
        this.futureQuery = [];
        this.QueryParser = new QueryParser(engine_config);

        this.config = {
            UseDataIndexing: engine_config.UseDataIndexing || true,
            useStrictCase: engine_config.useStrictCase || false,
            SymbolsToIgnore: engine_config.SymbolsToIgnore || [' ', '_', '-']
        };

        this.eventEmitter = eventEmitter;

        this.currentQueryStr = '';
    }

    createDataIndex() {
        if (!this.config.UseDataIndexing) return;

        // Create indexes for faster querying
        this.dataIndexes = {};
        Object.keys(this.headers).forEach(header => {
            this.dataIndexes[header] = new Map();
            this.data.forEach((row, idx) => {
                const value = row[header];
                if (!this.dataIndexes[header].has(value)) {
                    this.dataIndexes[header].set(value, new Set());
                }
                this.dataIndexes[header].get(value).add(idx);
            });
        });
    }

    autoDetectHeaders(data) {
        //if value is true or false, it's a boolean
        //else if value is a number, it's a number
        //else it's a string
        for (const key of Object.keys(data)) {
            if (data[key] === true || data[key] === false) {
                this.headers[key] = { type: 'boolean', isUnique: false, isHidden: false };
            }
            else if (!isNaN(data[key])) {
                this.headers[key] = { type: 'number', isUnique: false, isHidden: false };
            }
            else {
                this.headers[key] = { type: 'string', isUnique: false, isHidden: false };
            }
        }
    }

    query(query = '') {
        if (!this.data || this.data.length === 0) {
            console.warn('No data provided, returning empty array');
            return [];
        }

        if (!query || query === '') {
            console.warn('No query provided, returning all data');
            this.currentQueryStr = '';
            return this.data;
        }

        return this.#_query(this.QueryParser.parseQuery(query, this.plugins, this.headers));
    }

    #_query(query) {
        // Early exit if no queries
        if (!query || query.length === 0) {
            this.currentQueryStr = '';
            console.warn('No valid query provided, returning all data');
            return this.data;
        }

        // Separate queries by type
        const selectQueries = [];
        let sortQuery = null, rangeQuery = null, groupQuery = null;

        // Pre-process queries
        for (const q of query) {
            switch (q.queryType) {
                case 'SELECT': selectQueries.push(q); break;
                case 'SORT': sortQuery = q; break;
                case 'RANGE': rangeQuery = q; break;
                case 'GROUP': groupQuery = q; break;
            }
        }

        // Save the current query string
        this.currentQueryStr = '';
        selectQueries.forEach(q => this.currentQueryStr += q.field + ' ' + q.operator + ' ' + q.value + ' and ');
        if (sortQuery) this.currentQueryStr += 'sort ' + sortQuery.field + ' ' + sortQuery.value + ' and ';
        if (rangeQuery) this.currentQueryStr += 'range ' + rangeQuery.lower + ' ' + rangeQuery.upper + ' and ';
        if (groupQuery) this.currentQueryStr += 'group ' + groupQuery.field + ' and ';
        this.currentQueryStr = this.currentQueryStr.slice(0, -5);

        let log = "";
        if (selectQueries.length > 0) log += 'SELECT queries: ' + selectQueries.map(q => q.field + ' ' + q.operator + ' ' + q.value).join(', ') + '\n';
        if (sortQuery) log += 'SORT query: ' + sortQuery.field + ' ' + sortQuery.value + '\n';
        if (rangeQuery) log += 'RANGE query: ' + rangeQuery.lower + ' ' + rangeQuery.upper + '\n';
        if (groupQuery) log += 'GROUP query: ' + groupQuery.field + '\n';
        log += this.currentQueryStr;

        // Initialize valid indices as all data indices
        let validIndices = new Set(this.data.keys());
        let groupedData = null;

        // Process SELECT queries
        for (const q of selectQueries) {
            q.field = MeantIndexKey(Object.keys(this.data[0]), q.field, this.config);
            const plugin = this.getPlugin(q.type);
            if (!plugin) throw new GridError(`No plugin found for header (${q.type}) for key (${q.field})`);
            validIndices = plugin.evaluate(q, this.dataIndexes[q.field], this.data, validIndices);
        }

        // Process RANGE query
        if (rangeQuery) {
            const first = validIndices.values().next().value;
            const lower = Math.max(0, first + rangeQuery.lower);
            const upper = Math.min(this.data.length - 1, first + rangeQuery.upper - 1);
            validIndices = new Set(Array.from({ length: upper - lower + 1 }, (_, i) => i + lower));
        }

        // Process GROUP query
        if (groupQuery) {
            const groupField = MeantIndexKey(Object.keys(this.data[0]), groupQuery.field, this.config);
            groupedData = {};

            // Group rows by the specified field
            for (const index of validIndices) {
                const row = this.data[index];
                const groupKey = row[groupField];
                (groupedData[groupKey] ||= []).push(row); // Use nullish coalescing for concise grouping
            }

            // Sort groups if required
            if (sortQuery) {
                console.warn('Sorting grouped data is not yet supported');
            }

            return groupedData;
        }

        // Sort if no grouping
        if (sortQuery) {
            const sortedData = this.data.filter((_, i) => validIndices.has(i));
            return this.getPlugin(sortQuery.type).sort(sortQuery, sortedData);
        }

        // Return filtered data
        return this.data.filter((_, i) => validIndices.has(i));
    }

    //================================================== SELECT ==================================================
    addSelect(key, operator, value) {
        if (!key || !operator || value === undefined) return;

        const newClause = `${key} ${operator} ${value}`;

        if (this.currentQueryStr.length === 0)
            this.currentQueryStr = newClause;
        else
            this.currentQueryStr += `and ${newClause}`;
    }

    setSelect(key, operator, value) {
        this.removeSelect(key);
        this.addSelect(key, operator, value);
    }

    removeSelect(key, operator, value) {
        if (key !== undefined && operator === undefined && value === undefined) {
            // Remove all clauses with the specified key
            this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith(key)).join(' and ');
        }

        else if (key !== undefined && operator !== undefined && value === undefined) {
            // Remove all clauses with the specified key and operator
            this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith(`${key} ${operator}`)).join(' and ');
        }
        else if (key !== undefined && operator !== undefined && value !== undefined) {
            // Remove the specific clause
            const clauseToRemove = `${key} ${operator} ${value}`;
            this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => clause.trim() !== clauseToRemove).join(' and ');
        }
    }

    //================================================== SORT ==================================================
    setSort(key, direction) {
        if (key === undefined || direction === undefined) {
            this.removeSort();
            return;
        }

        const newClause = `sort ${key} ${direction}`;

        this.removeSort();

        if (this.currentQueryStr.length === 0)
            this.currentQueryStr = newClause;
        else
            this.currentQueryStr += ` and ${newClause}`;
    }

    removeSort() {
        // Remove the sort clause
        this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith('sort')).join(' and ');
    }

    //================================================== RANGE ==================================================
    setRange(lower, upper) {
        if (lower === undefined || upper === undefined) {
            this.removeRange();
            return;
        }

        const newClause = `range ${lower} ${upper}`;

        this.removeRange();

        if (this.currentQueryStr.length === 0)
            this.currentQueryStr = newClause;
        else
            this.currentQueryStr += ` and ${newClause}`;
    }

    removeRange() {
        // Remove the range clause
        this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith('range')).join(' and ');
    }

    //================================================== GROUP ==================================================
    setGroup(key) {
        if (key === undefined){
            this.removeGroup();
            return;
        }

        const newClause = `group ${key}`;

        this.removeGroup();

        if (this.currentQueryStr.length === 0)
            this.currentQueryStr = newClause;
        else
            this.currentQueryStr += ` and ${newClause}`;
    }

    removeGroup() {
        // Remove the group clause
        this.currentQueryStr = this.currentQueryStr.split('and').filter(clause => !clause.trim().startsWith('group')).join(' and ');
    }

    runCurrentQuery() {
        grid.eventEmitter.emit('engine-query-update', grid.engine.currentQueryStr);
        return this.query(this.currentQueryStr);
    }

    //================================================== PLUGIN SYSTEM ==================================================
    addPlugin(plugin, dontOverride = false) {
        if (!(plugin instanceof TypePlugin)) {
            throw new GridError('Plugin must extend TypePlugin');
        }

        //if already exists, remove it and add the new one, while warning the user
        const existingPlugin = this.getPlugin(plugin.name, true);
        if (dontOverride && existingPlugin) return;
        if (existingPlugin && !dontOverride) {
            console.warn('Plugin already exists, removing the old plugin');
            //set the new plugin to have key of the name of the plugin
            this.plugins[plugin.name.replace("TypePlugin", "")] = plugin;
        }
        else {
            this.plugins[plugin.name.replace("TypePlugin", "")] = plugin;
        }
    }

    /**
     * Retrieves a plugin by its name.
     *
     * @param {string} name - The name of the plugin to retrieve.
     * @param {boolean} [justChecking=false] - If true, only checks if the plugin exists without throwing an error.
     * @returns {TypePlugin|boolean} - The plugin if found, or false if not found and justChecking is true.
     * @throws {GridError} - If the plugin name is not provided or the plugin is not found and justChecking is false.
     */
    getPlugin(name, justChecking = false) {
        if (!name) throw new GridError('Plugin name not provided');
        if (typeof name !== 'string') return false;

        const plugin = this.plugins[name.replace("TypePlugin", "")];

        if (!plugin && !justChecking) throw new GridError('Plugin not found: ' + name);
        else if (!plugin && justChecking)  return false;


        return plugin;
    }

    //================================================== EXPORT CONNECTORS ==================================================
    addConnector(Connector, dontOverride = false) {
        if (!(Connector instanceof ExportConnector)) {
            throw new GridError('Connector must extend ExportConnector');
        }

        //if already exists, remove it and add the new one, while warning the user
        const existingConnector = this.getConnector(Connector.name, true);
        if (dontOverride && existingConnector) return;
        if (existingConnector && !dontOverride) {
            console.warn('Connector already exists, removing the old Connector');
            //set the new Connector to have key of the name of the Connector
            this.connectors[Connector.name.replace("ExportConnector", "")] = Connector;
        }
        else {
            this.connectors[Connector.name.replace("ExportConnector", "")] = Connector;
        }
    }

    /**
     * Retrieves a Connector by its name.
     *
     * @param {string} name - The name of the Connector to retrieve.
     * @param {boolean} [justChecking=false] - If true, only checks if the Connector exists without throwing an error.
     * @returns {ExportConnector|boolean} - The Connector if found, or false if not found and justChecking is true.
     * @throws {GridError} - If the Connector name is not provided or the Connector is not found and justChecking is false.
     */
    getConnector(name, justChecking = false) {
        if (!name) throw new GridError('Connector name not provided');
        if (typeof name !== 'string') return false;

        const Connector = this.connectors[name];

        if (!Connector && !justChecking) throw new GridError('Connector not found: ' + name);
        else if (!Connector && justChecking)  return false;


        return Connector;
    }

    //================================================== IMPORT ==================================================
    importData(data, config) {
        if (this.data && this.data.length > 0) {
            throw new GridError('Data already imported, re-importing data is not (yet) supported');
        }

        if (config.type === 'json') {
            this.#parseJsonData(data, config);
        } else if (config.type === 'csv') {
            this.#parseCSVData(data, config);
        } else {
            throw new GridError('Invalid data type');
        }

        //if headers are not provided, auto-detect them
        if (Object.keys(this.headers).length === 0) {
            console.warn('No headers provided, auto detecting headers, please provide so the system can you more optimal plugins');
            this.autoDetectHeaders(this.data[0]);
        }
    }

    alterData(datum, column, value) {
        if (this.data && this.data.length > 0) {
            this.data[datum][column] = value;
        }
    }

    #parseJsonData(data, config) {
        if (!(typeof data === 'string')) {
            throw new GridError('Data must be a string (raw JSON)');
        }

        data = JSON.parse(data);

        if (!Array.isArray(data)) {
            throw new GridError('Data must be an array');
        }

        if (data.length === 0) {
            console.warn('No data provided');
            return [];
        }

        this.data = data.map((item, index) => {
            const newItem = {};
            newItem['internal_id'] = index
            for (const key of Object.keys(item)) {
                newItem[key] = item[key];
            }
            return newItem;
        });
    }

    #parseCSVData(data, config) {
        const lines = data.split('\n');
        //split by the config.delimiter character, but only if it's not inside quotes
        const headers = lines[0].split(",").map(header => header.replace(/"/g, '').replace(" ", "_").replace("\r", ''));
        // console.log(headers);
        this.data = lines.slice(1).map((line, index) => {
            const values = line.split(/(?!"[a-zA-z0-9\s.()]*)(?:,|,"|",)(?![a-zA-z0-9\s.()]*")/mgi);
            const newItem = {};
            newItem['internal_id'] = index;
            headers.forEach((header, i) => {
                if (typeof values[i] === 'string')
                    values[i].endsWith('"') ? values[i] = values[i].slice(0, -1) : values[i];
                newItem[header] = values[i];
            });
            return newItem;
        })
        .slice(0, -1);
    }

    //=================================================== EXPORT ==================================================
    /**
     * Request and handle an export in the specified file type
     * @param {string} fileName - The name for the exported file
     * @param {string} fileType - The type of file to export (e.g., 'csv', 'xlsx')
     */
    requestExport(fileName, fileType) {
        const Connector = this.getConnector(fileType);
        if (!Connector) {
            console.error('Connector not found: ' + fileType);
            return;
        }

        // Prepare data without internal_id
        const exportData = this.data.map(row => {
            const newRow = {};
            Object.keys(row).forEach(key => {
                if (key !== 'internal_id') {
                    newRow[key] = row[key];
                }
            });
            return newRow;
        });

        try {
            //export the data without the internal_id
            const exportResult = Connector.export(this.data.map(row => {
                const newRow = {};
                Object.keys(row).forEach(key => {
                    if (key !== 'internal_id') {
                        newRow[key] = row[key];
                    }
                });
                return newRow;
            }), this.headers, fileName);

            if (!exportResult) {
                console.warn('No data returned for export');
                return;
            }

            // Create a blob using the returned data
            const blob = new Blob([exportResult], { type: Connector.mimeType });

            // Create a download link and trigger it
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName || 'export'}.${Connector.extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error.message)
            alert('Export failed. See console for details.');
        }
    }

    getExportConnectors = () => Object.keys(this.connectors);
}

// ./DynamicGrid/DynamicGridUtils.js
//throw new GridError('Invalid grid data'); <-- (sends error to console without stack trace)
class GridError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GridError';
        this.stack = '';
    }
}

function FastHash(object) {
    const string = JSON.stringify(object);

    let hash = 0;
    for (let i = 0; i < string.length; i++) {
        hash = ((hash << 5) - hash) + string.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

/**
* Code to find the closest matching key in a list of keys (with some config options)
* @param {Array<string>} dataIndexesKeys
* @param {string} field
* @param {Object} config
* @returns {string}
*/
function MeantIndexKey(dataIndexesKeys, field, config) {
    // I'm SO sorry for this code (•́︵•̀)
    return dataIndexesKeys.find(key => {
        let normalizedKey = '';
        let normalizedField = '';
        if (config.SymbolsToIgnore.length){

            normalizedKey = key.replace(new RegExp(`[${config.SymbolsToIgnore.join('')}]`, 'g'), '');
            normalizedField = field.replace(new RegExp(`[${config.SymbolsToIgnore.join('')}]`, 'g'), '');
        }
        else{
            normalizedKey = key;
            normalizedField = field;
        }

        if (!config.useStrictCase) {
            normalizedKey = normalizedKey.toLowerCase();
            normalizedField = normalizedField.toLowerCase();
        }

        return normalizedKey === normalizedField
    });
}

/**
 * Gets the first item from a structure that may include numeric or named keys.
 * @param {Object|Array} data The structure to get the first item from.
 * @returns {any|boolean} The first item or false if the input is invalid.
 */
function firstItem(data) {
    if (!data || typeof data !== 'object') return false;

    if (Array.isArray(data)) {
        // Handle standard arrays
        return data[0];
    }

    // Handle objects with numeric and named keys
    const keys = Object.keys(data);

    return data[keys[0]];
}

/**
 * removes a entry from an array
 * @param {Array<string>} entry
 * @returns {Array<string>}
 */
Array.prototype.remove = function (entry) {
    const index = this.indexOf(entry);
    if (index > -1) {
        this.splice(index, 1);
    }
    return this;

}

/**
 * Waits for the state to become true, checking every second.
 * @returns {Promise<boolean>} A promise that resolves when the state is true.
 * @author jabaa
 * @see https://stackoverflow.com/a/69424610/18411025
 */
async function waitState() {
    return new Promise(resolve => {
        let timerId = setInterval(checkState, 1000);

        function checkState() {
            if (o.state == true) {
                clearInterval(timerId);
                resolve(o.state);
            }
        }
    });
}

Number.prototype.padLeft = function (n, str) {
    let s = String(this);
    while (s.length < n) {
        s = str + s;
    }
    return s;
}

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

Date.prototype.addHours = function(hours) {
    var date = new Date(this.valueOf());
    date.setHours(date.getHours() + hours);
    return date;
}

Date.prototype.addMinutes = function(minutes) {
    var date = new Date(this.valueOf());
    date.setMinutes(date.getMinutes() + minutes);
    return date;
}

Date.prototype.addSeconds = function(seconds) {
    var date = new Date(this.valueOf());
    date.setSeconds(date.getSeconds() + seconds);
    return date;
}

Date.prototype.addMilliseconds = function(milliseconds) {
    var date = new Date(this.valueOf());
    date.setMilliseconds(date.getMilliseconds() + milliseconds);
    return date;
}


// ./DynamicGrid/libs/EventEmitter.js
/**
 * A simple event emitter class.
 * @class
 * @example
 * const emitter = new EventEmitter();
 * emitter.sub('event', data => console.log(data));
 * emitter.emit('event', 'Hello, world!');
 * // Output: Hello, world!
 */
class EventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribe to an event.
     * @param {string} event - The name of the event to subscribe to. (case-insensitive)
     * @param {Function} listener - The callback function to execute when the event is emitted.
     */
    subscribe(event, listener) {
        if (!this.events[event.toLocaleLowerCase()]) {
            this.events[event.toLocaleLowerCase()] = [];
        }
        this.events[event.toLocaleLowerCase()].push(listener);
        return () => this.unsubscribe(event, listener);
    }

    /**
     * Subscribe to an event. (alias for subscribe)
     * @param {string} event - The name of the event to subscribe to. (case-insensitive)
     * @param {Function} listener - The callback function to execute when the event is emitted.
     */
    on = this.subscribe; // Alias for subscribe

    /**
     * Unsubscribe from an event.
     * @param {string} event - The name of the event to unsubscribe from. (case-insensitive)
     * @param {Function} listenerToRemove - The callback function to remove from the event.
     */
    unsubscribe(event, listenerToRemove) {
        if (!this.events[event.toLocaleLowerCase()]) return;

        this.events[event.toLocaleLowerCase()] = this.events[event.toLocaleLowerCase()].filter(listener => listener !== listenerToRemove);
    }

    /**
     * Unsubscribe from an event. (alias for unsubscribe)
     * @param {string} event - The name of the event to unsubscribe from. (case-insensitive)
     * @param {Function} listenerToRemove - The callback function to remove from the event.
     */
    off = this.unsubscribe; // Alias for unsubscribe

    /**
     * Emit an event.
     * @param {string} event - The name of the event to emit. (case-insensitive)
     * @param {*} data - The data to pass to the event listeners.
     */
    emit(event, data) {
        if (!this.events[event.toLocaleLowerCase()]) return;

        this.events[event.toLocaleLowerCase()].forEach(listener => listener(data));
    }
}

// ./DynamicGrid/libs/KeyboardShortcuts.js
class KeyboardShortcuts {
    /**
     * Initializes the KeyboardShortcuts instance and binds the event listener.
     *
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
     */
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
     * @param {Function} callback - The function to execute when the shortcut is triggered.
     */
    addShortcut(keys, callback) {
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

// ./DynamicGrid/libs/ContextMenu.js
class ContextMenu {
    static ITEM_TYPES = {
        BUTTON: 'button',
        SEPARATOR: 'separator',
        SUBMENU: 'submenu',
        INPUT: 'input',
        DROPDOWN: 'dropdown',
        CHECKBOX: 'checkbox',
        RADIO: 'radio',
        SEARCH_SELECT: 'search-select',
    };

    static CLASSNAMES = {
        BUTTON: 'context-menu-button',
        SUBMENU: 'context-menu-submenu',
        SEPARATOR: 'context-menu-separator',
        MENU: 'context-menu',
        INPUT: 'context-menu-input',
        DROPDOWN: 'context-menu-dropdown',
        CHECKBOX: 'context-menu-checkbox',
        RADIO: 'context-menu-radio',
        CONTAINER: 'context-menu-container',
        SEARCH_SELECT: 'context-menu-search-select',
        ICON: 'context-menu-icon',
        LABEL: 'context-menu-label'
    };

    constructor(options = {}) {
        // Initialize with a more intuitive options object
        this.options = {
            width: options.width || 200,
            animation: {
                enabled: options.animation?.enabled ?? true,
                duration: options.animation?.duration || 200,
                timing: options.animation?.timing || 'ease-out'
            },
            position: {
                xOffset: options.position?.xOffset || 0,
                yOffset: options.position?.yOffset || 0
            },
            icons: options.icons || {
                submenu: '❯'
            },
            style: {
                backgroundColor: options.style?.backgroundColor || '#ffffff',
                textColor: options.style?.textColor || '#333333',
                backgroundHoverColor: options.style?.backgroundHoverColor || '#f0f0f0',
                border: options.style?.border || 'rgba(0, 0, 0, 0.08)',
                shadow: options.style?.shadow || '0 10px 25px rgba(0, 0, 0, 0.1)',
                accent: options.style?.accent || '#3b82f6',
                separator: options.style?.separator || 'rgba(0, 0, 0, 0.08)',

                padding: options.style?.padding || '10px',
                paddingHorizontal: options.style?.paddingHorizontal || '15px',
                gap: options.style?.gap || '10px',
                borderRadius: options.style?.borderRadius || '8px',
                borderRadiusInput: options.style?.borderRadiusInput || '4px',
                fontSize: options.style?.fontSize || '14px',
                transition: options.style?.transition || '0.2s',
                transitionFast: options.style?.transitionFast || '0.1s',
                transitionInput: options.style?.transitionInput || '0.2s',
            },
            indentLevel: options.indentLevel || 0,
            isRoot: options.isRoot === undefined,
            closeOnClick: options.closeOnClick,
            closeOnOutsideClick: options.closeOnOutsideClick,
        };
        this.items = [];
        this.id = this._generateId();
        this.installStyles();
    }

    // Simplified API for adding menu items
    addItem(type, config) {
        const item = {
            id: (config?.id ?? this._generateId()) + '',
            type,
            position: this.items.length,
            ...config
        };

        if (item.id === undefined) {
            item.id = this._generateId();
        }

        if (item.type === ContextMenu.ITEM_TYPES.SUBMENU) {
            item.submenu.options.indentLevel = (this.options.indentLevel || 0) + 1;
        }

        // Validate based on type
        this._validateItem(item);
        this.items.push(item);
        return this;
    }

    // Fluent API methods for different item types
    button(text, action, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.BUTTON, {
            text,
            action,
            icon: config.icon,
            ficon: config.ficon,
            disabled: config.disabled,
            marked: config.marked,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    input(label, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.INPUT, {
            label,
            placeholder: config.placeholder,
            value: config.value,
            onChange: config.onChange,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    dropdown(label, options, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.DROPDOWN, {
            label,
            options,
            value: config.value,
            onChange: config.onChange,
            multiSelect: config.multiSelect,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    checkbox(text, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.CHECKBOX, {
            text,
            checked: config.checked || false,
            onChange: config.onChange,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    radioGroup(name, options, config = {}) {
        options.forEach(option => {
            this.addItem(ContextMenu.ITEM_TYPES.RADIO, {
                label: option.label,
                value: option.value,
                name,
                checked: option.checked,
                onChange: config.onChange,
                showWhen: config.showWhen,
                id: config.id,
            });
        });
        return this;
    }

    separator() {
        return this.addItem(ContextMenu.ITEM_TYPES.SEPARATOR, {});
    }

    submenu(text, submenuBuilder, config = {}) {
        const options = {
            ...this.options, // Inherit options from parent
            isRoot: false,
            indentLevel: (this.options.indentLevel || 0) + 1, // Increment indent level
            showWhen: config.showWhen,
            id: config.id,
        };

        const submenu = new ContextMenu(options); // Create submenu with updated options
        submenuBuilder(submenu);

        const items = this.addItem(ContextMenu.ITEM_TYPES.SUBMENU, {
            text,
            submenu,
            icon: config.icon,
            ficon: config.ficon,
            showWhen: config.showWhen,
            id: config.id,
        }).items;

        items[items.length - 1].id = submenu.id;
        return this;
    }

    searchSelect(label, options, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.SEARCH_SELECT, {
            label,
            options,
            value: config.value,
            onChange: config.onChange,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    // Show methods
    showAt(x, y, autoAdd = true) {
        const menu = this._render();

        if (document.getElementById(this.id)) {
            document.getElementById(this.id).remove();
        }

        autoAdd ? document.body.appendChild(menu) : null;
        this._setupEventHandlers(menu);
        this._positionMenu(menu, {x, y, position: 'fixed'});
        this._animateIn(menu);
        return menu;
    }

    destroy() {
        // Existing cleanup
        const menu = document.querySelector('body > .' + ContextMenu.CLASSNAMES.MENU);
        menu && menu.remove();

        // Remove event listeners
        const {handleClick, handleContextMenu, handleMouseOver} = this._eventHandlers || {};
        handleClick ? document.removeEventListener("click", handleClick) : null;
        handleContextMenu ? document.removeEventListener("contextmenu", handleContextMenu) : null;
        handleMouseOver ? document.removeEventListener("mouseover", handleMouseOver) : null;

        this?.clear();
    }

    clear() {
        // Clear all items
        this.items = [];
        const menu = document.getElementById(this.id);
        if (menu) {
            menu.innerHTML = '';
        }
    }

//    /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
//    |                                                  PRIVATE METHODS                                                  |
//    \___________________________________________________________________________________________________________________/

    _setupEventHandlers(menu) {
        const handleClick = (e) => {
            if (e.target.classList.contains(ContextMenu.CLASSNAMES.DROPDOWN) ||
                e.target.classList.contains(ContextMenu.CLASSNAMES.INPUT) ||
                e.target.classList.contains(ContextMenu.CLASSNAMES.CHECKBOX) ||
                e.target.classList.contains(ContextMenu.CLASSNAMES.RADIO) ||
                e.target.classList.contains(ContextMenu.CLASSNAMES.SEARCH_SELECT)) {
                return;
            }

            if (e.target.classList.contains(ContextMenu.CLASSNAMES.BUTTON)) {
                const button = this.items.find(item => item.id === e.target.id);
                if (button) {
                    button.action();
                    this.destroy();
                }
            }

            if (!e.target.closest('.' + ContextMenu.CLASSNAMES.MENU)) {
                if (!this.options.closeOnOutsideClick) return;
                this.destroy();
            }
        };

        const handleMouseOver = (e) => {
            if (e.target.classList.contains(ContextMenu.CLASSNAMES.SUBMENU)) {
                const submenu = this.items.find(item => item.id === e.target.dataset.submenuId);

                if (submenu) {
                    const existingSubmenu = e.target.parentElement.querySelector('#' + submenu.submenu.id);
                    if (existingSubmenu) return;

                    const htmlElement = submenu.submenu._render();
                    submenu.submenu._setupEventHandlers(htmlElement);
                    submenu.submenu._positionMenu(htmlElement, {
                        x: e.target.getBoundingClientRect().right,
                        y: e.target.getBoundingClientRect().top
                    });

                    htmlElement.style.position = 'absolute';
                    htmlElement.style.left = this.options.width + 'px';
                    htmlElement.style.top = e.target.getBoundingClientRect().top - e.target.parentElement.getBoundingClientRect().top + 'px';

                    e.target.parentElement.appendChild(htmlElement);

                    htmlElement.addEventListener('mouseleave', handleMouseLeave);
                    e.target.addEventListener('mouseleave', handleMouseLeave);
                }
            }
        };

        const handleMouseLeave = (event) => {
            const target = event.target;

            if (target.className === ContextMenu.CLASSNAMES.MENU) {
                target.remove();
                return;
            }

            const submenu = document.getElementById(target.dataset?.submenuId);
            const isMouseOverButton = target.matches(':hover');
            const isMouseOverSubmenu = submenu?.matches(':hover');

            if (!isMouseOverButton && !isMouseOverSubmenu) {
                submenu?.remove();
            }
        };


        menu.addEventListener('click', handleClick);
        menu.addEventListener('mouseover', handleMouseOver);
        addEventListener('click', (e) => {
            //if the element is not inside the menu, then destroy the menu
            if (e.target.closest('.' + ContextMenu.CLASSNAMES.MENU)) return;

            if (this.options.closeOnOutsideClick) {
                this.destroy();
            }
        })
    }

    //sorry for the bad looking code :(
    _validateItem(item) {
        const validTypes = Object.values(ContextMenu.ITEM_TYPES);

        if (!item.type || !validTypes.includes(item.type)) throw new Error(`Invalid item type: ${item.type}. Allowed types are: ${validTypes.join(', ')}`);

        switch (item.type) {
            case ContextMenu.ITEM_TYPES.BUTTON:
                if (!item.text || typeof item.text !== 'string') throw new Error('Button item must have a "text" property of type string.');
                if (item.action && typeof item.action !== 'function') throw new Error('Button item action must be a function.');
                break;
            case ContextMenu.ITEM_TYPES.SEPARATOR:
                break;
            case ContextMenu.ITEM_TYPES.SUBMENU:
                if (!item.submenu || !(item.submenu instanceof ContextMenu)) throw new Error('Submenu item must have a "submenu" property that is an instance of ContextMenu.');
                break;
            case ContextMenu.ITEM_TYPES.INPUT:
                if (!item.label || typeof item.label !== 'string') throw new Error('Input item must have a "label" property of type string.');
                break;
            case ContextMenu.ITEM_TYPES.DROPDOWN:
                if (!item.label || typeof item.label !== 'string') throw new Error('Dropdown item must have a "label" property of type string.');
                if (!Array.isArray(item.options) || item.options.length === 0) throw new Error('Dropdown item must have a non-empty "options" array.');
                break;
            case ContextMenu.ITEM_TYPES.CHECKBOX:
                if (!item.text || typeof item.text !== 'string') throw new Error('Checkbox item must have a "text" property of type string.');
                if (typeof item.checked !== 'boolean') throw new Error('Checkbox item must have a "checked" property of type boolean.');
                break;
            case ContextMenu.ITEM_TYPES.RADIO:
                if (!item.label || typeof item.label !== 'string') throw new Error('Radio item must have a "label" property of type string.');
                if (!item.name || typeof item.name !== 'string') throw new Error('Radio item must have a "name" property of type string.');
                break;
            case ContextMenu.ITEM_TYPES.SEARCH_SELECT:
                if (!item.label || typeof item.label !== 'string') throw new Error('SearchSelect item must have a "label" property of type string.');
                if (!Array.isArray(item.options) || item.options.length === 0) throw new Error('SearchSelect item must have a non-empty "options" array.');
                break;
            default:
                throw new Error(`Unhandled item type: ${item.type}`);
        }
    }

    _generateId() {
        return '_' + Math.random().toString(36).substring(2, 9);
    }

    _render() {
        const menuContainer = document.createElement('div');
        menuContainer.classList.add(ContextMenu.CLASSNAMES.MENU);
        menuContainer.id = this.id;
        menuContainer.setAttribute('role', 'menu');
        menuContainer.setAttribute('aria-orientation', 'vertical');
        menuContainer.style.width = `${this.options.width}px`;

        // Set the indentation level as a data attribute
        menuContainer.dataset.indent = this.options.indentLevel;

        this.items.forEach(item => {
            let element;

            switch (item.type) {
                case ContextMenu.ITEM_TYPES.BUTTON:
                    element = this._createButton(item);
                    break;
                case ContextMenu.ITEM_TYPES.SEPARATOR:
                    element = this._createSeparator();
                    break;
                case ContextMenu.ITEM_TYPES.SUBMENU:
                    element = this._createSubmenu(item);
                    break;
                case ContextMenu.ITEM_TYPES.INPUT:
                    element = this._createInput(item);
                    break;
                case ContextMenu.ITEM_TYPES.DROPDOWN:
                    element = this._createDropdown(item);
                    break;
                case ContextMenu.ITEM_TYPES.CHECKBOX:
                    element = this._createCheckbox(item);
                    break;
                case ContextMenu.ITEM_TYPES.RADIO:
                    element = this._createRadio(item);
                    break;
                case ContextMenu.ITEM_TYPES.SEARCH_SELECT:
                    element = this._createSearchSelect(item);
                    break;
                default:
                    console.warn(`Unknown item type: ${item.type}`);
            }

            if (element) {
                menuContainer.appendChild(element);
            }

            setTimeout(() => {
                // Check if the item has a `showWhen` condition
                if (item.showWhen) {
                    const {elementId, value} = item.showWhen;
                    const controllingElement = document.querySelector('#' + elementId);

                    if (controllingElement) {
                        const toggleVisibility = () => {
                            const shouldShow = value.includes(controllingElement.value);
                            element.style.display = shouldShow ? 'block' : 'none';
                        };

                        // Add event listener to monitor changes
                        controllingElement.addEventListener('input', toggleVisibility);
                        controllingElement.addEventListener('change', toggleVisibility);

                        // Initial check
                        toggleVisibility();
                    }
                }
            }, 0);
        });


        return menuContainer;
    }

    _createButton(item) {
        const button = document.createElement('button');
        button.classList.add(ContextMenu.CLASSNAMES.BUTTON);
        button.id = item.id;
        button.innerText = item.text;
        button.disabled = item.disabled || false;
        button.dataset.marked = item.marked || false;
        //button.onclick = item.action;

        if (item.icon) {
            const icon = document.createElement('span');
            icon.innerText = item.icon;
            button.prepend(icon);
        }

        if (item.ficon) {
            const ficon = document.createElement('i');
            ficon.className = item.ficon;
            button.append(ficon);
        }

        return button;
    }

    _createSeparator() {
        const separator = document.createElement('div');
        separator.classList.add(ContextMenu.CLASSNAMES.SEPARATOR);
        return separator;
    }

    _createSubmenu(item) {
        const submenuButton = document.createElement('button');
        submenuButton.classList.add(ContextMenu.CLASSNAMES.SUBMENU);
        submenuButton.innerText = item.text;
        submenuButton.setAttribute('aria-haspopup', 'true');
        submenuButton.dataset.submenuId = item.id;

        if (item.icon) {
            const icon = document.createElement('span');
            icon.innerText = item.icon;
            submenuButton.prepend(icon);
        }

        const moreIcon = document.createElement('span');
        moreIcon.innerText = this.options.icons.submenu;
        moreIcon.style.marginLeft = 'auto';
        submenuButton.append(moreIcon);

        if (item.ficon) {
            const ficon = document.createElement('i');
            ficon.className = item.ficon;
            submenuButton.append(ficon);
        }

        return submenuButton;
    }

    _createInput(item) {
        const inputContainer = document.createElement('div');
        inputContainer.classList.add(ContextMenu.CLASSNAMES.INPUT);

        const input = document.createElement('input');
        input.type = item.type || 'text';
        input.placeholder = item.placeholder || '';
        input.value = item.value || '';
        input.oninput = (e) => item.onChange?.(e.target.value);
        input.id = item.id;

        inputContainer.appendChild(input);
        return inputContainer;
    }

    _createDropdown(item) {
        const select = document.createElement('select');
        select.classList.add(ContextMenu.CLASSNAMES.DROPDOWN);
        select.id = item.id;

        item.options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            if (option.value === item.value) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });

        select.onchange = (e) => item.onChange?.(e.target.value);
        return select;
    }

    _createCheckbox(item) {
        const label = document.createElement('label');
        label.classList.add(ContextMenu.CLASSNAMES.CHECKBOX);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.checked || false;
        checkbox.onchange = (e) => item.onChange?.(e.target.checked);
        checkbox.id = item.id;

        const span = document.createElement('span');
        span.textContent = item.text;

        label.appendChild(checkbox);
        label.appendChild(span);
        return label;
    }

    _createRadio(item) {
        const label = document.createElement('label');
        label.classList.add(ContextMenu.CLASSNAMES.RADIO);

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = item.name;
        radio.value = item.value;
        radio.checked = item.checked || false;
        radio.onchange = (e) => item.onChange?.(e.target.value);
        radio.id = item.id;

        const span = document.createElement('span');
        span.textContent = item.label;

        label.appendChild(radio);
        label.appendChild(span);
        return label;
    }

    _createSearchSelect(item) {
        //this is a scrollable list with selectable items (checkboxes)
        //at the top there is a search input that filters the items (if the search input is not empty, then show everything)
        const container = document.createElement('div');
        container.classList.add(ContextMenu.CLASSNAMES.SEARCH_SELECT);
        container.id = item.id;

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = item.label || '';

        const list = document.createElement('div');
        list.classList.add(ContextMenu.CLASSNAMES.SEARCH_SELECT + '-list');

        //add select all option
        const selectAll = document.createElement('label');
        selectAll.classList.add(ContextMenu.CLASSNAMES.SEARCH_SELECT + '-select-all');
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.onchange = (e) => {
            const checkboxes = list.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });

            //return an array of selected values
            const selectedValues = Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
            item.onChange?.(selectedValues);
            container.value = selectedValues;
        }
        const selectAllLabel = document.createElement('span');
        selectAllLabel.textContent = 'Select All';
        selectAll.appendChild(selectAllCheckbox);
        selectAll.appendChild(selectAllLabel);
        list.appendChild(selectAll);

        item.options.forEach(option => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = option.value;
            checkbox.checked = option.checked || false;
            checkbox.onchange = (e) => {
                //return an array of selected values
                const selectedValues = Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
                item.onChange?.(selectedValues);
                container.value = selectedValues;
            }

            const label = document.createElement('label');
            label.textContent = option.label;
            label.appendChild(checkbox);
            list.appendChild(label);
        });
        container.appendChild(input);
        container.appendChild(list);

        input.oninput = (e) => {
            const searchValue = e.target.value.toLowerCase();
            const items = list.querySelectorAll('label');
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(searchValue) ? 'block' : 'none';
            });
        };
        return container;
    }

    _positionMenu(menu, position) {
        const {x, y} = position;
        const {xOffset, yOffset} = this.options.position;

        // Apply styles to position the menu
        menu.style.left = `${x + xOffset || this.options.width}px`;
        menu.style.top = `${y + yOffset}px`;
        menu.style.position = 'fixed';
    }


    _animateIn(menu) {
        if (!this.options.animation.enabled) return;

        // Apply initial styles for animation
        menu.style.opacity = 0;
        menu.style.transform = 'scale(0.9)';
        menu.style.transition = `opacity ${this.options.animation.duration}ms ${this.options.animation.timing}, 
                             transform ${this.options.animation.duration}ms ${this.options.animation.timing}`;

        // Trigger the animation
        requestAnimationFrame(() => {
            menu.style.opacity = 1;
            menu.style.transform = 'scale(1)';
        });
    }

    installStyles() {
        if (document.getElementById('context-menu-styles')) return;

        const styleElement = document.createElement('style');
        styleElement.id = 'context-menu-styles';
        styleElement.textContent = `
:root {
  --context-menu-bg: ` + (this.options.style.backgroundColor || '#ffffff') + `;
  --context-menu-text: ` + (this.options.style.textColor || '#333333') + `;
  --context-menu-hover-bg: ` + (this.options.style.backgroundHoverColor || '#f0f0f0') + `;
  --context-menu-border: ` + (this.options.style.border || 'rgba(0, 0, 0, 0.08)') + `;
  --context-menu-shadow: ` + (this.options.style.shadow || '0 10px 25px rgba(0, 0, 0, 0.1)') + `;
  --context-menu-accent: ` + (this.options.style.accent || '#3b82f6') + `;
  --context-menu-separator: ` + (this.options.style.separator || 'rgba(0, 0, 0, 0.08)') + `;
  --padding: ` + (this.options.style.padding || '10px') + `;
  --padding-horizontal: ` + (this.options.style.paddingHorizontal || '15px') + `;
  --gap: ` + (this.options.style.gap || '10px') + `;
  --border-radius: ` + (this.options.style.borderRadius || '8px') + `;
  --border-radius-input: ` + (this.options.style.borderRadiusInput || '4px') + `;
  --font-size: ` + (this.options.style.fontSize || '14px') + `;
  --transition: ` + (this.options.style.transition || '0.2s') + ` ease;
  --transition-fast: ` + (this.options.style.transitionFast || '0.1s') + ` ease;
  --transition-input: ` + (this.options.style.transitionInput || '0.2s') + ` ease;
}

.context-menu {
  background: var(--context-menu-bg);
  border: 1px solid var(--context-menu-border);
  border-radius: var(--border-radius);
  box-shadow: var(--context-menu-shadow);
  padding: var(--padding) 0;
  min-width: 220px;
  z-index: 1000;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  color: var(--context-menu-text);
  animation: contextMenuSlideIn var(--transition-fast) forwards;
  transform-origin: top center;
}

.context-menu:has(> .context-menu-dropdown)::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 500%;
    z-index: -1;
}

.context-menu-button,
.context-menu-submenu {
  display: flex;
  align-items: center;
  width: 100%;
  padding: calc(var(--padding) + 2px) var(--padding-horizontal);
  border: none;
  background: none;
  font-size: var(--font-size);
  text-align: left;
  cursor: pointer;
  color: var(--context-menu-text);
  transition: background-color var(--transition-fast), color var(--transition-fast);
  position: relative;
  gap: var(--gap);
}

.context-menu-button:disabled {
  color: rgba(26, 26, 26, 0.4);
  cursor: not-allowed;
}

.context-menu-button[data-marked="true"] {
  font-weight: bold;
  background-color: var(--context-menu-accent);
  color: white;
  border-radius: calc(var(--border-radius) / 2);
  border: 1px solid var(--context-menu-accent);
}

.context-menu-button[data-marked="true"]:hover {
  background-color: var(--context-menu-accent);
  color: white;
}

.context-menu-button span,
.context-menu-submenu span {
  display: flex;
  align-items: center;
  pointer-events: none;
}

.context-menu-button:hover,
.context-menu-submenu:hover {
  background-color: var(--context-menu-hover-bg);
}

.context-menu-button:focus,
.context-menu-submenu:focus {
  outline: none;
  background-color: var(--context-menu-hover-bg);
}

.context-menu-separator {
  height: 1px;
  background-color: var(--context-menu-separator);
  margin: var(--padding) 0;
}

.context-menu-input {
  padding: var(--padding) var(--padding-horizontal);
}

.context-menu-input input {
  width: calc(100% - var(--padding-horizontal));
  padding: var(--padding);
  border: 1px solid var(--context-menu-border);
  border-radius: var(--border-radius-input);
  font-size: var(--font-size);
  background-color: #f9fafb;
  transition: border-color var(--transition-input), box-shadow var(--transition-input);
}

.context-menu-input input:focus {
  outline: none;
  border-color: var(--context-menu-accent);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.context-menu-dropdown {
  width: calc(100% - calc(var(--padding-horizontal) * 2));
  margin: var(--padding) var(--padding-horizontal);
  padding: var(--padding);
  border: 1px solid var(--context-menu-border);
  border-radius: var(--border-radius-input);
  font-size: var(--font-size);
  background-color: #f9fafb;
  transition: border-color var(--transition-input), box-shadow var(--transition-input);
}

.context-menu-checkbox,
.context-menu-radio {
  display: flex;
  align-items: center;
  padding: calc(var(--padding) + 2px) var(--padding-horizontal);
  font-size: var(--font-size);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.context-menu-checkbox:hover,
.context-menu-radio:hover {
  background-color: var(--context-menu-hover-bg);
}

.context-menu-checkbox input,
.context-menu-radio input {
  margin-right: var(--gap);
  accent-color: var(--context-menu-accent);
}

.context-menu-checkbox input:focus,
.context-menu-radio input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.context-menu-checkbox input:checked,
.context-menu-radio input:checked {
  background-color: var(--context-menu-accent);
}

.context-menu-search-select {
  display: flex;
  flex-direction: column;
  padding: calc(var(--padding) + 2px) var(--padding-horizontal);
}

.context-menu-search-select input {
  padding: var(--padding);
  border: 1px solid var(--context-menu-border);
  border-radius: var(--border-radius-input);
  font-size: var(--font-size);
  background-color: #f9fafb;
  transition: border-color var(--transition-input), box-shadow var(--transition-input);
}

.context-menu-search-select input:focus {
  outline: none;
  border-color: var(--context-menu-accent);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.context-menu-search-select-list {
  max-height: 200px;
  overflow-y: auto;
  margin-top: var(--padding);
}

.context-menu-search-select-list label {
  display: flex;
  flex-direction: row-reverse;
  gap: var(--gap);
  align-items: center;
  padding: var(--padding) 0;
  justify-content: flex-end;
}

.context-menu-search-select-list label:hover {
  background-color: var(--context-menu-hover-bg);
}

.context-menu-search-select-list input {
  margin-right: var(--gap);
  accent-color: var(--context-menu-accent);
}

.context-menu-search-select-list input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.context-menu-submenu {
  position: relative;
}

/* Animation */
@keyframes contextMenuSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(calc(-1 * var(--padding)));
  }
}

/* Focus and Accessibility */
.context-menu:focus {
  outline: none;
}

.context-menu-button:focus-visible,
.context-menu-submenu:focus-visible {
  outline: 2px solid var(--context-menu-accent);
  outline-offset: -2px;
}
`;
        document.head.appendChild(styleElement);
    }
}

