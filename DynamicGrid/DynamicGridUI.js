class DynamicGridUI {
    constructor(dynamicGrid, ui_config) {
        this.dynamicGrid = dynamicGrid;
        this.containerId = ui_config.containerId;

        this.table = null;
        this.header = null;
        this.body = null;
        this.scrollContainer = null;
        this.visibleRowsContainer = null;

        this.config = {
            minColumnWidth: ui_config.minColumnWidth ?? 5,
            rowHeight: ui_config.rowHeight ?? 40,
            bufferedRows: ui_config.bufferedRows ?? 10,
            autoFitCellWidth: ui_config.autoFitCellWidth ?? 'header' // 'header', 'content', 'none'
        }

        this.#_init(this.containerId);

        this.UIChache = 0;
        this.UICacheRefresh = false;
    }

    render(data) {

        if (!data || data.length === 0) {
            this.body?.remove();
            this.scrollContainer?.remove();
            return;
        }

        const isGrouped = (data) => Array.isArray(firstItem(data));

        //check if the data has changed in its structure (can I keep the headers etc.)
        const cacheHash = isGrouped(data) ? FastHash(Object.keys(firstItem(data))) : FastHash(Object.keys(data[0]))
        this.UICacheRefresh = this.UIChache !== cacheHash;
        this.UIChache = cacheHash;

        this.table = this.#_createResizableTable(Object.keys(data[0]), data[0]);
        this.#_initResizerDelegation();
        this.#_renderTable(data, isGrouped(data));
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


    #_renderTable(data) {
        const headers = Object.keys(data[0]);
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
        this.scrollContainer = document.createElement('div');
        this.scrollContainer.className = 'scroll-container';
        this.scrollContainer.style.overflowY = 'auto';

        if (this.UICacheRefresh) {
            // Add a container for all rows
            this.body = document.createElement('div');
            this.body.className = 'body-container';
        }

        this.scrollContainer.appendChild(this.body);
        this.scrollContainer.addEventListener('scroll', () =>
            this.#_updateVisibleRows(data, headers, this.body, this.scrollContainer)
        );

        this.table.appendChild(this.scrollContainer);
        this.container.appendChild(this.table);
        this.#_updateVisibleRows(data, headers, this.body, this.scrollContainer);
    }


    #_updateVisibleRows(data, headers, container, scrollContainer) {

        // Total height of all rows in the table
        const totalRows = data.length;
        const totalHeight = totalRows * this.config.rowHeight;

        // Update scroll container's virtual height
        container.style.position = 'relative';
        container.style.height = `${totalHeight}px`;

        // Calculate the range of rows to render
        const scrollTop = scrollContainer.scrollTop;
        const containerHeight = scrollContainer.offsetHeight;

        const startRow = Math.max(0, Math.floor(scrollTop / this.config.rowHeight) - this.config.bufferedRows);
        const endRow = Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / this.config.rowHeight) + this.config.bufferedRows);

        // Clear and render only the visible rows
        this.visibleRowsContainer = document.createElement('div');
        this.visibleRowsContainer.style.position = 'absolute';
        this.visibleRowsContainer.style.top = `${startRow * this.config.rowHeight}px`;
        this.visibleRowsContainer.style.left = '0';
        this.visibleRowsContainer.style.right = '0';
        this.visibleRowsContainer.style.display = 'grid';
        this.visibleRowsContainer.style.gridTemplateColumns = headers.map((_, index) => `var(--column-width-${index + 1})`).join(' ');

        for (let i = startRow; i < endRow; i++) {
            const tableRow = this.#_createTableRow();
            headers.forEach((header) => {
                const plugin = this.dynamicGrid.engine.getPlugin(this.dynamicGrid.engine.headers[header]);
                const cell = this.#_createTableCell(plugin.renderCell(data[i][header]));
                tableRow.appendChild(cell);
            });
            this.visibleRowsContainer.appendChild(tableRow);
        }

        // Replace the old visible rows with the new set
        if (container.lastChild) {
            container.removeChild(container.lastChild);
        }
        container.appendChild(this.visibleRowsContainer);
    }

    //======================================== TABLE FACTORY ========================================
    #_createResizableTable(columns, data) {
        if (!this.UICacheRefresh)
            return this.table;
        else
            this.table?.remove();

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

        this.table = document.createElement('div');
        this.table.className = 'table';

        // Apply initial column widths
        this.#_updateColumnWidths(this.table);
        return this.table;
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