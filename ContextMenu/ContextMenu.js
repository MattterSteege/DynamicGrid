class ContextMenu {
    constructor(data = {}) {
        this.buttons = [];
        this.separators = [];
        this.submenus = [];
        this.nextPosition = 0;
        this.id = this.getRandomId();

        //you can change these values for layout customization
        this.style = {
            initialYOffset: 10, //pixels between the bottom of the element and the top of the first menu
            initialXOffset: 0, //pixels between the left of the element and the left of the first menu
        }

        // Animation configuration
        this.animation = {
            type: data.animationType || 'fade', // 'fade', 'slide', 'scale', 'none'
            duration: data.animationDuration || 200, // milliseconds
            timing: data.animationTiming || 'ease-out' // CSS timing function
        };

        //event listeners
        this.handleClick = this.click.bind(this);
        this.handleContextMenu = this.contextMenu.bind(this);
        this.handleMouseOver = this.mouseOver.bind(this);
        this.handleKeyPress = this.keyPress.bind(this);

        //fast initialization
        if (data.buttons) {
            this.buttons = data.buttons;
        }
        if (data.separators) {
            this.separators = data.separators;
        }
        if (data.submenus) {
            this.submenus = data.submenus;
        }

        return this;
    }

    // Add class name constants
    static CLASSNAMES = {
        BUTTON: 'context-menu-button',
        SUBMENU: 'submenu-button',
        SEPARATOR: 'context-menu-separator',
        MENU: 'context-menu',
        MAX_ASSUMED_MENU_WIDTH: 200,
        MAX_ASSUMED_MENU_HEIGHT: 300
    };

    //initialation
    addEventListeners() {
        document.addEventListener('click', this.handleClick);
        document.addEventListener('contextmenu', this.handleContextMenu);
        document.addEventListener('mouseover', this.handleMouseOver);
        document.addEventListener('keydown', this.handleKeyPress);
        document.addEventListener('keyup', this.handleKeyPress);
    }

    destroy() {
        document.removeEventListener('click', this.handleClick);
        document.removeEventListener('contextmenu', this.handleContextMenu);
        document.removeEventListener('mouseover', this.handleMouseOver);
        document.removeEventListener('keydown', this.handleKeyPress);
        document.removeEventListener('keyup', this.handleKeyPress);

        const contextMenu = document.getElementById(this.id);
        if (contextMenu) {
            contextMenu.remove();
        }
    }

    //event listeners
    click(e) {
        if (e.target.classList.contains(ContextMenu.CLASSNAMES.BUTTON)) {
            const button = this.buttons.find(b => b.id == e.target.id);
            if (button) {
                button.action();
            }
        }

        if (!e.target.closest('.' + ContextMenu.CLASSNAMES.MENU)) {
            const contextMenu = document.getElementById(this.id);
            if (contextMenu) {
                contextMenu.remove();
            }
        }
    }

    contextMenu(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    mouseOver(e) {
        if (e.target.classList.contains(ContextMenu.CLASSNAMES.SUBMENU)) {
            const submenu = this.submenus.find(s => s.subMenu.id === e.target.getAttribute('data-submenu'));
            if (submenu) {
                // Hide other submenus at the same level
                const parentMenu = e.target.closest('.' + ContextMenu.CLASSNAMES.MENU);
                const siblingSubmenus = parentMenu.querySelectorAll('.' + ContextMenu.CLASSNAMES.MENU);
                siblingSubmenus.forEach(menu => {
                    if (!menu.contains(e.target)) {
                        menu.remove();
                    }
                });

                const subMenu = submenu.subMenu.show(e.target, false, true);
                if (!subMenu) return;

                subMenu.style.left = `${e.target.getBoundingClientRect().right}px`;
                subMenu.style.top = `${e.target.getBoundingClientRect().top}px`;
                subMenu.style.display = 'block';

                e.target.parentElement.append(subMenu);

                e.troughTab ? subMenu.querySelector('.' + ContextMenu.CLASSNAMES.BUTTON).focus() : null;

                // Add mouseout handler to the submenu
                const handleMouseLeave = (event) => {
                    const submenuEl = document.getElementById(subMenu.id);
                    const relatedTarget = event.relatedTarget;

                    if (!submenuEl) return;

                    // Check if mouse moved to the parent button or the submenu itself
                    if (!submenuEl.contains(relatedTarget) &&
                        !e.target.contains(relatedTarget) &&
                        relatedTarget !== e.target) {
                        submenuEl.remove();
                    }
                };

                subMenu.addEventListener('mouseleave', handleMouseLeave);
                e.target.addEventListener('mouseleave', handleMouseLeave);
            }
        }
    }

    //don't allow a button to be pressed when the keystroke just opened a submenu
    keyPress(e) {
        //first check if the active element is a button or a submenu
        if (!document.activeElement) return;
        if (!document.activeElement.classList.contains(ContextMenu.CLASSNAMES.BUTTON) &&
            !document.activeElement.classList.contains(ContextMenu.CLASSNAMES.SUBMENU)) return;


        if (this.isKeyDown == e.type) return;
        this.isKeyDown = e.type;
        if (e.type === 'keyup') return;

        if (e.key === 'Escape') {
            const contextMenu = document.getElementById(this.id);
            if (contextMenu) {
                contextMenu.remove();
            }
        }

        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
            const focused = document.activeElement;
            if (focused.classList.contains(ContextMenu.CLASSNAMES.SUBMENU) && focused.classList.contains(ContextMenu.CLASSNAMES.BUTTON)) {
                this.mouseOver({target: focused, troughTab: true});
                e.preventDefault();
                return;
            }
        }

        //or if the current focused element is the top-most child and shift-tab is pressed
        if ((e.key === 'ArrowLeft')) {
            if (document.activeElement.parentElement.id !== this.id) return;
            const id = document.activeElement.parentElement.id;
            const submenu = document.querySelector(`[data-submenu="${id}"]`);
            if (submenu) {
                submenu.focus();
            }
        }

        //with arrow up and down, get the previous or next CLASSES.BUTTON element
        if (e.key === 'ArrowDown' && this.isRoot) {
            let focused = document.activeElement;
            if (!focused) return;

            focused = focused.nextElementSibling;
            while (!focused.classList.contains(ContextMenu.CLASSNAMES.BUTTON) && focused.nextElementSibling) {
                focused = focused.nextElementSibling;
            }

            if (focused) {
                focused.focus();
            }

            //any child of the parent of this element that is a submenu, remove it
            const parent = focused.parentElement;
            const submenus = parent.querySelectorAll('.' + ContextMenu.CLASSNAMES.MENU);
            submenus.forEach(menu => menu.remove());
        }

        if (e.key === 'ArrowUp' && this.isRoot) {
            let focused = document.activeElement;
            if (!focused) return;

            focused = focused.previousElementSibling;
            while (!focused.classList.contains(ContextMenu.CLASSNAMES.BUTTON) && focused.previousElementSibling) {
                focused = focused.previousElementSibling;
            }

            if (focused) {
                focused.focus();
            }

            //any child of the parent of this element that is a submenu, remove it
            const parent = focused.parentElement;
            const submenus = parent.querySelectorAll('.' + ContextMenu.CLASSNAMES.MENU);
            submenus.forEach(menu => menu.remove());
        }
    }

    // The rest of the methods remain the same
    addButton(button) {
        if (!button || typeof button !== 'object') {
            throw new Error('Button must be an object');
        }
        if (!button.text || typeof button.text !== 'string') {
            throw new Error('Button must have a text property');
        }
        if (!button.action || typeof button.action !== 'function') {
            throw new Error('Button must have an action function');
        }

        button.position = this.nextPosition++;
        button.id = this.getRandomId();
        this.buttons.push(button);
        return this;
    }

    addSeparator() {
        this.separators.push({position: this.nextPosition++, id: Math.random().toString(36).substring(7)});
        return this;
    }

    addSubMenu(submenu) {
        if (!submenu || typeof submenu !== 'object') {
            throw new Error('Submenu must be an object');
        }
        if (!submenu.text || typeof submenu.text !== 'string') {
            throw new Error('Submenu must have a text property');
        }
        if (!submenu.subMenu || !(submenu.subMenu instanceof ContextMenu)) {
            throw new Error('Submenu must have a subMenu property that is an instance of ContextMenu');
        }
        submenu.position = this.nextPosition++;
        submenu.id = this.getRandomId();
        submenu.tryShowSide !== undefined ? submenu.tryShowSide : 'right';
        this.submenus.push(submenu);
        return this;
    }

    show(element, isRoot = true, dontAutoAdd = false) {
        const existingContextMenu = document.getElementById(this.id);
        if (existingContextMenu) {
            return;
        }

        let contextMenu = this.render();

        const calculatePosition = (element, isRoot) => {
            const rect = element.getBoundingClientRect();
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };

            let left = isRoot ?
                rect.left + this.style.initialXOffset :
                rect.right;
            let top = isRoot ?
                rect.bottom + this.style.initialYOffset :
                rect.top;

            // Prevent menu from going off-screen
            if (left + ContextMenu.CLASSNAMES.MAX_ASSUMED_MENU_WIDTH > viewport.width) { // assuming 200px menu width
                left = rect.left - ContextMenu.CLASSNAMES.MAX_ASSUMED_MENU_WIDTH;
            }
            if (top + ContextMenu.CLASSNAMES.MAX_ASSUMED_MENU_HEIGHT > viewport.height) { // assuming 300px max height
                top = rect.top - ContextMenu.CLASSNAMES.MAX_ASSUMED_MENU_HEIGHT;
            }

            return { left, top };
        };

        const position = calculatePosition(element, isRoot);
        if (this.animation.animationDuration === 0) {
            contextMenu.style.left = `${position.left}px`;
            contextMenu.style.top = `${position.top}px`;
        } else {
            contextMenu.style.left = `${position.left}px`;
            contextMenu.style.top = `${position.top}px`;
            contextMenu.style.transition = `opacity ${this.animation.duration}ms ${this.animation.timing}`;

            requestAnimationFrame(() => {
                contextMenu.style.opacity = 1;
            });
        }

        if (!isRoot)
            contextMenu.style.display = 'none'

        this.isRoot = isRoot;

        contextMenu.querySelectorAll('.' + ContextMenu.CLASSNAMES.BUTTON).forEach(_button => {
            const id = _button.id;
            _button.addEventListener('click', () => {
                const button = this.buttons.find(b => b.position == id);
                if (button) {
                    button.action();
                }
            });
        });

        !dontAutoAdd && document.body.appendChild(contextMenu);

        isRoot ? contextMenu.querySelector('.' + ContextMenu.CLASSNAMES.BUTTON).focus() : null;

        this.addEventListeners();

        return contextMenu;
    }

    render() {
        const buttonHTML = (icon, text, id) => `
        <button 
            class=` + ContextMenu.CLASSNAMES.BUTTON + `
            id="${id}"
            role="menuitem"
            aria-label="${text}">
            <i class="${icon}" aria-hidden="true"></i>
            <span>${text}</span>
        </button>`;

        const separatorHTML = id =>
            `
<div class="` + ContextMenu.CLASSNAMES.SEPARATOR + `"></div>`;

        const submenuHTML = (icon, text, id, submenuId) =>
            `
            <button 
                class="` + ContextMenu.CLASSNAMES.SUBMENU + " " + ContextMenu.CLASSNAMES.BUTTON + `"
                id="${id}" 
                data-submenu="${submenuId}"
                role="menuitem"
                aria-haspopup="true"
                aria-label="${text}">
                <i class="${icon}" aria-hidden="true"></i>
                <span>${text}</span>
            </button>`;

        let html = '';

        const items = this.buttons.map(button => ({type: 'button', ...button}))
            .concat(this.separators.map(sep => ({type: 'separator', ...sep})))
            .concat(this.submenus.map(submenu => ({type: 'submenu', ...submenu})))
            .sort((a, b) => a.position - b.position);

        items.forEach(item => {
            switch (item.type) {
                case 'button':
                    html += buttonHTML(item.icon, item.text, item.id);
                    break;
                case 'separator':
                    html += separatorHTML();
                    break;
                case 'submenu': {
                    html += submenuHTML(item.icon, item.text, item.id, item.subMenu.id);
                    break;
                }
            }
        });

        let contextMenu = document.createElement('div');
        contextMenu.classList.add(ContextMenu.CLASSNAMES.MENU);
        contextMenu.id = this.id;
        contextMenu.innerHTML = html;

        return contextMenu;
    }

    getRandomId() {
        let a = (Math.random() * 2 ** 32) >>> 0;
        a |= 0;
        a = a + 0x9e3779b9 | 0;
        let t = a ^ a >>> 16;
        t = Math.imul(t, 0x21f0aaad);
        t = t ^ t >>> 15;
        t = Math.imul(t, 0x735a2d97);
        return (((t = t ^ t >>> 15) >>> 0) / 4294967296).toString(36).substring(2);
    }

    get data() {
        return {
            buttons: this.buttons,
            separators: this.separators,
            submenus: this.submenus
        };
    }

    get json() {
        return JSON.stringify(this.data);
    }
}