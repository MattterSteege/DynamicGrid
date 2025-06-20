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

        this.config = {
            minColumnWidth: ui_config.minColumnWidth ?? 50,
            rowHeight: ui_config.rowHeight ?? 40,
            bufferedRows: ui_config.bufferedRows ?? 5,
            allowFieldEditing: ui_config.allowFieldEditing ?? false,
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
        this.showDataHidden = []; // Array of hidden data items (if any) also an array of ints


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

    //TODO: data sometimes returns not an array of ints, but an array of objects, so we need to check if the data is an array of objects or not
    render(data) {
        if (!data) return;
        if (data.length === 0) {
            this.clearContent();
            return;
        }

        console.log(data)


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

    //TODO: recalculate the top position when a group is toggled (when multiple groups are toggled, the top position should be recalculated)
    GroupRowRange(startIndex, endIndex) {
        console.log(`Grouping rows from ${startIndex} to ${endIndex}`);
        if (startIndex < 0 || endIndex >= this.showData.length || startIndex > endIndex) {
            console.log(startIndex < 0, endIndex >= this.showData.length, startIndex > endIndex)
            console.log(startIndex, this.showData.length, endIndex)
            throw new GridError('Invalid row range to hide');
        }

        // for (let i = startIndex; i <= endIndex; i++) {
        //     this.showDataHidden.push(this.showData[i]);
        // }

        //add a grouped row element to the groupedRows div
        const groupedRow = document.createElement('div');
        groupedRow.className = 'grouped-row';
        groupedRow.setAttribute('start', startIndex);
        groupedRow.setAttribute('end', endIndex);
        this.groupedRows.appendChild(groupedRow);

        groupedRow.onclick = () => {
            // Toggle visibility of the grouped rows
            const isHidden = groupedRow.classList.toggle('hidden');
            if (isHidden) {
                this.eventEmitter.emit('ui-row-range-hidden', { startIndex, endIndex });
            } else {
                this.eventEmitter.emit('ui-row-range-shown', { startIndex, endIndex });
            }

            //add the range to the showDataHidden array
            if (isHidden) {
                for (let i = startIndex; i <= endIndex; i++) {
                    if (!this.showDataHidden.includes(this.showData[i])) {
                        this.showDataHidden.push(this.showData[i]);
                    }
                }
            }
            else {
                //remove the range from the showDataHidden array
                this.showDataHidden = this.showDataHidden.filter(item => !this.showData.slice(startIndex, endIndex + 1).includes(item));
            }

            // Update the visible rows
            this._updateVisibleRows();
        }

        //update scrollcontainer
        this._updateVisibleRows();

        this.eventEmitter.emit('ui-row-range-hidden', { startIndex, endIndex });
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
        colgroup.appendChild(topLeftCorner);

        var width = 0;
        for (const key in headers) {
            if (typeof headers[key] !== 'string') continue;
            const col = document.createElement('col');
            width += headers[key].width ?? 100;
            col.style.width = `${headers[key].width ?? 100}px`;
            col.style.minWidth = `${this.config.minColumnWidth}px`;
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

            const plugin = this.engine.getPlugin(columnName);

            const th = document.createElement('th');
            th.className = 'header-cell';
            th.style.height = `${this.config.rowHeight}px`;
            th.style.position = 'relative';

            const div = document.createElement('div');
            div.className = 'header-cell-content';

            const button = document.createElement('button');
            button.className = 'header-cell-button';
            button.innerText = '▼';

            const span = document.createElement('span');
            span.className = 'header-cell-text';
            span.innerText = columnName;

            div.appendChild(button);
            div.appendChild(span);
            th.appendChild(div);

            // === ADD: RESIZE HANDLE ===
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

            th.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                plugin.showMore(columnName, th, this.engine, this);
            });

            th.appendChild(resizeHandle);
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

        if (this.virtualScrolling.scrollTop === scrollTop && scrollTop !== 0) return;

        this.groupedRows.style.setProperty('--y-offset', `${scrollTop}px`);

        const rowIndex = Math.floor(scrollTop / this.config.rowHeight);
        const startIndex = Math.max(0, rowIndex - this.config.bufferedRows);
        const endIndex = Math.min(
            this.showData.length,
            rowIndex + this.virtualScrolling.visibleRowsCount + this.config.bufferedRows
        );

        if (startIndex !== this.virtualScrolling.startIndex || endIndex !== this.virtualScrolling.endIndex) {
            this.virtualScrolling.startIndex = startIndex;
            this.virtualScrolling.endIndex = endIndex;
            this._updateVisibleRows();
        }
    }

    _updateVisibleRows() {

        const currentRows = Array.from(this.body.querySelectorAll('tr:not(.virtual-scroll-spacer)'));
        currentRows.forEach(row => row.remove());

        const fragment = document.createDocumentFragment();
        let endIndex = this.virtualScrolling.endIndex;
        for (let i = this.virtualScrolling.startIndex; i < endIndex; i++) {
            if (this.showDataHidden.includes(this.showData[i])) {
                endIndex++; // Skip hidden rows
                continue;
            }
            const row = this.#_createRow(this.showData[i]);
            fragment.appendChild(row);
        }

        this.virtualScrolling.topSpacer.after(fragment);

        this.virtualScrolling.topSpacer.style.height = `${this.virtualScrolling.startIndex * this.config.rowHeight}px`;
        const bottomSpacerHeight = Math.max(
            0,
            (this.showData.length - this.virtualScrolling.endIndex) * this.config.rowHeight
        );
        this.virtualScrolling.bottomSpacer.style.height = `${bottomSpacerHeight}px`;
    }

    #_createRow(index) {
        const tr = document.createElement('tr');
        tr.dataset.index = index;


        this.engine.getData(index).then((data) => {
            const numberCell = document.createElement('td');
            numberCell.className = 'body-cell';
            numberCell.style.height = `${this.config.rowHeight}px`;
            //numberCell.innerText = index + 1;

            tr.appendChild(numberCell);

            Object.entries(data).forEach(([key, value]) => {
                if (key === 'internal_id') return;
                const plugin = this.engine.getPlugin(key);

                const onEdit = (callback) => {
                    this.engine.updateTracker.addEdit({ column: key, row: data, previousValue: value, newValue: callback });
                    this.engine.alterData(index, key, callback);
                    this.eventEmitter.emit('ui-cell-edit', { column: key, row: data, previousValue: value, newValue: callback });
                    td.classList.add('edited'); // Add a class to indicate
                }

                const td = (this.engine.headers[key].isEditable) ? plugin.renderEditableCell(value, onEdit) : plugin.renderCell(value);

                // If td is not a td html element, log it, the value and the key and the plugin
                if (!(td instanceof HTMLTableCellElement)) {
                    console.error('[plugin].renderCell() did not return a td element', { td, value, key, plugin });
                    return;
                }

                td.className = 'body-cell';
                td.style.height = `${this.config.rowHeight}px`;
                tr.appendChild(td);
            });
        });

        return tr;
    }

    // /**
    //  * Retrieves the data at the specified index.
    //  * @param index {number} - The index of the data to retrieve.
    //  * @param removeInternalId {boolean} - Whether to remove the internal_id field from the returned data. (default: true)
    //  * @returns {Promise<Object>} - The data at the specified index, or a promise that resolves to the data.
    //  */
    // getData(index, removeInternalId = true) {
    //     if (!this.showData || index >= this.showData.length) {
    //         return Promise.reject(new Error('No data to return (data is empty, or index is out of bounds)'));
    //     }
    //
    //     index = index < 0 ? this.showData.length + index : index;
    //     const { internal_id, ...data } = this.showData[index];
    //     return Promise.resolve(removeInternalId ? data : this.showData[index]);
    // }

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