// ./DynamicGrid/DynamicGrid.js
/**
 * DynamicGrid is a library for rendering data in a grid format with dynamic querying capabilities.
 * @license MIT
 */

class DynamicGrid {
    constructor(config) {

        // Initialize the query engine
        this.engine = new SJQLEngine(config.engine || {});
        // Initialize plugins
        this.engine.plugins = config.plugins ?? [];
        this.engine.addPlugin(new stringTypePlugin, true);
        this.engine.addPlugin(new numberTypePlugin, true);
        this.engine.addPlugin(new booleanTypePlugin, true);

        // Set up headers
        if (config.headers) {
            Object.entries(config.headers).forEach(([key, value]) => {
                this.engine.headers[key] = value.toLowerCase();
            });
        }

        // Set up UI
        this.virtualScrolling = config.ui.virtualScrolling ?? true; // Enable virtual scrolling
        this.rowHeight = config.ui.rowHeight || 40; // Default row height in pixels
        this.visibleRows = config.ui.visibleRows || 20; // Number of rows to render at once
        this.ui = new DynamicGridUI(this, config.ui);
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
    }

    /**
     * Renders the UI based on the provided input.
     * @param {string} input - A query string or data object to render the UI.
     * @preserve
     */
    render(input) {
        this.ui.render(this.engine.query(input));
    }

    /**
     * Renders the UI with the provided data. This method does not run any queries, so the data must be pre-processed already.
     * @param {object} input - The data to render.
     * @preserve
     */
    renderRaw(input) {
        this.ui.render(input);
    }

    /**
     * Sorts the data by the specified key and direction.
     * @param {string} key - The key to sort by.
     * @param {'asc'|'desc'} direction - The direction to sort.
     * @preserve
     */
    sort = (key, direction) => this.engine.sort(key, direction);

    /**
     * Groups the data by the specified key.
     * @param {string} [key] - The key to group by.
     * @preserve
     */
    groupBy = key => this.engine.groupBy(key);

    /**
     * Adds a selection filter to the data.
     * @param {string} key - The key to filter by.
     * @param {string} operator - The operator to use for filtering.
     * @param {*} value - The value to filter by.
     * @preserve
     */
    addSelect = (key, operator, value) => this.engine.addSelect(key, operator, value);

    /**
     * Removes a selection filter from the data.
     * @param {string} key - The key to filter by.
     * @param {string} [operator] - The operator used for filtering.
     * @param {*} [value] - The value to filter by.
     * @preserve
     */
    removeSelect = (key, operator, value) => this.engine.removeSelect(key, operator, value);

    /**
     * Runs all the selection filters on the data.
     * @preserve
     */
    runSelect = () => this.engine.runSelect();
}

// ./DynamicGrid/DynamicGridUI.js
class DynamicGridUI {
    /**
     * @param {string} ui_config.containerId - The ID of the container for the grid. (required)
     * @param {number} ui_config.minColumnWidth - Minimum width for columns. (default: 5%)
     * @param {number} ui_config.rowHeight - Height of each row. (default: 40px)
     * @param {number} ui_config.bufferedRows - Number of buffered rows. (default: 10)
     * @param {'header'|'content'|'both'|'none'} ui_config.autoFitCellWidth - Determines how cell widths are auto-fitted. (default: 'header', options: 'header', 'content', 'both', 'none')
     */
    constructor(dynamicGrid, ui_config) {
        this.dynamicGrid = dynamicGrid;
        this.containerId = ui_config.containerId;

        this.table = null;
        this.header = null;
        this.body = null;
        this.scrollContainer = null;

        this.config = {
            minColumnWidth: ui_config.minColumnWidth ?? 5,
            rowHeight: ui_config.rowHeight ?? 40,
            bufferedRows: ui_config.bufferedRows ?? 10,
            autoFitCellWidth: ui_config.autoFitCellWidth ?? 'header'
        };

        this.#_init(this.containerId);

        this.UIChache = 0;
        this.UICacheRefresh = false;
        this.sortDirection = 'asc';
    }

    render(data) {

        if (!data || data.length === 0) {
            this.body?.remove();
            this.scrollContainer?.remove();
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
    }

    toggleColumn(index) {
        const columnWidth = this.columnWidths[index];
        this.columnWidths[index] = columnWidth === 0 ? 100 : 0;
        const showingColumns = this.columnWidths.filter(width => width > 0).length;
        this.columnWidths = this.columnWidths.map(width => width === 0 ? 0 : 100 / showingColumns);
        this.#_updateColumnWidths(this.table);
    }

    // ======================================== PRIVATE METHODS ========================================

    #_init(containerId) {
        this.container = document.querySelector(containerId);
        if (!this.container) {
            throw new GridError(`Container with id "${containerId}" not found`);
        }
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
            //data is like this:
            /*
            {
                20: (38) [{…},
                21: (45) [{…},
                22: (45) [{…},
                ...
             }

             so we need to loop over the keys and render the data for each key, this means a new table for each key that can is inside a details element
            */

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
            headers.forEach((header) => {
                const plugin = this.dynamicGrid.engine.getPlugin(this.dynamicGrid.engine.headers[header]);
                const cell = this.#_createTableCell(plugin.renderCell(data[i][header]));
                tableRow.appendChild(cell);
            });
            visibleRowsContainer.appendChild(tableRow);
        }

        if (container.lastChild) {
            container.removeChild(container.lastChild);
        }
        container.appendChild(visibleRowsContainer);
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
            cell.setAttribute('value_type', this.dynamicGrid.engine.headers[_header]);

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
                this.render(this.dynamicGrid.engine.sort(this.sortColumn, this.sortDirection));
            });

            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dynamicGrid.engine.getPlugin(cell.getAttribute('value_type')).showMore(cell.title, cell, this.dynamicGrid);
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

    #_createTableCell(content = '') {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.innerHTML = content;
        return cell;
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

// ./DynamicGrid/TypePlugin.js
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
     * @returns {string|undefined} Operator if supported, undefined otherwise
     * @protected
     */
    checkOperator(operator) {
        return this.operators.find(op => op === operator);
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
     * Create a table header cell
     * @param {string} key Header text
     * @returns {HTMLTableCellElement} Header cell element
     * @abstract
     */
    renderHeader(key) {
        const th = document.createElement('th');
        th.textContent = key;
        return th;
    }

    /**
     * Create a table data cell
     * @param {*} value Cell value
     * @returns {string} Data cell element
     * @abstract
     */
    renderCell(value) {
        return String(value);
    }

    /**
     * Handle additional data loading
     * @param {string} key Data key
     * @param {HTMLElement} element Clicked element
     * @param {Object} dynamicGrid Grid instance
     */
    showMore(key, element, dynamicGrid) {
        throw new Error('showMore must be implemented by subclass');
    }
}

// ./DynamicGrid/InherentTypePlugin.js
class stringTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = ['%=', '=%', '*=', '!*=', '==', '!=', 'in'] //starts with, ends with, contains, does not contain, equals, not equals, in
    }

    validate(value) {
        return typeof value === 'string';
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

    //render the header of the column
    renderHeader(key) {
        const elem = document.createElement('th');
        elem.innerHTML = key;
        return elem;
    }

    renderCell(value) {
        return String(value);
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

    showMore(key, element, dynamicGrid) {

        const {x, y} = element.getBoundingClientRect();

        // Define the context menu configuration
        const items =  [
            { text: 'Sort ' + key + ' ascending', onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'asc')) },
            { text: 'Sort ' + key + ' descending', onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'desc')) },
            { text: 'Unsort ' + key, onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'original')) },
            null,
            { text: 'Group by ' + key, onclick: () => dynamicGrid.renderRaw(dynamicGrid.groupBy(key)) },
            { text: 'Un-group', onclick: () => dynamicGrid.renderRaw(dynamicGrid.groupBy()) }
        ];

        // Initialize the context menu
        const menu = new ContextMenu(document.body, items)
        menu.display(x, y + 30);
    }
}

class numberTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = ['>', '<', '>=', '<=', '==', '!=', 'in']; //greater than, less than, greater than or equal, less than or equal, equals, not equals
    }

    validate(value) {
        return !isNaN(Number(value));
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

        if (Array.isArray(value) && value.length > 0 && operator === 'in') {
            return value.includes(dataValue);
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

    //render the header of the column
    renderHeader(key) {
        const elem = document.createElement('th');
        elem.innerHTML = key;
        return elem;
    }

    renderCell(value) {
        const parts = value.toString().split("."); // Ensure two decimal places
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "."); // Add dots for thousands
        return parts.join(","); // Join with a comma for decimals
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

    showMore(key, element, dynamicGrid) {

        const {x, y} = element.getBoundingClientRect();

        // Define the context menu configuration
        const items =  [
            { text: 'Sort ' + key + ' ascending', onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'asc')) },
            { text: 'Sort ' + key + ' descending', onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'desc')) },
            { text: 'Unsort ' + key, onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'original')) },
            null,
            { text: 'Group by ' + key, onclick: () => dynamicGrid.renderRaw(dynamicGrid.groupBy(key)) },
            { text: 'Un-group', onclick: () => dynamicGrid.renderRaw(dynamicGrid.groupBy()) }
        ];

        // Initialize the context menu
        const menu = new ContextMenu(document.body, items)
        menu.display(x, y + 30);
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

    //render the header of the column
    renderHeader(key) {
        const elem = document.createElement('th');
        elem.innerHTML = key;
        return elem;
    }

    renderCell(value) {
        //render a checkbox that is checked if value is true
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        value ? checkbox.setAttribute('checked', null) : null;
        checkbox.disabled = true;
        checkbox.style.width = '-webkit-fill-available';
        checkbox.name = 'checkbox';
        return checkbox.outerHTML;
    }

    showMore(key, element, dynamicGrid) {

        const {x, y} = element.getBoundingClientRect();

        // Define the context menu configuration
        const items =  [
            { text: 'Show ' + key + ' ascending', onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'asc')) },
            { text: 'Sort ' + key + ' descending', onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'desc')) },
            { text: 'Unsort ' + key, onclick: () => dynamicGrid.renderRaw(dynamicGrid.sort(key, 'original')) },
            null,
            { text: 'Only show true', onclick: () => {
                    dynamicGrid.addSelect(key, '==', 'true');
                    dynamicGrid.removeSelect(key, '==', 'false');
                    dynamicGrid.renderRaw(dynamicGrid.runSelect());
                }
            },
            { text: 'Only show false', onclick: () => {
                    dynamicGrid.addSelect(key, '==', 'false');
                    dynamicGrid.removeSelect(key, '==', 'true');
                    dynamicGrid.renderRaw(dynamicGrid.runSelect());
                }
            },
            { text: 'Show all', onclick: () => {
                    dynamicGrid.removeSelect(key, '==', 'true');
                    dynamicGrid.removeSelect(key, '==', 'false');
                    dynamicGrid.renderRaw(dynamicGrid.runSelect());
                }
            },
            null,
            { text: 'Group by ' + key, onclick: () => dynamicGrid.renderRaw(dynamicGrid.groupBy(key)) },
            { text: 'Un-group', onclick: () => dynamicGrid.renderRaw(dynamicGrid.groupBy()) }
        ];

        // Initialize the context menu
        const menu = new ContextMenu(document.body, items)
        menu.display(x, y + 30);
    }
}

//TODO: add the following types: date

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

        console.log(query);

        return query.split(/\s+and\s+|\s+&&\s+/i)
                    .map(subQuery => this.parseSubQuery(subQuery.trim(), plugins, headers))
                    .filter(query => query.queryType);
    }


    parseSubQuery(subQuery, plugins, headers) {
        subQuery = subQuery.endsWith(' and') ? subQuery.slice(0, -4) : subQuery;
        //from bottom to top, check if the QUERIES matches the subquery
        for (const [type, regex] of Object.entries(QueryParser.QUERIES)) {
            const match = regex.exec(subQuery);
            if (match) {
                return this.parseMatch(match, type, plugins, headers) || {};
            }
        }
        console.warn('Invalid query: ' + subQuery + '\n' + 'Valid queries are: ' + Object.keys(QueryParser.QUERIES).join(', ').toLowerCase());
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
            console.log(key + " - " + operator + " - " +  value);
            key = MeantIndexKey(Object.keys(headers), key, this.config);
            const pluginType = headers[key];
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
            const pluginType = headers[key];
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
class SJQLEngine {
    constructor(engine_config) {
        this.data = [];
        this.headers = [];
        this.plugins = [];
        this.currentQueryStr = '';
        this.futureQuery = [];
        this.QueryParser = new QueryParser(engine_config);

        this.config = {
            UseDataIndexing: engine_config.UseDataIndexing || true,
            useStrictCase: engine_config.useStrictCase || false,
            SymbolsToIgnore: engine_config.SymbolsToIgnore || [' ', '_', '-']
        };
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
                this.headers[key] = 'boolean';
            }
            else if (!isNaN(data[key])) {
                this.headers[key] = 'number';
            }
            else {
                this.headers[key] = 'string';
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

        console.log(query)
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
        console.log(log, this.currentQueryStr);

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

    sort(key, direction) {
        let query = '';

        if (this.currentQueryStr.length === 0 && (direction === 'asc' || direction === 'desc')) //if no query is present, just sort
            query = 'sort ' + key + ' ' + direction;
        else if (direction === 'asc' || direction === 'desc') //if query is present, add sort to the query
            query = this.currentQueryStr + ' and sort ' + key + ' ' + direction;
        else if (!direction || direction === '' || direction === 'original') //if no direction is provided, just return the unsorted data
        {
            query = this.currentQueryStr;
            query = query.replace(QueryParser.QUERIES.SORT, '');
        }

        return this.query(query);
    }

    groupBy(key = '') {
        let query = '';

        if (this.currentQueryStr.length === 0 && Object.keys(this.headers).includes(key)) //if no query is present, just group
            query = 'group ' + key;
        else if (this.currentQueryStr.length > 0 && Object.keys(this.headers).includes(key)) //if query is present, add sort to the query
            query = this.currentQueryStr + ' and group ' + key;
        else if (!key || key === '' || key === 'original') //if no direction is provided, just return the unsorted data
        {
            query = this.currentQueryStr;
            query = query.replace(QueryParser.QUERIES.GROUP, '');
        }

        return this.query(query);
    }

    addSelect(key, operator, value) {
        let parsedQuery = [];
        if (this.currentQueryStr.length > 0) {
            parsedQuery = this.QueryParser.parseQuery(this.currentQueryStr, this.plugins, this.headers);
            if (key && operator && value) {
                parsedQuery.push(this.QueryParser.parseMatch([undefined, key, operator, value], 'SELECT', this.plugins, this.headers));
            }
        }
        else {
            parsedQuery.push(this.QueryParser.parseMatch([undefined, key, operator, value], 'SELECT', this.plugins, this.headers));
        }

        this.futureQuery = parsedQuery;
    }

    removeSelect(key, operator, value) {
        this.futureQuery = this.futureQuery.filter(query =>  !(query.field.toString() === key.toString() && query.operator.toString() === operator.toString() && query.value.toString() === value.toString()));
    }

    runSelect() {
        return this.#_query(this.futureQuery);
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

    //================================================== DATA PARSER ==================================================
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

// ./DynamicGrid/ContextMenu.js
class ContextMenu {
    #container;
    #menuDom = null;
    #isVisible = false;
    #isRootMenu = true;
    #parentMenu = null;
    #childMenus = [];
    #menuItems;

    constructor(container, items) {
        if (!container || !(container instanceof HTMLElement)) {
            throw new Error('Invalid container element');
        }

        this.#container = container;
        this.#menuItems = items;

        // Bind event handlers to preserve context
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        document.addEventListener('click', this.handleOutsideClick);

        this.#installContextMenuStyles();
    }

    #installContextMenuStyles() {
        if (document.getElementById('context-menu-styles')) return;
        const style = document.createElement('style');
        style.id = 'context-menu-styles';
        style.textContent = `
.context-menu {
    display: inline-block;
    position: fixed;
    top: 0px;
    left: 0px;
    min-width: 270px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #000;
    background: #f5f5f5;
    font-size: 9pt;
    border: 1px solid #333333;
    box-shadow: 4px 4px 3px -1px rgba(0, 0, 0, 0.5);
    padding: 3px 0px;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

.context-menu .menu-item {
    padding: 4px 19px;
    cursor: default;
    color: inherit;
}

.context-menu .menu-item:hover {
    background: #e3e3e3 !important;
}

.context-menu .item:hover .menu-hotkey {
    color: #000 !important;
}

.context-menu .menu-item-disabled {
    color: #878B90 !important;
}

.context-menu .menu-item-disabled:hover {
    background: inherit !important;
}

.context-menu .disabled:hover .menu-hotkey {
    color: #878B90 !important;
}

.context-menu .menu-separator {
    margin: 4px 0px;
    height: 0;
    padding: 0;
    border-top: 1px solid #b3b3b3;
}

.context-menu .menu-hotkey {
    color: #878B90;
    float: right;
}`;

            document.head.appendChild(style);
    }

    handleOutsideClick(event) {
        if (this.#isVisible &&
            this.#menuDom &&
            event.target !== this.#menuDom &&
            !this.#menuDom.contains(event.target) &&
            !event.target.closest('.context-menu')) {
            this.#dismissAllMenus();
        }
    }

    #createMenuElement(posX, posY) {
        const menuEl = document.createElement('div');
        menuEl.classList.add('context-menu');
        menuEl.style.left = `${posX}px`;
        menuEl.style.top = `${posY}px`;

        this.#menuItems.forEach(itemData => {
            menuEl.appendChild(this.#renderMenuItem(itemData));
        });

        this.#menuDom = menuEl;
        return menuEl;
    }

    #renderMenuItem(itemData) {
        // Handle separator
        if (itemData === null) {
            const separator = document.createElement('div');
            separator.classList.add('menu-separator');
            return separator;
        }

        const itemEl = document.createElement('div');
        itemEl.classList.add('menu-item');

        // Label
        const labelEl = document.createElement('span');
        labelEl.classList.add('menu-label');
        labelEl.textContent = itemData.text?.toString() || '';
        itemEl.appendChild(labelEl);

        // Disabled state
        if (itemData.disabled) {
            itemEl.classList.add('menu-item-disabled');
        } else {
            itemEl.classList.add('menu-item-active');
        }

        // Hotkey
        const hotkeyEl = document.createElement('span');
        hotkeyEl.classList.add('menu-hotkey');
        hotkeyEl.textContent = itemData.hotkey?.toString() || '';
        itemEl.appendChild(hotkeyEl);

        // Submenu handling
        if (this.#hasSubItems(itemData)) {
            const subMenuData = itemData.subitems || itemData.submenu;
            const subMenu = subMenuData instanceof ContextMenuHandler
                ? subMenuData
                : new ContextMenuHandler(this.#container, subMenuData);

            subMenu.#isRootMenu = false;
            subMenu.#parentMenu = this;

            this.#childMenus.push(subMenu);

            itemEl.classList.add('has-submenu');

            const openSubMenu = (e) => {
                if (itemData.disabled) return;

                this.#hideChildMenus();

                const subMenuPosX = this.#menuDom.offsetLeft + this.#menuDom.clientWidth + itemEl.offsetLeft;
                const subMenuPosY = this.#menuDom.offsetTop + itemEl.offsetTop;

                subMenu.#isVisible ? subMenu.#hide() : subMenu.#show(subMenuPosX, subMenuPosY);
            };

            itemEl.addEventListener('click', openSubMenu);
            itemEl.addEventListener('mousemove', openSubMenu);
        } else {
            // Regular menu item click handler
            itemEl.addEventListener('click', (e) => {
                this.#hideChildMenus();

                if (itemEl.classList.contains('menu-item-disabled')) return;

                if (typeof itemData.onclick === 'function') {
                    const eventContext = {
                        handled: false,
                        item: itemEl,
                        label: labelEl,
                        hotkey: hotkeyEl,
                        items: this.#menuItems,
                        data: itemData
                    };

                    itemData.onclick(eventContext);

                    if (!eventContext.handled) {
                        this.#hide();
                    }
                } else {
                    this.#hide();
                }
            });

            itemEl.addEventListener('mousemove', () => {
                this.#hideChildMenus();
            });
        }

        return itemEl;
    }

    #hasSubItems(itemData) {
        return (itemData.subitems && Array.isArray(itemData.subitems) && itemData.subitems.length > 0) ||
            (itemData.submenu && itemData.submenu instanceof ContextMenuHandler);
    }

    #dismissAllMenus() {
        if (this.#isRootMenu && !this.#parentMenu) {
            if (this.#isVisible) {
                this.#hideChildMenus();
                this.#isVisible = false;
                this.#container.removeChild(this.#menuDom);

                if (this.#parentMenu && this.#parentMenu.#isVisible) {
                    this.#parentMenu.#hide();
                }
            }
            return;
        }

        this.#parentMenu.#hide();
    }

    #hide() {
        if (this.#menuDom && this.#isVisible) {
            this.#isVisible = false;
            this.#hideChildMenus();
            this.#container.removeChild(this.#menuDom);

            if (this.#parentMenu && this.#parentMenu.#isVisible) {
                this.#parentMenu.#hide();
            }
        }
        this.#cleanup();
    }

    #hideChildMenus() {
        this.#childMenus.forEach(submenu => {
            if (submenu.#isVisible) {
                submenu.#isVisible = false;
                submenu.#container.removeChild(submenu.#menuDom);
            }
            submenu.#hideChildMenus();
        });
    }

    #show(posX, posY) {
        this.#createMenuElement(posX, posY);
        this.#container.appendChild(this.#menuDom);

        setTimeout(() => {
            this.#isVisible = true;
        }, 0);
    }

    #cleanup() {
        this.#menuDom = null;
        document.removeEventListener('click', this.handleOutsideClick);
    }

    // /====================================================================================================\
    // |========================================== PUBLIC METHODS ==========================================|
    // \====================================================================================================/

    display(posX, posY) {
        document.querySelectorAll('.context-menu').forEach(e => e.remove());
        this.#show(posX, posY);
        return this;
    }

    dismiss() {
        this.#hide();
        return this;
    }

    getMenuState() {
        return {
            container: this.#container,
            domElement: this.#menuDom,
            isVisible: this.#isVisible,
            isRootMenu: this.#isRootMenu,
            parentMenu: this.#parentMenu,
            childMenus: this.#childMenus,
            menuItems: this.#menuItems
        };
    }
}

// Example Usage
/*
const appContainer = document.getElementById('app');
const menuItems = [
    {
        text: 'File',
        subitems: [
            {text: 'New', hotkey: 'Ctrl+N', onclick: () => console.log('New file')},
            {text: 'Open', hotkey: 'Ctrl+O', onclick: () => console.log('Open file')},
            null, // Separator
            {text: 'Exit', hotkey: 'Alt+F4', onclick: () => console.log('Exit app')}
        ]
    },
    {
        text: 'Edit',
        subitems: [
            {text: 'Cut', hotkey: 'Ctrl+X', onclick: () => console.log('Cut')},
            {text: 'Copy', hotkey: 'Ctrl+C', onclick: () => console.log('Copy')},
            {text: 'Paste', hotkey: 'Ctrl+V', onclick: () => console.log('Paste')}
        ]
    }
];

const contextMenu = new ContextMenuHandler(appContainer, menuItems);
*/
