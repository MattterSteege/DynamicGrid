class DynamicGridUI {
    constructor(dynamicGrid, ui_config) {
        this.dynamicGrid = dynamicGrid;
        this.containerId = ui_config.containerId;

        this.init(this.containerId);

        this.cachedHeader = null;
        this.cachedPagination = null;
        this.cacheCheck = null;

        this.config = {
            usePagination: ui_config.usePagination ?? true,
            paginationPageSize: ui_config.paginationPageSize ?? 100,
            paginationPage: ui_config.paginationPage ?? 1,
        }
    }

    // Initialize grid with container and data
    init(containerId) {
        this.container = document.querySelector(containerId);
        if (!this.container) {
            throw new GridError(`Container with id "${containerId}" not found`);
        }
    }

    // Main render method
    render(data) {
        const headerNames = Object.keys(this.dynamicGrid.engine.headers).join(',');

        this.container.className = 'dynamic-grid-container';
        this.container.innerHTML = ''; // Clear container

        const table = document.createElement('table');
        table.className = 'dynamic-grid';

        const hash = FastHash(headerNames);
        const dataHash = FastHash(headerNames + '-' + data.length);
        if ((!this.cachedHeader || this.cacheCheck !== hash)) {
            this.cachedHeader = this.renderHeader();
            this.cacheCheck = hash;
        }
        //else
            //console.log('using cached header');

        if (this.config.usePagination && (!this.cachedPagination || this.cacheDataCheck !== dataHash)) {
            this.config.paginationPage = 1;
            this.cachedPagination = this.renderPagination(data);
            this.cacheDataCheck = dataHash;
        }
        //else
            //console.log('using cached pagination');


        table.appendChild(this.cachedHeader);
        table.appendChild(this.renderBody(data));

        this.container.appendChild(table);

        this.config.usePagination && this.container.appendChild(this.cachedPagination);
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

        for (let index = 0; index < data.length; index++){

            if (this.config.usePagination && index >= this.config.paginationPage * this.config.paginationPageSize) break;
            if (this.config.usePagination && index < (this.config.paginationPage - 1) * this.config.paginationPageSize) continue;

            const row = data[index];
            const tr = document.createElement('tr');
            tr.className = index % 2 === 0 ? 'row-even' : 'row-odd';

            Object.keys(this.dynamicGrid.engine.headers).forEach(key => {
                tr.append(this.dynamicGrid.engine.getPlugin(this.dynamicGrid.engine.headers[key]).renderCell(row[key]));
            });

            tbody.appendChild(tr);
        }

        return tbody;
    }

    //render the bottom pagination (if enabled)
    renderPagination(data) {
        const pagination = document.createElement('div');
        pagination.className = 'pagination';

        const totalPages = Math.ceil(data.length / this.config.paginationPageSize);

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.onclick = () => {
                this.config.paginationPage = i;
                //set button active, and remove active from other buttons
                const buttons = pagination.querySelectorAll('button');
                buttons.forEach(button => button.classList.remove('active'));
                pageButton.classList.add('active');
                this.render(data);
            }
            pagination.appendChild(pageButton);
        }

        return pagination;
    }
}


/*

optimizations:
[x] Cache the header row
[ ] Limit DOM Manipulations
[ ] Cache the domElement when no query is applied
[ ] Cache as much variables as possible
[ ] add one event listener to the table and use event delegation (use e.target to get the clicked element)

*/