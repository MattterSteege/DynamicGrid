class DynamicGridUI {
    constructor(dynamicGrid, ui_config) {
        this.dynamicGrid = dynamicGrid;
        this.containerId = ui_config.containerId;

        this.table = null;

        this.config = {
            minColumnWidth: ui_config.minColumnWidth ?? 5,
            rowHeight: ui_config.rowHeight ?? 40,
            bufferedRows: ui_config.bufferedRows ?? 10,
        }

        this.init(this.containerId);
    }

    // Initialize grid with container and data
    init(containerId) {
        this.container = document.querySelector(containerId);
        if (!this.container) {
            throw new GridError(`Container with id "${containerId}" not found`);
        }
    }

    render(data) {
        this.table = this.createResizableTable(Object.keys(data[0]).length);
        this.initResizerDelegation();
        this.renderTable(data);
    }

    initResizerDelegation() {
        this.table.addEventListener('mousedown', (e) => {
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
                    this.updateColumnWidths(table);
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


    renderTable(data) {
        this.table.innerHTML = '';

        const headers = Object.keys(data[0]);

        // Generate header
        const header = this.createTableHeader(headers);
        //this.table.style.gridTemplateColumns = headers.map((_, index) => `var(--column-width-${index + 1})`).join(' ');
        this.table.style.display = 'grid';
        this.table.style.gridTemplateRows = '40px 1fr';
        this.table.style.width = '100%';
        this.table.style.height = '100%';
        this.updateColumnWidths(this.table);
        this.table.appendChild(header);

        // Virtual scrolling
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'scroll-container';
        scrollContainer.style.overflowY = 'auto';

        // Add a container for all rows
        const bodyContainer = document.createElement('div');
        bodyContainer.className = 'body-container';
        scrollContainer.appendChild(bodyContainer);

        scrollContainer.addEventListener('scroll', () =>
            this.updateVisibleRows(data, headers, bodyContainer, scrollContainer)
        );

        // Initialize visible rows
        //this.updateVisibleRows(data, headers, bodyContainer, scrollContainer);

        this.table.appendChild(scrollContainer);
        this.container.appendChild(this.table);
        this.updateVisibleRows(data, headers, bodyContainer, scrollContainer);
    }


    updateVisibleRows(data, headers, container, scrollContainer) {

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
        const visibleRowsContainer = document.createElement('div');
        visibleRowsContainer.style.position = 'absolute';
        visibleRowsContainer.style.top = `${startRow * this.config.rowHeight}px`;
        visibleRowsContainer.style.left = '0';
        visibleRowsContainer.style.right = '0';
        visibleRowsContainer.style.display = 'grid';
        visibleRowsContainer.style.gridTemplateColumns = headers.map((_, index) => `var(--column-width-${index + 1})`).join(' ');

        for (let i = startRow; i < endRow; i++) {
            const tableRow = this.createTableRow();
            headers.forEach((header) => {
                const cell = this.createTableCell(data[i][header]);
                tableRow.appendChild(cell);
            });
            visibleRowsContainer.appendChild(tableRow);
        }

        // Replace the old visible rows with the new set
        if (container.lastChild) {
            container.removeChild(container.lastChild);
        }
        container.appendChild(visibleRowsContainer);
    }

    //======================================== TABLE FACTORY ========================================
    createResizableTable(columns) {
        const table = document.createElement('div');
        table.className = 'table';
        this.columnWidths = Array(columns).fill(100/columns);

        // Apply initial column widths
        this.updateColumnWidths(table);
        this.table = table;
        return table;
    }

    createTableHeader(headers) {
        const header = document.createElement('div');
        header.className = 'row header';
        header.style.display = 'grid';
        header.style.gridTemplateColumns = headers.map((_, index) => `var(--column-width-${index + 1})`).join(' ');

        // Create header row
        headers.forEach((_header, index) => {
            const cell = this.createTableCell(_header);
            cell.title = _header;

            index < headers.length - 1 && cell.appendChild(this.createResizer(index));

            header.appendChild(cell);
        });

        return header;
    }

    createTableBody(data, headers) {
        const body = document.createElement('div');
        body.className = 'row body';

        // Create body rows
        data.forEach((row) => {
            const tableRow = this.createTableRow();

            headers.forEach((header) => {
                const cell = this.createTableCell(row[header]);
                tableRow.appendChild(cell);
            });

            body.appendChild(tableRow);
        });

        return body;
    }

    createTableRow() {
        const row = document.createElement('div');
        row.className = 'row';
        row.style.display = 'contents';
        return row;
    }

    createTableCell(content = '') {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.textContent = content;
        return cell;
    }

    createResizer(index) {
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
                    this.updateColumnWidths(table);
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

    updateColumnWidths(table) {
        this.columnWidths.forEach((width, index) => {
            table.style.setProperty(`--column-width-${index + 1}`, `${width}%`);
        });
    }

    getColumnWidths(table) {
        return [...this.columnWidths];
    }

    setColumnWidths(table, widths) {
        if (widths.length === this.columnWidths.length) {
            this.columnWidths = widths.map(width => Number(width));
            this.updateColumnWidths(table);
        }
    }
}

/*
optimizations:
[ ] virtual scrolling
[ ] add one event listener to the table and use event delegation (use e.target to get the clicked element)



*/