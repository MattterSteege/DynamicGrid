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
            minColumnWidth: ui_config.minColumnWidth ?? 100,
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
            this.table = this.#_createResizableTable(columns.slice(1), firstDataItem, isGroupedData);
        }

        this.#_renderTable(data, columns.slice(1), isGroupedData);
        this.eventEmitter.emit('ui-rendered', { data });
    }

    // ======================================== PRIVATE METHODS ========================================

    #_init(containerId) {
        this.container = document.querySelector(containerId);
        if (!this.container) {
            throw new GridError(`Container with id "${containerId}" not found`);
        }

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

    #_renderTable(data, columns, isGroupedData) {
        const table = document.createElement('div');
        table.className = 'dynamic-grid-table';

        const headerTable = document.createElement('table');
        headerTable.className = 'dynamic-grid-table-header';

        const colgroup = this.#_createColGroup(columns);
        this.currentColGroup = colgroup;

        headerTable.appendChild(colgroup);
        headerTable.appendChild(this.#_createHeader(columns, isGroupedData, colgroup));

        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'scroll-container';
        scrollContainer.style.overflowY = 'auto';
        scrollContainer.style.maxHeight = '500px';
        scrollContainer.style.position = 'relative';

        const bodyTable = document.createElement('table');
        bodyTable.className = 'dynamic-grid-table-body';
        bodyTable.style.position = 'absolute';
        bodyTable.style.top = '0';
        bodyTable.style.left = '0';
        bodyTable.style.right = '0';

        scrollContainer.appendChild(bodyTable);

        this.scrollContainer = scrollContainer;
        this.body = bodyTable;

        this.container.appendChild(table);
        table.appendChild(headerTable);
        this.container.appendChild(scrollContainer);

        this.#_setupVirtualScroll(data, columns, isGroupedData);
    }

    #_setupVirtualScroll(data, columns, isGroupedData) {
        const rowHeight = this.config.rowHeight;
        const bufferedRows = this.config.bufferedRows;
        const totalRows = data.length;
        const totalHeight = totalRows * rowHeight;

        const spacer = document.createElement('div');
        spacer.style.height = `${totalHeight}px`;
        spacer.style.position = 'absolute';
        spacer.style.top = '0';
        spacer.style.left = '0';
        spacer.style.right = '0';
        this.scrollContainer.appendChild(spacer);

        const visibleTable = this.body;

        const renderRows = (startIndex) => {
            const endIndex = Math.min(totalRows, startIndex + bufferedRows);
            visibleTable.innerHTML = '';

            for (let i = startIndex; i < endIndex; i++) {
                const row = data[i];
                const tr = document.createElement('tr');

                Object.entries(row).forEach(([key, value]) => {
                    if (key === 'internal_id') return;

                    const plugin = this.engine.getPlugin(key);
                    const td = plugin.renderCell(value);

                    if (!(td instanceof HTMLTableCellElement)) {
                        console.warn('Invalid TD', td);
                        return;
                    }

                    td.className = 'body-cell';
                    td.style.height = `${rowHeight}px`;

                    tr.appendChild(td);
                });

                visibleTable.appendChild(tr);
            }

            visibleTable.style.transform = `translateY(${startIndex * rowHeight}px)`;
        };

        renderRows(0);

        let lastStartIndex = -1;

        this.scrollContainer.addEventListener('scroll', () => {
            const scrollTop = this.scrollContainer.scrollTop;
            const firstVisibleRow = Math.floor(scrollTop / rowHeight);

            if (firstVisibleRow !== lastStartIndex) {
                renderRows(firstVisibleRow);
                lastStartIndex = firstVisibleRow;
            }
        });
    }


    #_createColGroup(headers) {
        const colgroup = document.createElement('colgroup');
        var width = 0;
        for (const key in headers) {
            if (typeof headers[key] !== 'string') continue;
            const col = document.createElement('col');
            width += headers[key].width ?? 100;
            col.style.width = `${headers[key].width ?? 100}px`;
            colgroup.appendChild(col);
        }
        colgroup.style.width = `${width}px`;
        return colgroup;
    }

    #_createHeader(columns, isGroupedData, colgroup) {

        console.log(columns)

        /*
        <thead>
            <tr>
                <th>
                    <div><button></button><span>Brand</span></div>
                </th>
                ...
            </tr>
        </thead>
        */

        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        tr.className = 'header-row';

        columns.forEach((columnName, colIndex) => {
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
            const colElement = colgroup?.children[colIndex];

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
                    const newWidth = Math.max(this.config.minColumnWidth, startWidth + delta);
                    colElement.style.width = `${newWidth}px`;
                };

                const onMouseUp = () => {
                    isDragging = false;
                    resizeHandle.classList.remove('hover');
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            th.appendChild(resizeHandle);
            tr.appendChild(th);
        });

        thead.appendChild(tr);
        return thead;
    }

    #_createBody(data, columns, isGroupedData) {
        /*
        <tbody>
            <tr>
                <td>Jetpulse</td>
                <td>Racing Socks</td>
                <td>$ 30.00</td>
                <td>
                    <div>▼</div>Oct 11, 2023
                </td>
                <td>01:23 AM</td>
                <td><input></td>
            </tr>
        </tbody>
         */

        const tbody = document.createElement('tbody');

        data.forEach((row, index) => {

            const tr = document.createElement('tr');

            //loop trough all the key-values of the row
            Object.entries(row).forEach(([key, value]) => {

                if (key === "internal_id") return;

                const plugin = this.engine.getPlugin(key);

                const td = plugin.renderCell(value);

                //if td is not an td html element, log it, the value and the key and the plugin
                if (!(td instanceof HTMLTableCellElement)) {
                    console.log(td, value, key, plugin);
                    return;
                }

                td.className = 'body-cell';
                td.style.height = `${this.config.rowHeight}px`;

                tr.appendChild(td);
            });

            //add the row to the body
            tbody.appendChild(tr);
        });

        this.body = tbody;

        return tbody;
    }
}

/*
optimizations:
[ ] virtual scrolling
[ ] add one event listener to the table and use event delegation (use e.target to get the clicked element)



*/

/*

<div> <- container
    <table> <- table
        <colgroup> <- colgroup (for column widths)
            <col>
            <col>
            <col>
            <col>
            <col>
            <col>
        </colgroup>
        <thead> <- header
            <tr>
                <th>
                    <div><button></button><span>Brand</span></div> <!-- header cell (with button and span) -->
                </th>
            </tr>
        </thead>
        <tbody>
            <tr> <- row (data row)
                <td>Jetpulse</td>
                <td>Racing Socks</td>
                <td>$ 30.00</td>
                <td>
                    <div>▼</div>Oct 11, 2023
                </td>
                <td>01:23 AM</td>
                <td><input></td>
            </tr>
        </tbody>
    </table>
</div>

 */
