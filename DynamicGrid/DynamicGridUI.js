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
        headerRow.addEventListener("click", (e) => {
            e.preventDefault();

            const target = e.target;
            const clickable = target.getAttribute('header-clickable');
            if (!clickable) return;

            const key = target.getAttribute('data-key');
            const type = target.getAttribute('data-type');

            if (clickable === 'sort') {
                this.sortedState = {key, state: this.sortedState?.key === key ? (this.sortedState.state === 'asc' ? 'desc' : 'asc') : 'asc'};
                this.render(this.dynamicGrid.engine.sort(this.sortedState.key, this.sortedState.state));
            } else if (clickable === 'more') {
                this.dynamicGrid.engine.plugins[type].showMore(key);
            }
        });

        Object.entries(this.dynamicGrid.engine.headers).forEach(([key, type]) => {
            if (key === 'internal_id') return;

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
            sortButton.innerHTML = '<span style="pointer-events: none" class="sort-icon"></span>';
            sortButton.setAttribute('header-clickable', 'sort');
            sortButton.setAttribute('data-key', key);
            sortButton.setAttribute('data-type', type);
            titleWrapper.appendChild(sortButton);

            const moreButton = document.createElement('button');
            moreButton.className = 'more-button';
            moreButton.innerHTML = '<span style="pointer-events: none" class="more-icon">&#10247;</span>';
            moreButton.setAttribute('header-clickable', 'more');
            moreButton.setAttribute('data-key', key);
            moreButton.setAttribute('data-type', type);
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
                if (key === 'internal_id') return;
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
[ ] virtual scrolling
[ ] add one event listener to the table and use event delegation (use e.target to get the clicked element)
*/