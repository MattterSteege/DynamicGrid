class DynamicGridUI {
    constructor(dynamicGrid, containerId) {
        this.dynamicGrid = dynamicGrid;
        this.sortState = {};
        this.filterState = {};
        this.originalData = [];

        this.init(containerId);
    }

    // Initialize grid with container and data
    init(containerId) {
        this.container = document.querySelector(containerId);
        if (!this.container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }
    }

    // Main render method
    render(data) {
        this.container.className = 'dynamic-grid-container';
        this.container.innerHTML = ''; // Clear container

        const table = document.createElement('table');
        table.className = 'dynamic-grid';

        table.appendChild(this.renderHeader());
        table.appendChild(this.renderBody(data));

        this.container.appendChild(table);
    }

    // Render table header with sorting and filtering
    renderHeader() {
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        Object.entries(this.dynamicGrid.engine.headers).forEach(([key, type]) => {
            const th = document.createElement('th');

            // Header content wrapper
            const headerContent = document.createElement('div');
            headerContent.className = 'header-content';

            // Column title and sort button
            const titleWrapper = document.createElement('div');
            titleWrapper.className = 'title-wrapper';

            const headerText = document.createElement('span');
            headerText.textContent = key;
            titleWrapper.appendChild(headerText);

            const sortButton = document.createElement('button');
            sortButton.className = 'sort-button';
            sortButton.innerHTML = '<span class="sort-icon"></span>';
            sortButton.onclick = () => this.handleSort(key);
            titleWrapper.appendChild(sortButton);

            headerContent.appendChild(titleWrapper);

            // Filter input
            const filterInput = document.createElement('input');
            filterInput.type = 'text';
            filterInput.className = 'filter-input';
            filterInput.placeholder = `Filter ${key}...`;
            filterInput.oninput = (e) => this.handleFilter(key, e.target.value, type);
            headerContent.appendChild(filterInput);

            th.appendChild(headerContent);
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        return thead;
    }

    // Render table body
    renderBody(data) {
        const tbody = document.createElement('tbody');

        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.className = index % 2 === 0 ? 'row-even' : 'row-odd';

            Object.keys(this.dynamicGrid.engine.headers).forEach(key => {
                const td = document.createElement('td');
                td.textContent = this.formatCellValue(row[key]);
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        return tbody;
    }

    // Update table body with new data
    updateBody(data) {
        const oldTbody = this.container.querySelector('tbody');
        const newTbody = this.renderBody(data);
        oldTbody.parentNode.replaceChild(newTbody, oldTbody);
    }


    //==================================================================================================================

    // Handle column sorting
    handleSort(field) {
        console.error('MOVE TO TypePlugin');
        this.sortState[field] = this.sortState[field] === 'asc' ? 'desc' : 'asc';

        // Update sort button states
        const buttons = document.querySelectorAll('.sort-button');
        buttons.forEach(button => button.classList.remove('sort-asc', 'sort-desc'));
        const currentButton = Array.from(buttons)
            .find(button => button.parentElement.textContent.includes(field));
        currentButton.classList.add(`sort-${this.sortState[field]}`);

        // Apply sort
        const query = `sort ${field} ${this.sortState[field]}`;
        const sortedData = this.dynamicGrid.engine.query(query);
        this.updateBody(sortedData);
    }

    // Handle column filtering
    handleFilter(field, value, type) {
        console.error('MOVE TO TypePlugin');
        this.filterState[field] = value;

        // Build combined filter query
        const filterQueries = Object.entries(this.filterState)
            .filter(([_, val]) => val)
            .map(([key, val]) => {
                switch (this.dynamicGrid.engine.headers[key]) {
                    case 'string':
                        return `${key} co "${val}"`;
                    case 'number':
                        return !isNaN(val) ? `${key} eq ${val}` : '';
                    case 'boolean':
                        return val.toLowerCase() === 'true' || val.toLowerCase() === 'false' ?
                            `${key} eq ${val.toLowerCase()}` : '';
                    default:
                        return '';
                }
            })
            .filter(q => q)
            .join(' and ');

        const filteredData = filterQueries ?
            this.dynamicGrid.engine.query(filterQueries) :
            this.originalData;

        this.updateBody(filteredData);
    }

    // Format cell values for display
    formatCellValue(value) {
        console.error('MOVE TO TypePlugin');
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        return value?.toString() ?? '';
    }
}
