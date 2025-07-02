class DynamicGridUI {
    /**
     * @param {string} ui_config.containerId - The ID of the container for the grid. (required)
     * @param {number} ui_config.minColumnWidth - Minimum width for columns. (default: 5%)
     * @param {number} ui_config.rowHeight - Height of each row. (default: 40px)
     * @param {number} ui_config.bufferedRows - Number of buffered rows added to the top AND bottom (default: 5)
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
        this.groupedRows = null;

        this.config = {
            minColumnWidth: ui_config.minColumnWidth ?? 50,
            rowHeight: ui_config.rowHeight ?? 40,
            bufferedRows: ui_config.bufferedRows ?? 5,
            colorScheme: ui_config.colorScheme ?? 'light',
        };

        // Virtual scrolling properties
        this.virtualScrolling = {
            scrollTop: 0,
            visibleRowsCount: 0,
            startIndex: 0,
            endIndex: 0,
            totalHeight: 0,
            topSpacer: null,
            bottomSpacer: null
        };

        this.#_init(this.containerId);

        this.UIChache = 0;
        this.UICacheRefresh = false;

        //array of ints
        this.showData = [];
        this.showDataLength = 0; // Length of the data currently shown in the UI
        this.hiddenIndices = new Set();


        // Set up context menu
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
        if (!data) return;
        if (data.length === 0) {
            this.clearContent();
            return;
        }

        this.isGroupedData = typeof data === 'object' && Array.isArray(firstItem(data));

        if (this.isGroupedData) {
            this.showData = [];
            let index = 0;
            Object.keys(data).forEach((key) => {
                this.showData.push(...data[key]);
                this.GroupRowRange(index, index + data[key].length - 1);
                index += data[key].length;
            });
        }
        else{
            this.showData = data;
        }
        this.showDataLength = this.showData.length; // Update the length of the data currently shown in the UI

        const columns = this.engine.getColumns();
        const firstDataItem = this.engine.getData(data[0], true);

        // Check if the data has changed in its structure (can I keep the headers etc.)
        const cacheHash = FastHash(columns);
        this.UICacheRefresh = this.UIChache !== cacheHash;
        this.UIChache = cacheHash;

        if (this.UICacheRefresh) {
            this.table = this.#_createResizableTable(columns, firstDataItem);
        }

        this.#_renderTable(columns);

        // Set up virtual scrolling after rendering the table
        this.#_setupVirtualScrolling();

        this.eventEmitter.emit('ui-rendered', { ...this.showData });
    }

    toggleColumn(IndexOrIndex) {
        const Index = typeof IndexOrIndex === 'number' ? IndexOrIndex : this.engine.getColumns().indexOf(IndexOrIndex.toLowerCase());
        this.colGroup1.children[Index + 1].style.visibility === 'collapse' ? this.#_showColumn(Index) : this.#_hideColumn(Index);
    }

    clearContent() {
        if (this.table) {
            //remove the data part, not the header
            this.bodyTable?.remove();
            this.scrollContainer?.remove();
        }
        this.showData = [];
        this.eventEmitter.emit('ui-content-cleared');
    }

    destroy() {
        this.clearContent();
        this.table?.remove();
        this.headerTable?.remove();
        this.scrollContainer?.remove();
        this.bodyTable?.remove();

        // Clear all event listeners
        this.eventEmitter.removeAllListeners();

        // Clear context menu
        this.contextMenu.destroy();

        // Clear properties
        this.table = null;
        this.headerTable = null;
        this.bodyTable = null;
        this.scrollContainer = null;
        this.colGroup1 = null;
        this.colGroup2 = null;
    }

    GroupRowRange(startIndex, endIndex) {
        if (startIndex < 0 || endIndex >= this.showData.length || startIndex > endIndex) {
            throw new GridError('Invalid row range to hide');
        }

        //add a grouped row element to the groupedRows div
        const groupedRow = document.createElement('div');
        groupedRow.className = 'grouped-row';
        groupedRow.setAttribute('s', startIndex); // start index of the grouped row
        groupedRow.setAttribute('_s', startIndex);  //original start index (never changes)
        groupedRow.setAttribute('l', endIndex - startIndex + 1); // length of the grouped row
        this.groupedRows.appendChild(groupedRow);

        groupedRow.onclick = () => {
            this.toggleGroupedRow(groupedRow);
        };

        this.#_computeVisibleIndices();
        this.virtualScrolling.startIndex = 0; // or keep current scroll position logic if you prefer
        this._updateVisibleRows();

        this.eventEmitter.emit('ui-row-range-hidden', {startIndex, endIndex});
    }

    /**
     * Toggles the visibility of a grouped row.
     * @param groupedRow {HTMLElement} - The grouped row element to toggle.
     * @param show {-1|boolean} - If -1, toggles the visibility. If 1|true, shows the row. If 0|false, hides the row.
     */
    toggleGroupedRow(groupedRow, show = -1) {
        // Get start and end index from the DOM attributes
        const startIndex = parseInt(groupedRow.getAttribute('_s'), 10);
        const length = parseInt(groupedRow.getAttribute('l'), 10);
        const endIndex = startIndex + length - 1;

        // // Toggle visibility of the grouped rows
        // const hidden = show == -1 ? groupedRow.classList.toggle('hidden')
        // const isHidden = groupedRow.classList.contains('hidden');

        if (show === -1) {
            groupedRow.classList.toggle('hidden');
        }
        const isHidden = show === -1 ? groupedRow.classList.contains('hidden') : show == 1 ? !true : !false;

        //add the range to the showDataHidden array
        const previousGroupedRow = groupedRow.previousElementSibling;
        if (isHidden) {
            //toggle to hide the rows
            for (let i = startIndex + 1; i <= endIndex; i++) {
                this.hiddenIndices.add(this.showData[i]);
            }

            if (previousGroupedRow) {
                const previousStart = parseInt(previousGroupedRow.getAttribute('s'), 10);
                const previousLength = parseInt(previousGroupedRow.getAttribute('l'), 10);
                groupedRow.setAttribute('s', `${previousGroupedRow.classList.contains('hidden') ? previousStart + 1 : previousStart + previousLength}`);
            } else {
                groupedRow.setAttribute('s', startIndex);
            }

            const parent = groupedRow.parentNode;
            const children = Array.from(parent.children);
            const nextIndex = children.indexOf(groupedRow) + 1;
            for (let i = nextIndex; i < children.length; i++) {
                const child = children[i];
                if (child.classList.contains('grouped-row')) {
                    child.setAttribute('s', `${parseInt(child.getAttribute('s'), 10) + 1 - parseInt(groupedRow.getAttribute('l'), 10)}`);
                }
            }

            this.eventEmitter.emit('ui-row-range-hidden', {startIndex, endIndex});
        } else {
            //toggle to show the rows
            for (let i = startIndex + 1; i <= endIndex; i++) {
                this.hiddenIndices.delete(this.showData[i]);
            }

            const parent = groupedRow.parentNode;
            const children = Array.from(parent.children);
            const nextIndex = children.indexOf(groupedRow) + 1;
            for (let i = nextIndex; i < children.length; i++) {
                const child = children[i];
                if (child.classList.contains('grouped-row')) {
                    child.setAttribute('s', `${parseInt(child.getAttribute('s'), 10) + parseInt(groupedRow.getAttribute('l'), 10) - 1}`);
                }
            }

            this.eventEmitter.emit('ui-row-range-shown', {startIndex, endIndex});
        }

        this.#_computeVisibleIndices();
        this.virtualScrolling.startIndex = 0; // or keep current scroll position logic if you prefer
        this._updateVisibleRows();
    }

    #_hideColumn(Index) {
        const column = this.colGroup1.children[Index + 1];
        const headerCell = this.headerTable.querySelector(`th:nth-child(${Index + 2})`);
        if (column) {
            column.style.visibility = 'collapse';
            headerCell.style.pointerEvents = 'none';
        }

        const column2 = this.colGroup2.children[Index + 1];
        if (column2) {
            column2.style.visibility = 'collapse';
        }
    }

    #_showColumn(Index) {
        const column = this.colGroup1.children[Index + 1];
        const headerCell = this.headerTable.querySelector(`th:nth-child(${Index + 2})`);
        if (column) {
            column.style.visibility = 'visible';
            headerCell.style.pointerEvents = 'auto';
        }

        const column2 = this.colGroup2.children[Index + 1];
        if (column2) {
            column2.style.visibility = 'visible';
        }
    }

    // ======================================== PRIVATE METHODS ========================================

    #_init(containerId) {
        this.container = document.querySelector(containerId);
        if (!this.container) {
            throw new GridError(`Container with id "${containerId}" not found`);
        }

        this.keyboardShortcuts.addShortcut('ctrl+shift+a', 'Shortcut to automatically fit the columns to a (almost) perfect fit', () => {
            this.autoFitCellWidth();
        });

        this.keyboardShortcuts.addShortcut('ctrl+shift+r', 'Shortcut to refresh the UI', () => {
            this.UICacheRefresh = true;
            this.render(this.showData);
        });

        //add a shortcut to open or close all grouped rows
        this.keyboardShortcuts.addShortcut('ctrl+shift+g', 'Shortcut to toggle all grouped rows', () => {
            const groupedRows = this.groupedRows.querySelectorAll('.grouped-rows > .grouped-row');
            if (groupedRows.length === 0) return;

            //if the first grouped row is hidden, show all, otherwise hide all
            const firstGroupedRow = groupedRows[0];
            const shouldShow = firstGroupedRow.classList.contains('hidden');
            console.log(shouldShow, firstGroupedRow.classList.contains('hidden'));
            groupedRows.forEach((row) => {
                //if shouldShow and the row is hidden, show it, otherwise skip it
                //if !shouldShow and the row is not hidden, hide it, otherwise skip it
                if (shouldShow && row.classList.contains('hidden')) {
                    this.toggleGroupedRow(row);
                }
                else if (!shouldShow && !row.classList.contains('hidden')) {
                    this.toggleGroupedRow(row);
                }
            });

            this.#_computeVisibleIndices();
            this.virtualScrolling.startIndex = 0; // or keep current scroll position logic if you prefer
            this._updateVisibleRows();
        });

        this.container.addEventListener('keydown', (event) => {
            ['ctrl', 'shift', 'alt'].forEach((key) => {
                if (event[`${key}Key`]) {
                    this.container.setAttribute(key, 'true');
                }
            });
        });

        this.container.addEventListener('keyup', (event) => {
            ['ctrl', 'shift', 'alt'].forEach((key) => {
                if (!event[`${key}Key`]) {
                    this.container.removeAttribute(key);
                }
            });
        });

        this.eventEmitter.emit('ui-container-initialized', { containerId });
    }

    //======================================== TABLE FACTORY ========================================
    #_createResizableTable() {
        if (!this.UICacheRefresh)
            return this.table;
        else
            this.table?.remove();

        this.table = document.createElement('div');
        this.table.className = 'table';

        return this.table;
    }

    #_renderTable(columns) {
        const tableExists = this.table && this.table.parentNode;
        const tableHeaderExists = this.headerTable && this.headerTable.parentNode;
        const bodyTableExists = this.bodyTable && this.bodyTable.parentNode;


        if (!tableExists) {
            this.table = document.createElement('div');
            this.table.className = 'dynamic-grid-table';
            this.table.dataset.theme = this.config.colorScheme;
        }

        if (!tableHeaderExists) {
            this.headerTable = document.createElement('table');
            this.headerTable.className = 'dynamic-grid-table-header';
            this.headerTable.setAttribute('cellspacing', '0');
            this.headerTable.setAttribute('cellpadding', '0');

            const colgroup = this.#_createColGroup(columns);
            this.colGroup1 = colgroup;

            this.headerTable.appendChild(colgroup);
            this.headerTable.appendChild(this.#_createHeader(columns));

            this.table.appendChild(this.headerTable);
        }

        if (!bodyTableExists) {
            // Create scroll container for the body
            this.scrollContainer = document.createElement('div');
            this.scrollContainer.className = 'dynamic-grid-scroll-container';
            this.scrollContainer.style.position = 'relative';
            this.scrollContainer.style.width = '100%';

            // BODY
            this.bodyTable = document.createElement('table');
            this.bodyTable.className = 'dynamic-grid-table-body';
            this.bodyTable.setAttribute('cellspacing', '0');
            this.bodyTable.setAttribute('cellpadding', '0');

            const colgroup2 = this.#_createColGroup(columns);
            this.colGroup2 = colgroup2;

            this.bodyTable.appendChild(colgroup2);

            // Create spacers for virtual scrolling
            this.virtualScrolling.topSpacer = document.createElement('tr');
            this.virtualScrolling.topSpacer.style.height = '0px';
            this.virtualScrolling.topSpacer.className = 'virtual-scroll-spacer top-spacer';

            this.virtualScrolling.bottomSpacer = document.createElement('tr');
            this.virtualScrolling.bottomSpacer.style.height = '0px';
            this.virtualScrolling.bottomSpacer.className = 'virtual-scroll-spacer bottom-spacer';

            this.scrollContainer.appendChild(this.bodyTable);
            this.table.appendChild(this.scrollContainer);


            //grouped rows buttons
            this.groupedRows = document.createElement('div');
            this.groupedRows.className = 'grouped-rows';
            this.groupedRows.style.setProperty('--y-offset', '0px');
            this.table.appendChild(this.groupedRows);
        }
        else {
            this.bodyTable.innerHTML = '';
            this.bodyTable.appendChild(this.colGroup2);
        }

        // Create the body with virtual scrolling
        this.body = this.#_createVirtualBody();

        this.bodyTable.appendChild(this.body);
        this.container.appendChild(this.table);
    }

    #_createColGroup(headers) {
        const colgroup = document.createElement('colgroup');
        const topLeftCorner = document.createElement('col');
        topLeftCorner.style.width = `30px`;
        topLeftCorner.setAttribute('resizable', 'false');
        colgroup.appendChild(topLeftCorner);



        var width = 0;
        for (const key in headers) {
            if (typeof headers[key] !== 'string') continue;
            const header = grid.engine.getHeader(headers[key]).config;
            // console.log(header)
            const col = document.createElement('col');
            width += header.width ?? 100;
            col.style.width = `${header.width ?? 100}px`;
            col.style.minWidth = `${header.minWidth}px`;
            col.style.maxWidth = `${header.maxWidth}px`;
            header.resizable ? col.setAttribute('resizable', 'true') : null;
            colgroup.appendChild(col);
        }
        colgroup.style.width = `${width}px`;
        return colgroup;
    }

    #_createHeader(columns) {
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        tr.className = 'header-row';

        const thTopLeftCorner = document.createElement('th');
        thTopLeftCorner.className = 'header-cell top-left-corner';
        tr.appendChild(thTopLeftCorner);

        thTopLeftCorner.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            this.contextMenu.clear();
            this.contextMenu
                .searchSelect('Columns to show/hide', this.engine.getColumns().map((column) => {return {label: column,value: column,checked: true};}), {
                    onChange: (value) => {
                        //diff between this.engine.getColumns() and value
                        const columns = this.engine.getColumns();
                        const diff = columns.filter((column) => !value.includes(column));
                        columns.forEach((column) => {
                            if (!diff.includes(column)) {
                                this.#_showColumn(columns.indexOf(column));
                            }
                            else {
                                this.#_hideColumn(columns.indexOf(column));
                            }
                        });
                    }
                });

            // Display the context menu at the specified coordinates
            return this.contextMenu.showAt(100, 100);
        });

        columns.forEach((columnName, colIndex) => {
            colIndex++;

            const header = this.engine.headers[columnName];
            const plugin = header.plugin || this.engine.getPlugin(columnName);

            const th = document.createElement('th');
            th.className = 'header-cell';
            th.className += ` ${header.config.headerClass || ''}`;
            th.style.height = `${this.config.rowHeight}px`;
            th.style.position = 'relative';


            const div = document.createElement('div');
            div.className = 'header-cell-content';

            const button = document.createElement('button');
            button.className = 'header-cell-button';
            button.innerText = '▼';

            const span = document.createElement('span');
            span.className = 'header-cell-text';
            span.innerText = header.name || columnName;

            div.appendChild(button);
            div.appendChild(span);
            th.appendChild(div);

            // === ADD: RESIZE HANDLE ===
            if (header.config.resizable) {
                const resizeHandle = document.createElement('div');
                resizeHandle.className = 'header-resize-handle';

                let isDragging = false;
                let startX = 0;
                let startWidth = 0;
                const colElement = this.colGroup1?.children[colIndex];
                let newWidth = 0;

                resizeHandle.addEventListener('mouseenter', () => {
                    resizeHandle.classList.add('hover');
                });
                resizeHandle.addEventListener('mouseleave', () => {
                    if (!isDragging) resizeHandle.classList.remove('hover');
                });

                resizeHandle.addEventListener('mousedown', (e) => {
                    isDragging = true;
                    startX = e.clientX;
                    startWidth = colElement?.offsetWidth || 100;

                    const onMouseMove = (e) => {
                        if (!isDragging || !colElement) return;
                        const delta = e.clientX - startX;
                        newWidth = Math.max(this.config.minColumnWidth, startWidth + delta);
                        newWidth = Math.max(newWidth, this.config.minColumnWidth);
                        colElement.style.width = `${newWidth}px`;
                    };

                    const onMouseUp = () => {
                        isDragging = false;
                        resizeHandle.classList.remove('hover');
                        this.colGroup2.children[colIndex].style.width = `${newWidth}px`;
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });


                th.appendChild(resizeHandle);
            }

            th.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                plugin.showMore(columnName, th, this.engine, this, header.config);
            });

            tr.appendChild(th);
        });

        thead.appendChild(tr);
        return thead;
    }

    #_createVirtualBody() {
        const tbody = document.createElement('tbody');

        // Add top spacer for virtual scrolling
        tbody.appendChild(this.virtualScrolling.topSpacer);

        // Initial render of visible rows (empty until scroll handler calculates what's needed)

        // Add bottom spacer for virtual scrolling
        tbody.appendChild(this.virtualScrolling.bottomSpacer);

        this.body = tbody;
        return tbody;
    }

    #_setupVirtualScrolling() {
        if (!this.table || !this.showData.length) return;

        // Calculate total height of all rows
        const totalRows = this.showData.length;
        this.virtualScrolling.totalHeight = totalRows * this.config.rowHeight;

        this.#_computeVisibleIndices();

        // Calculate how many rows can be visible at once
        const visibleHeight = this.table.clientHeight || 400; // Default height if not set
        this.virtualScrolling.visibleRowsCount = Math.ceil(visibleHeight / this.config.rowHeight);

        // Add buffer rows above and below
        const totalVisibleRows = this.virtualScrolling.visibleRowsCount + (this.config.bufferedRows * 2);

        // Set initial range
        this.virtualScrolling.startIndex = 0;
        this.virtualScrolling.endIndex = Math.min(totalVisibleRows, totalRows);

        // Attach scroll event listener to the correct element
        this.table.addEventListener('scroll', this.#_handleScroll.bind(this));

        // Initial render of visible rows
        this._updateVisibleRows();

        // Set initial scroll position (if needed)
        if (this.virtualScrolling.scrollTop > 0) {
            this.table.scrollTop = this.virtualScrolling.scrollTop;
        }
    }

    #_handleScroll(event) {
        const scrollTop = event.target.scrollTop;
        const rowHeight = this.config.rowHeight;

        this.virtualScrolling.scrollTop = scrollTop;
        this.groupedRows.style.setProperty('--y-offset', `${scrollTop}px`);

        const rowIndex = Math.floor(scrollTop / rowHeight);
        const startIndex = Math.max(0, rowIndex - this.config.bufferedRows);

        const visibleRows = this.visibleIndices;

        const clampedStart = Math.min(startIndex, visibleRows.length - 1);
        const clampedEnd = Math.min(
            clampedStart + this.virtualScrolling.visibleRowsCount + this.config.bufferedRows * 2,
            visibleRows.length
        );

        if (
            clampedStart !== this.virtualScrolling.startIndex ||
            clampedEnd !== this.virtualScrolling.endIndex
        ) {
            this.virtualScrolling.startIndex = clampedStart;
            this.virtualScrolling.endIndex = clampedEnd;
            this._updateVisibleRows();
        }
    }

    _updateVisibleRows() {
        const visibleRows = this.visibleIndices;
        const start = this.virtualScrolling.startIndex;
        const end = Math.min(
            start + this.virtualScrolling.visibleRowsCount + this.config.bufferedRows * 2,
            visibleRows.length
        );

        // Clear current non-spacer rows
        const currentRows = Array.from(this.body.querySelectorAll('tr:not(.virtual-scroll-spacer)'));
        currentRows.forEach(row => row.remove());

        const fragment = document.createDocumentFragment();

        for (let i = start; i < end; i++) {
            const rowIndex = visibleRows[i];
            const rowData = this.showData[rowIndex];
            const row = this.#_createRow(rowData);
            fragment.appendChild(row);
        }

        this.virtualScrolling.topSpacer.after(fragment);

        this.virtualScrolling.topSpacer.style.height = `${start * this.config.rowHeight}px`;
        this.virtualScrolling.bottomSpacer.style.height = `${(visibleRows.length - end) * this.config.rowHeight}px`;
    }


    #_getNextVisibleIndex(startIndex) {
        while (startIndex < this.showData.length && this.hiddenIndices.has(this.showData[startIndex])) {
            startIndex++;
        }
        return startIndex;
    }

    #_computeVisibleIndices() {
        this.visibleIndices = this.showData
            .map((_, i) => i)
            .filter(i => !this.hiddenIndices.has(this.showData[i]));
    }

    #_createRow(index) {
        const tr = document.createElement('tr');
        tr.dataset.index = index;


        this.engine.getData(index).then((data) => {
            const numberCell = document.createElement('td');
            numberCell.className = 'body-cell';
            numberCell.style.height = `${this.config.rowHeight}px`;
            numberCell.innerText = this.showData.indexOf(index) + 1; // Display the row number

            tr.appendChild(numberCell);

            Object.entries(data).forEach(([key, value]) => {
                if (key === 'internal_id') return;
                const header = this.engine.getHeader(key);
                const plugin = header.plugin || this.engine.getPlugin(key);

                const onEdit = (callback) => {
                    this.engine.updateTracker.addEdit({ column: key, row: data, previousValue: value, newValue: callback });
                    this.engine.alterData(index, key, callback);
                    this.eventEmitter.emit('ui-cell-edit', { column: key, row: data, previousValue: value, newValue: callback });
                    td.classList.add('edited'); // Add a class to indicate
                }

                let td = document.createElement('td');
                //td.append(plugin.renderCell(value, onEdit, header.config));

                try {
                    if (header.config.isEditable) {
                        const input = typeof plugin.getInputComponent === 'function'
                            ? plugin.getInputComponent(value, onEdit)
                            : BaseTypePlugin.prototype.getInputComponent(value, onEdit);

                        td.appendChild(input);
                    }
                    else {
                        let span = document.createElement('span');
                        span.className = 'cell-value';
                        span.innerText = value !== undefined ? String(value) : '';
                        td.appendChild(span);
                    }
                }
                catch (error) {
                    console.error(`Error rendering cell for key "${key}" with value "${value}":\n`, error);

                    switch (error.name) {
                        case 'RangeError':
                            td.innerText = `YYYY-MM-DD`;
                            break;
                        case 'TypeError':
                            td.innerText = `Invalid value: ${value}`;
                            break;
                        case 'SyntaxError':
                            td.innerText = `Syntax Error: ${error.message}`;
                            break;
                        case 'GridError':
                            td.innerText = `Grid Error: ${error.message}`;
                            break;
                        default:
                            td.innerText = `Error: ${error.message}`;
                    }
                    td.style.backgroundColor = 'red';
                }


                // Apply custom CSS classes if provided
                if (!!header.config.cellClass) {
                    td.classList.add(...header.config.cellClass.split(' '));
                }

                // If td is not a td html element, log it, the value and the key and the plugin
                if (!(td instanceof HTMLTableCellElement)) {
                    console.error(plugin.name + '.renderCell() did not return a td element', { td, value, key, plugin });
                    td = document.createElement('td');
                    td.style.backgroundColor = 'red';
                    td.innerText = `Invalid cell`;
                }

                td.classList.add('body-cell');
                td.style.height = `${this.config.rowHeight}px`;
                tr.appendChild(td);
            });
        });

        return tr;
    }


    #_approximateColumnWidth() {
        function approximateWidth(sampleData) {
            const maxLength = Math.max(...sampleData.map((item) => String(item).length));
            return Math.max(50, maxLength * 8.75); // 8 pixels per character, minimum width of 50px
        }

        const columns = this.engine.getColumns();
        const columnWidths = {};

        columns.forEach((column) => {
            //const sampleData = this.showData.map((item) => item[column]);
            //columnWidths[column] = approximateWidth(sampleData);
            const sampleData = this.engine.getData(0, true);
            if (sampleData && sampleData[column] !== undefined) {
                columnWidths[column] = approximateWidth([sampleData[column]]);
            } else {
                columnWidths[column] = this.config.minColumnWidth; // Fallback to minimum width if no data
            }
        });

        return columnWidths;
    }

    #_setWidths(widths) {
        for (let i = 0; i < widths.length; i++) {
            this.setWidth(i, widths[i]);
        }
    }

    autoFitCellWidth() {
        this.#_setWidths(Object.values(this.#_approximateColumnWidth()))
    }

    setWidth(column, width) {
        this.colGroup1.children[column + 1].style.width = `${width}px`;
        this.colGroup2.children[column + 1].style.width = `${width}px`;
    }
}