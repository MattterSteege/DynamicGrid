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
