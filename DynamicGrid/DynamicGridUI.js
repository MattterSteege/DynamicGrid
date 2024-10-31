class DynamicGridUI {
    constructor(dynamicGrid, containerId) {
        this.dynamicGrid = dynamicGrid;
        this.sortState = {};

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
            const correspondingPlugin = this.dynamicGrid.engine.getPlugin(type);
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

            const moreButton = document.createElement('button');
            moreButton.className = 'more-button';
            moreButton.innerHTML = '<span class="more-icon">&#10247;</span>';
            moreButton.onclick = () => correspondingPlugin.handleMore(key, this.dynamicGrid);
            titleWrapper.appendChild(moreButton);

            headerContent.appendChild(titleWrapper);

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
                tr.append(this.dynamicGrid.engine.getPlugin(this.dynamicGrid.engine.headers[key]).renderCell(row[key]));
            });

            tbody.appendChild(tr);
        });

        return tbody;
    }

    //==================================================================================================================
    // EVENT HANDLERS
    //==================================================================================================================
    handleSort(key) {
        this.sortState[key] = this.sortState[key] === "asc" ? "desc" : "asc";
        const sortedData = this.dynamicGrid.engine.setSort(key, this.sortState[key]);
        this.render(sortedData);
    }
}
