class ContextMenu {
    #container;
    #menuDom = null;
    #isVisible = false;
    #isRootMenu = true;
    #parentMenu = null;
    #childMenus = [];
    #menuItems;

    constructor(container, items) {
        if (!container || !(container instanceof HTMLElement)) {
            throw new Error('Invalid container element');
        }

        this.#container = container;
        this.#menuItems = items;

        // Bind event handlers to preserve context
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        document.addEventListener('click', this.handleOutsideClick);
    }

    handleOutsideClick(event) {
        if (this.#isVisible &&
            this.#menuDom &&
            event.target !== this.#menuDom &&
            !this.#menuDom.contains(event.target) &&
            !event.target.closest('.context-menu')) {
            this.#dismissAllMenus();
        }
    }

    #createMenuElement(posX, posY) {
        const menuEl = document.createElement('div');
        menuEl.classList.add('context-menu');
        menuEl.style.left = `${posX}px`;
        menuEl.style.top = `${posY}px`;

        this.#menuItems.forEach(itemData => {
            menuEl.appendChild(this.#renderMenuItem(itemData));
        });

        this.#menuDom = menuEl;
        return menuEl;
    }

    #renderMenuItem(itemData) {
        // Handle separator
        if (itemData === null) {
            const separator = document.createElement('div');
            separator.classList.add('menu-separator');
            return separator;
        }

        const itemEl = document.createElement('div');
        itemEl.classList.add('menu-item');

        // Label
        const labelEl = document.createElement('span');
        labelEl.classList.add('menu-label');
        labelEl.textContent = itemData.text?.toString() || '';
        itemEl.appendChild(labelEl);

        // Disabled state
        if (itemData.disabled) {
            itemEl.classList.add('menu-item-disabled');
        } else {
            itemEl.classList.add('menu-item-active');
        }

        // Hotkey
        const hotkeyEl = document.createElement('span');
        hotkeyEl.classList.add('menu-hotkey');
        hotkeyEl.textContent = itemData.hotkey?.toString() || '';
        itemEl.appendChild(hotkeyEl);

        // Submenu handling
        if (this.#hasSubItems(itemData)) {
            const subMenuData = itemData.subitems || itemData.submenu;
            const subMenu = subMenuData instanceof ContextMenuHandler
                ? subMenuData
                : new ContextMenuHandler(this.#container, subMenuData);

            subMenu.#isRootMenu = false;
            subMenu.#parentMenu = this;

            this.#childMenus.push(subMenu);

            itemEl.classList.add('has-submenu');

            const openSubMenu = (e) => {
                if (itemData.disabled) return;

                this.#hideChildMenus();

                const subMenuPosX = this.#menuDom.offsetLeft + this.#menuDom.clientWidth + itemEl.offsetLeft;
                const subMenuPosY = this.#menuDom.offsetTop + itemEl.offsetTop;

                subMenu.#isVisible ? subMenu.#hide() : subMenu.#show(subMenuPosX, subMenuPosY);
            };

            itemEl.addEventListener('click', openSubMenu);
            itemEl.addEventListener('mousemove', openSubMenu);
        } else {
            // Regular menu item click handler
            itemEl.addEventListener('click', (e) => {
                this.#hideChildMenus();

                if (itemEl.classList.contains('menu-item-disabled')) return;

                if (typeof itemData.onclick === 'function') {
                    const eventContext = {
                        handled: false,
                        item: itemEl,
                        label: labelEl,
                        hotkey: hotkeyEl,
                        items: this.#menuItems,
                        data: itemData
                    };

                    itemData.onclick(eventContext);

                    if (!eventContext.handled) {
                        this.#hide();
                    }
                } else {
                    this.#hide();
                }
            });

            itemEl.addEventListener('mousemove', () => {
                this.#hideChildMenus();
            });
        }

        return itemEl;
    }

    #hasSubItems(itemData) {
        return (itemData.subitems && Array.isArray(itemData.subitems) && itemData.subitems.length > 0) ||
            (itemData.submenu && itemData.submenu instanceof ContextMenuHandler);
    }

    #dismissAllMenus() {
        if (this.#isRootMenu && !this.#parentMenu) {
            if (this.#isVisible) {
                this.#hideChildMenus();
                this.#isVisible = false;
                this.#container.removeChild(this.#menuDom);

                if (this.#parentMenu && this.#parentMenu.#isVisible) {
                    this.#parentMenu.#hide();
                }
            }
            return;
        }

        this.#parentMenu.#hide();
    }

    #hide() {
        if (this.#menuDom && this.#isVisible) {
            this.#isVisible = false;
            this.#hideChildMenus();
            this.#container.removeChild(this.#menuDom);

            if (this.#parentMenu && this.#parentMenu.#isVisible) {
                this.#parentMenu.#hide();
            }
        }
        this.#cleanup();
    }

    #hideChildMenus() {
        this.#childMenus.forEach(submenu => {
            if (submenu.#isVisible) {
                submenu.#isVisible = false;
                submenu.#container.removeChild(submenu.#menuDom);
            }
            submenu.#hideChildMenus();
        });
    }

    #show(posX, posY) {
        this.#createMenuElement(posX, posY);
        this.#container.appendChild(this.#menuDom);

        setTimeout(() => {
            this.#isVisible = true;
        }, 0);
    }

    #cleanup() {
        this.#menuDom = null;
        document.removeEventListener('click', this.handleOutsideClick);
    }

    // /====================================================================================================\
    // |========================================== PUBLIC METHODS ==========================================|
    // \====================================================================================================/

    display(posX, posY) {
        this.#show(posX, posY);
        return this;
    }

    dismiss() {
        this.#hide();
        return this;
    }

    getMenuState() {
        return {
            container: this.#container,
            domElement: this.#menuDom,
            isVisible: this.#isVisible,
            isRootMenu: this.#isRootMenu,
            parentMenu: this.#parentMenu,
            childMenus: this.#childMenus,
            menuItems: this.#menuItems
        };
    }
}

// Example Usage
/*
const appContainer = document.getElementById('app');
const menuItems = [
    {
        text: 'File',
        subitems: [
            {text: 'New', hotkey: 'Ctrl+N', onclick: () => console.log('New file')},
            {text: 'Open', hotkey: 'Ctrl+O', onclick: () => console.log('Open file')},
            null, // Separator
            {text: 'Exit', hotkey: 'Alt+F4', onclick: () => console.log('Exit app')}
        ]
    },
    {
        text: 'Edit',
        subitems: [
            {text: 'Cut', hotkey: 'Ctrl+X', onclick: () => console.log('Cut')},
            {text: 'Copy', hotkey: 'Ctrl+C', onclick: () => console.log('Copy')},
            {text: 'Paste', hotkey: 'Ctrl+V', onclick: () => console.log('Paste')}
        ]
    }
];

const contextMenu = new ContextMenuHandler(appContainer, menuItems);
*/