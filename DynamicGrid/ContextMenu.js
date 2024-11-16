class ContextMenu {
    static ITEM_TYPES = {
        BUTTON: 'button',
        SEPARATOR: 'separator',
        SUBMENU: 'submenu',
        INPUT: 'input',
        DROPDOWN: 'dropdown',
        CHECKBOX: 'checkbox',
        RADIO: 'radio'
    };

    static CLASSNAMES = {
        BUTTON: 'context-menu-button',
        SUBMENU: 'context-menu-submenu',
        SEPARATOR: 'context-menu-separator',
        MENU: 'context-menu',
        INPUT: 'context-menu-input',
        DROPDOWN: 'context-menu-dropdown',
        CHECKBOX: 'context-menu-checkbox',
        RADIO: 'context-menu-radio',
        CONTAINER: 'context-menu-container',
        ICON: 'context-menu-icon',
        LABEL: 'context-menu-label'
    };

    constructor(options = {}) {
        // Initialize with a more intuitive options object
        this.options = {
            theme: options.theme || 'light',
            width: options.width || 200,
            animation: {
                enabled: options.animation?.enabled ?? true,
                duration: options.animation?.duration || 200,
                timing: options.animation?.timing || 'ease-out'
            },
            position: {
                xOffset: options.position?.xOffset || 0,
                yOffset: options.position?.yOffset || 0
            },
            icons: options.icons || {
                submenu: '❯',
                checkbox: {
                    checked: '✓',
                    unchecked: '□'
                },
                radio: {
                    selected: '●',
                    unselected: '○'
                }
            },
            isRoot: options.isRoot === undefined
        };

        this.items = [];
        this.id = this._generateId();
        this.installStyles();
    }

    // Simplified API for adding menu items
    addItem(type, config) {
        const item = {
            id: this._generateId(),
            type,
            position: this.items.length,
            ...config
        };

        // Validate based on type
        this._validateItem(item);
        this.items.push(item);
        return this;
    }

    // Fluent API methods for different item types
    button(text, action, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.BUTTON, {
            text,
            action,
            icon: config.icon,
            ficon: config.ficon,
            disabled: config.disabled,
            tooltip: config.tooltip
        });
    }

    input(label, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.INPUT, {
            label,
            placeholder: config.placeholder,
            value: config.value,
            onChange: config.onChange,
            inputType: config.inputType || 'text',
            validator: config.validator
        });
    }

    dropdown(label, options, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.DROPDOWN, {
            label,
            options,
            value: config.value,
            onChange: config.onChange,
            multiSelect: config.multiSelect
        });
    }

    checkbox(text, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.CHECKBOX, {
            text,
            checked: config.checked || false,
            onChange: config.onChange
        });
    }

    radioGroup(name, options, config = {}) {
        options.forEach(option => {
            this.addItem(ContextMenu.ITEM_TYPES.RADIO, {
                text: option.text,
                value: option.value,
                name,
                checked: option.checked,
                onChange: config.onChange
            });
        });
        return this;
    }

    separator() {
        return this.addItem(ContextMenu.ITEM_TYPES.SEPARATOR, {});
    }

    submenu(text, submenuBuilder, config = {}) {
        const options = {...this.options};
        options.isRoot = false;
        const submenu = new ContextMenu(options);
        submenuBuilder(submenu);

        const items = this.addItem(ContextMenu.ITEM_TYPES.SUBMENU, {
            text,
            submenu,
            icon: config.icon,
            ficon: config.ficon,
        }).items

        items[items.length - 1].id = submenu.id;
        return this;
    }

    // Show methods
    showAt(x, y) {
        const menu = this._render();
        document.body.appendChild(menu);
        this._setupEventHandlers(menu);
        this._positionMenu(menu, {x, y});
        this._animateIn(menu);
        return this;
    }

    destroy() {
        const menu = document.getElementById(this.id);
        if (menu) {
            menu.remove();
        }

        // Remove event listeners
        const {handleClick, handleContextMenu, handleMouseOver} = this._eventHandlers;
        document.removeEventListener('click', handleClick);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('mouseover', handleMouseOver);

        // Clean up references
        this.items = [];
        this._eventHandlers = {};

        return this;
    }

//    /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
//    |                                                  PRIVATE METHODS                                                  |
//    \___________________________________________________________________________________________________________________/

    // Private methods
    _setupEventHandlers(menu) {

        //event listeners
        const handleClick = (e) => {
            if (e.target.classList.contains(ContextMenu.CLASSNAMES.BUTTON)) {
                const button = this.items.find(item => item.id === e.target.id);
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

        // Handles hover for submenus
        const handleMouseOver = (e) => {
            if (e.target.classList.contains(ContextMenu.CLASSNAMES.SUBMENU)) {
                const submenu = this.items.find(item => item.id === e.target.id);

                if (submenu) {
                    // Hide other submenus at the same level
                    const parentMenu = e.target.closest('.' + ContextMenu.CLASSNAMES.MENU);
                    const siblingSubmenus = parentMenu.querySelectorAll('.' + ContextMenu.CLASSNAMES.MENU);
                    siblingSubmenus.forEach(menu => {
                        if (!menu.contains(e.target)) {
                            menu.remove();
                        }
                    });


                    const subMenu = submenu.submenu._render();
                    console.log(submenu, submenu.submenu, subMenu);
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
        };

        // Handles keyboard events
        const handleKeyPress = (e) => {
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
                if (focused.classList.contains(ContextMenu.CLASSNAMES.SUBMENU)
                    && focused.classList.contains(ContextMenu.CLASSNAMES.BUTTON)) {
                    this._eventHandlers.handleMouseOver({target: focused, troughTab: true});
                    e.preventDefault();
                    return;
                }
            }

            //or if the current focused element is the top-most child and shift-tab is pressed
            if (e.key === 'ArrowLeft') {
                if (document.activeElement.parentElement.id !== this.id) return;
                const id = document.activeElement.parentElement.id;
                const submenu = document.querySelector(`[data-submenu="${id}"]`);
                if (submenu) {
                    submenu.focus();
                }
            }

            //with arrow up and down, get the previous or next CLASSES.BUTTON element
            if (e.key === 'ArrowDown') {
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

            if (e.key === 'ArrowUp') {
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

        // Adds event listeners
        menu.addEventListener('click', handleClick);
        menu.addEventListener('mouseover', handleMouseOver);
        menu.addEventListener('keydown', handleKeyPress);
        menu.addEventListener('keyup', handleKeyPress);

        // Clean up references on destroy
        this._eventHandlers = {click: handleClick, handleMouseOver, handleKeyPress};
    }

    //sorry for the bad looking code :(
    _validateItem(item) {
        const validTypes = Object.values(ContextMenu.ITEM_TYPES);

        if (!item.type || !validTypes.includes(item.type))                      throw new Error(`Invalid item type: ${item.type}. Allowed types are: ${validTypes.join(', ')}`);

        switch (item.type) {
            case ContextMenu.ITEM_TYPES.BUTTON:
                if (!item.text || typeof item.text !== 'string')                throw new Error('Button item must have a "text" property of type string.');
                if (item.action && typeof item.action !== 'function')           throw new Error('Button item action must be a function.');
                break;
            case ContextMenu.ITEM_TYPES.SEPARATOR:
                break;
            case ContextMenu.ITEM_TYPES.SUBMENU:
                if (!item.submenu || !(item.submenu instanceof ContextMenu))    throw new Error('Submenu item must have a "submenu" property that is an instance of ContextMenu.');
                break;
            case ContextMenu.ITEM_TYPES.INPUT:
                if (!item.label || typeof item.label !== 'string')              throw new Error('Input item must have a "label" property of type string.');
                if (item.validator && typeof item.validator !== 'function')     throw new Error('Input item validator must be a function.');
                break;
            case ContextMenu.ITEM_TYPES.DROPDOWN:
                if (!item.label || typeof item.label !== 'string')              throw new Error('Dropdown item must have a "label" property of type string.');
                if (!Array.isArray(item.options) || item.options.length === 0)  throw new Error('Dropdown item must have a non-empty "options" array.');
                break;
            case ContextMenu.ITEM_TYPES.CHECKBOX:
                if (!item.text || typeof item.text !== 'string')                throw new Error('Checkbox item must have a "text" property of type string.');
                if (typeof item.checked !== 'boolean')                          throw new Error('Checkbox item must have a "checked" property of type boolean.');
                break;
            case ContextMenu.ITEM_TYPES.RADIO:
                if (!item.text || typeof item.text !== 'string')                throw new Error('Radio item must have a "text" property of type string.');
                if (!item.name || typeof item.name !== 'string')                throw new Error('Radio item must have a "name" property of type string.');
                break;
            default:
                                                                                throw new Error(`Unhandled item type: ${item.type}`);
        }
    }

    _generateId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    _render() {
        //if (document.getElementById(this.id)) return null;

        const menuContainer = document.createElement('div');
        menuContainer.classList.add(ContextMenu.CLASSNAMES.MENU);
        menuContainer.id = this.id;
        menuContainer.setAttribute('role', 'menu');
        menuContainer.setAttribute('aria-orientation', 'vertical');
        menuContainer.style.width = `${this.options.width}px`;

        this.items.forEach(item => {
            let element;

            switch (item.type) {
                case ContextMenu.ITEM_TYPES.BUTTON:
                    element = this._createButton(item);
                    break;
                case ContextMenu.ITEM_TYPES.SEPARATOR:
                    element = this._createSeparator();
                    break;
                case ContextMenu.ITEM_TYPES.SUBMENU:
                    element = this._createSubmenu(item);
                    break;
                case ContextMenu.ITEM_TYPES.INPUT:
                    element = this._createInput(item);
                    break;
                case ContextMenu.ITEM_TYPES.DROPDOWN:
                    element = this._createDropdown(item);
                    break;
                case ContextMenu.ITEM_TYPES.CHECKBOX:
                    element = this._createCheckbox(item);
                    break;
                case ContextMenu.ITEM_TYPES.RADIO:
                    element = this._createRadio(item);
                    break;
                default:
                    console.warn(`Unknown item type: ${item.type}`);
            }

            if (element) {
                menuContainer.appendChild(element);
            }
        });

        return menuContainer;
    }

    _createButton(item) {
        const button = document.createElement('button');
        button.classList.add(ContextMenu.CLASSNAMES.BUTTON);
        button.id = item.id;
        button.innerText = item.text;
        button.disabled = item.disabled || false;
        //button.onclick = item.action;

        if (item.icon) {
            const icon = document.createElement('span');
            icon.innerText = item.icon;
            button.prepend(icon);
        }

        if (item.ficon) {
            const ficon = document.createElement('i');
            ficon.className = item.ficon;
            button.append(ficon);
        }

        return button;
    }

    _createSeparator() {
        const separator = document.createElement('div');
        separator.classList.add(ContextMenu.CLASSNAMES.SEPARATOR);
        return separator;
    }

    _createSubmenu(item) {
        const submenuButton = document.createElement('button');
        submenuButton.classList.add(ContextMenu.CLASSNAMES.SUBMENU);
        submenuButton.innerText = item.text;
        submenuButton.setAttribute('aria-haspopup', 'true');
        submenuButton.onclick = () => item.submenu.showAt(submenuButton.getBoundingClientRect().right, submenuButton.getBoundingClientRect().top);
        submenuButton.id = item.id;

        if (item.icon) {
            const icon = document.createElement('span');
            icon.innerText = item.icon;
            submenuButton.prepend(icon);
        }

        const moreIcon = document.createElement('span');
        moreIcon.innerText = this.options.icons.submenu;
        moreIcon.style.marginLeft = 'auto';
        submenuButton.append(moreIcon);

        if (item.ficon) {
            const ficon = document.createElement('i');
            ficon.className = item.ficon;
            submenuButton.append(ficon);
        }

        return submenuButton;
    }

    _createInput(item) {
        const inputContainer = document.createElement('div');
        inputContainer.classList.add(ContextMenu.CLASSNAMES.INPUT);

        const input = document.createElement('input');
        input.type = item.type || 'text';
        input.placeholder = item.placeholder || '';
        input.value = item.value || '';
        input.oninput = (e) => item.onChange?.(e.target.value);

        inputContainer.appendChild(input);
        return inputContainer;
    }

    _createDropdown(item) {
        const select = document.createElement('select');
        select.classList.add(ContextMenu.CLASSNAMES.DROPDOWN);

        item.options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            if (option.value === item.value) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });

        select.onchange = (e) => item.onChange?.(e.target.value);
        return select;
    }

    _createCheckbox(item) {
        const label = document.createElement('label');
        label.classList.add(ContextMenu.CLASSNAMES.CHECKBOX);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.checked || false;
        checkbox.onchange = (e) => item.onChange?.(e.target.checked);

        const span = document.createElement('span');
        span.textContent = item.text;

        label.appendChild(checkbox);
        label.appendChild(span);
        return label;
    }

    _createRadio(item) {
        const label = document.createElement('label');
        label.classList.add(ContextMenu.CLASSNAMES.RADIO);

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = item.name;
        radio.value = item.value;
        radio.checked = item.checked || false;
        radio.onchange = (e) => item.onChange?.(e.target.value);

        const span = document.createElement('span');
        span.textContent = item.text;

        label.appendChild(radio);
        label.appendChild(span);
        return label;
    }

    _positionMenu(menu, position) {
        const {x, y} = position;
        const {xOffset, yOffset} = this.options.position;
        const {menuWidth} = this.options;

        // Calculate the menu position with offsets
        let calculatedX = x + xOffset;
        let calculatedY = y + yOffset;

        // Adjust if the menu goes out of bounds
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (calculatedX + menuWidth > viewportWidth) {
            calculatedX = Math.max(0, viewportWidth - menuWidth);
        }

        const menuHeight = menu.offsetHeight;
        if (calculatedY + menuHeight > viewportHeight) {
            calculatedY = Math.max(0, viewportHeight - menuHeight);
        }

        // Apply styles to position the menu
        menu.style.left = `${calculatedX}px`;
        menu.style.top = `${calculatedY}px`;
        menu.style.position = 'fixed';
    }


    _animateIn(menu) {
        if (!this.options.animation.enabled) return;

        // Apply initial styles for animation
        menu.style.opacity = 0;
        menu.style.transform = 'scale(0.9)';
        menu.style.transition = `opacity ${this.options.animation.duration}ms ${this.options.animation.timing}, 
                             transform ${this.options.animation.duration}ms ${this.options.animation.timing}`;

        // Trigger the animation
        requestAnimationFrame(() => {
            menu.style.opacity = 1;
            menu.style.transform = 'scale(1)';
        });
    }

    installStyles()
    {
        if (document.getElementById('context-menu-styles')) return;

        const styles = `
.context-menu {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 6px 0;
  min-width: 200px;
  z-index: 1000;
}

.context-menu-button,
.context-menu-submenu {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  color: #333;
}

.context-menu-button span,
.context-menu-submenu span {
  margin-right: 8px;
  pointer-events: none;
}

.context-menu-button:hover,
.context-menu-submenu:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.context-menu-separator {
  height: 1px;
  background-color: rgba(0, 0, 0, 0.1);
  margin: 6px 0;
}

.context-menu-input {
  padding: 6px 12px;
}

.context-menu-input input {
  width: calc(100% - 18px);
  padding: 6px 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  font-size: 13px;
}

.context-menu-input input:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
}

.context-menu-dropdown {
  width: calc(100% - 24px);
  margin: 6px 12px;
  padding: 6px 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  font-size: 13px;
  background-color: white;
}

.context-menu-checkbox,
.context-menu-radio {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
}

.context-menu-checkbox:hover,
.context-menu-radio:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.context-menu-checkbox input,
.context-menu-radio input {
  margin-right: 8px;
}

/* Focus styles for accessibility */
.context-menu:focus {
  outline: none;
  box-shadow: 0 0 0 2px #0066cc;
}

.context-menu-button:focus,
.context-menu-submenu:focus {
  outline: none;
  background-color: rgba(0, 0, 0, 0.05);
}

/* Animation classes */
.context-menu[data-show="true"] {
  animation: scaleIn 0.15s ease-out;
}

.context-menu[data-show="false"] {
  animation: scaleOut 0.15s ease-out;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes scaleOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}
    `;

        const styleElement = document.createElement('style');
        styleElement.textContent = styles;
        styleElement.id = 'context-menu-styles';
        document.head.appendChild(styleElement);
    }
}