/**
 * A modern, flexible context menu library for web applications.
 * Provides a fluent API for creating context menus with various item types.
 * Supports animations, custom styles, and nested submenus.
 * @author Matt ter Steege (Kronk)
*/
class ContextMenu {
    static ITEM_TYPES = {
        BUTTON: 'button',
        SEPARATOR: 'separator',
        SUBMENU: 'submenu',
        INPUT: 'input',
        DOUBLE_INPUT: 'double-input',
        DROPDOWN: 'dropdown',
        CHECKBOX: 'checkbox',
        RADIO: 'radio',
        SEARCH_SELECT: 'search-select',
    };

    static CLASSNAMES = {
        BUTTON: 'context-menu-button',
        SUBMENU: 'context-menu-submenu',
        SEPARATOR: 'context-menu-separator',
        MENU: 'context-menu',
        INPUT: 'context-menu-input',
        DOUBLE_INPUT: 'context-menu-double-input',
        DROPDOWN: 'context-menu-dropdown',
        CHECKBOX: 'context-menu-checkbox',
        RADIO: 'context-menu-radio',
        CONTAINER: 'context-menu-container',
        SEARCH_SELECT: 'context-menu-search-select',
        ICON: 'context-menu-icon',
        LABEL: 'context-menu-label'
    };

    constructor(options = {}) {
        // Initialize with a more intuitive options object
        this.options = {
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
                submenu: '❯'
            },
            style: {
                backgroundColor: options.style?.backgroundColor || '#ffffff',
                textColor: options.style?.textColor || '#333333',
                backgroundHoverColor: options.style?.backgroundHoverColor || '#f0f0f0',
                border: options.style?.border || 'rgba(0, 0, 0, 0.08)',
                shadow: options.style?.shadow || '0 10px 25px rgba(0, 0, 0, 0.1)',
                accent: options.style?.accent || '#3b82f6',
                separator: options.style?.separator || 'rgba(0, 0, 0, 0.08)',

                padding: options.style?.padding || '10px',
                paddingHorizontal: options.style?.paddingHorizontal || '15px',
                gap: options.style?.gap || '10px',
                borderRadius: options.style?.borderRadius || '8px',
                borderRadiusInput: options.style?.borderRadiusInput || '4px',
                fontSize: options.style?.fontSize || '14px',
                transition: options.style?.transition || '0.2s',
                transitionFast: options.style?.transitionFast || '0.1s',
                transitionInput: options.style?.transitionInput || '0.2s',
            },
            indentLevel: options.indentLevel || 0,
            isRoot: options.isRoot === undefined,
            closeOnClick: options.closeOnClick,
            closeOnOutsideClick: options.closeOnOutsideClick,
        };
        this.items = [];
        this.id = this.#_generateId();
        this.installStyles();
    }

    // Simplified API for adding menu items
    addItem(type, config) {
        const item = {
            id: (config?.id ?? this.#_generateId()) + '',
            type,
            position: this.items.length,
            ...config
        };

        if (item.id === undefined) {
            item.id = this.#_generateId();
        }

        if (item.type === ContextMenu.ITEM_TYPES.SUBMENU) {
            item.submenu.options.indentLevel = (this.options.indentLevel || 0) + 1;
        }

        // Validate based on type
        this.#_validateItem(item);
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
            marked: config.marked,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    input(label, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.INPUT, {
            label,
            placeholder: config.placeholder,
            value: config.value,
            onChange: config.onChange,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    doubleInput(label, label_2, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.DOUBLE_INPUT, {
            label,
            label_2: label_2,
            placeholder: config.placeholder,
            placeholder_2: config.placeholder_2,
            value: config.value,
            value_2: config.value_2,
            onChange: config.onChange,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    dropdown(label, options, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.DROPDOWN, {
            label,
            options,
            value: config.value,
            onChange: config.onChange,
            multiSelect: config.multiSelect,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    checkbox(text, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.CHECKBOX, {
            text,
            checked: config.checked || false,
            onChange: config.onChange,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    radioGroup(name, options, config = {}) {
        options.forEach(option => {
            this.addItem(ContextMenu.ITEM_TYPES.RADIO, {
                label: option.label,
                value: option.value,
                name,
                checked: option.checked,
                onChange: config.onChange,
                showWhen: config.showWhen,
                id: config.id,
            });
        });
        return this;
    }

    separator() {
        return this.addItem(ContextMenu.ITEM_TYPES.SEPARATOR, {});
    }

    submenu(text, submenuBuilder, config = {}) {
        const options = {
            ...this.options, // Inherit options from parent
            isRoot: false,
            indentLevel: (this.options.indentLevel || 0) + 1, // Increment indent level
            showWhen: config.showWhen,
            id: config.id,
        };

        const submenu = new ContextMenu(options); // Create submenu with updated options
        submenuBuilder(submenu);

        const items = this.addItem(ContextMenu.ITEM_TYPES.SUBMENU, {
            text,
            submenu,
            icon: config.icon,
            ficon: config.ficon,
            showWhen: config.showWhen,
            id: config.id,
        }).items;

        items[items.length - 1].id = submenu.id;
        return this;
    }

    searchSelect(label, options, config = {}) {
        return this.addItem(ContextMenu.ITEM_TYPES.SEARCH_SELECT, {
            label,
            options,
            value: config.value,
            onChange: config.onChange,
            showWhen: config.showWhen,
            id: config.id,
        });
    }

    // Show methods
    showAt(x, y, autoAdd = true) {
        const menu = this.#_render();

        if (document.getElementById(this.id)) {
            document.getElementById(this.id).remove();
        }

        autoAdd ? document.body.appendChild(menu) : null;
        this.#_setupEventHandlers(menu);
        this.#_positionMenu(menu, {x, y, position: 'fixed'});
        this.#_animateIn(menu);

        return menu;
    }

    destroy() {
        // Existing cleanup
        const menu = document.querySelector('body > .' + ContextMenu.CLASSNAMES.MENU);
        menu && menu.remove();

        // Remove event listeners
        const {handleClick, handleContextMenu, handleMouseOver} = this._eventHandlers || {};
        handleClick ? document.removeEventListener("click", handleClick) : null;
        handleContextMenu ? document.removeEventListener("contextmenu", handleContextMenu) : null;
        handleMouseOver ? document.removeEventListener("mouseover", handleMouseOver) : null;

        this?.clear();
    }

    clear() {
        // Clear all items
        this.items = [];
        const menu = document.getElementById(this.id);
        if (menu) {
            menu.innerHTML = '';
        }
    }

//    /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
//    |                                                  PRIVATE METHODS                                                  |
//    \___________________________________________________________________________________________________________________/

    #_setupEventHandlers(menu) {
        const handleClick = (e) => {
            if (e.target.classList.contains(ContextMenu.CLASSNAMES.DROPDOWN) ||
                e.target.classList.contains(ContextMenu.CLASSNAMES.INPUT) ||
                e.target.classList.contains(ContextMenu.CLASSNAMES.CHECKBOX) ||
                e.target.classList.contains(ContextMenu.CLASSNAMES.RADIO) ||
                e.target.classList.contains(ContextMenu.CLASSNAMES.SEARCH_SELECT)) {
                return;
            }

            if (e.target.classList.contains(ContextMenu.CLASSNAMES.BUTTON)) {
                const button = this.items.find(item => item.id === e.target.id);
                if (button) {
                    button.action();
                    this.destroy();
                }
            }

            if (!e.target.closest('.' + ContextMenu.CLASSNAMES.MENU)) {
                if (!this.options.closeOnOutsideClick) return;
                this.destroy();
            }
        };

        const handleMouseOver = (e) => {
            if (e.target.classList.contains(ContextMenu.CLASSNAMES.SUBMENU)) {
                const submenu = this.items.find(item => item.id === e.target.dataset.submenuId);

                if (submenu) {
                    const existingSubmenu = e.target.parentElement.querySelector('#' + submenu.submenu.id);
                    if (existingSubmenu) return;

                    const htmlElement = submenu.submenu.#_render();
                    submenu.submenu.#_setupEventHandlers(htmlElement);
                    submenu.submenu.#_positionMenu(htmlElement, {
                        x: e.target.getBoundingClientRect().right,
                        y: e.target.getBoundingClientRect().top
                    });

                    htmlElement.style.position = 'absolute';
                    htmlElement.style.left = this.options.width + 'px';
                    htmlElement.style.top = e.target.getBoundingClientRect().top - e.target.parentElement.getBoundingClientRect().top + 'px';

                    e.target.parentElement.appendChild(htmlElement);

                    htmlElement.addEventListener('mouseleave', handleMouseLeave);
                    e.target.addEventListener('mouseleave', handleMouseLeave);
                }
            }
        };

        const handleMouseLeave = (event) => {
            const target = event.target;

            if (target.className === ContextMenu.CLASSNAMES.MENU) {
                target.remove();
                return;
            }

            const submenu = document.getElementById(target.dataset?.submenuId);
            const isMouseOverButton = target.matches(':hover');
            const isMouseOverSubmenu = submenu?.matches(':hover');

            if (!isMouseOverButton && !isMouseOverSubmenu) {
                submenu?.remove();
            }
        };


        menu.addEventListener('click', handleClick);
        menu.addEventListener('mouseover', handleMouseOver);
        addEventListener('click', (e) => {
            //if the element is not inside the menu, then destroy the menu
            if (e.target.closest('.' + ContextMenu.CLASSNAMES.MENU)) return;

            if (this.options.closeOnOutsideClick) {
                this.destroy();
            }
        })
    }

    //sorry for the bad looking code :(
    #_validateItem(item) {
        const validTypes = Object.values(ContextMenu.ITEM_TYPES);

        if (!item.type || !validTypes.includes(item.type)) throw new Error(`Invalid item type: ${item.type}. Allowed types are: ${validTypes.join(', ')}`);

        switch (item.type) {
            case ContextMenu.ITEM_TYPES.BUTTON:
                if (!item.text || typeof item.text !== 'string') throw new Error('Button item must have a "text" property of type string.');
                if (item.action && typeof item.action !== 'function') throw new Error('Button item action must be a function.');
                break;
            case ContextMenu.ITEM_TYPES.SEPARATOR:
                break;
            case ContextMenu.ITEM_TYPES.SUBMENU:
                if (!item.submenu || !(item.submenu instanceof ContextMenu)) throw new Error('Submenu item must have a "submenu" property that is an instance of ContextMenu.');
                break;
            case ContextMenu.ITEM_TYPES.INPUT:
                if (!item.label || typeof item.label !== 'string') throw new Error('Input item must have a "label" property of type string.');
                break;
            case ContextMenu.ITEM_TYPES.DOUBLE_INPUT:
                if (!item.label || typeof item.label !== 'string') throw new Error('DoubleInput item must have a "label" property of type string.');
                if (!item.label_2 || typeof item.label_2 !== 'string') throw new Error('DoubleInput item must have a "label_2" property of type string.');
                break;
            case ContextMenu.ITEM_TYPES.DROPDOWN:
                if (!item.label || typeof item.label !== 'string') throw new Error('Dropdown item must have a "label" property of type string.');
                if (!Array.isArray(item.options) || item.options.length === 0) throw new Error('Dropdown item must have a non-empty "options" array.');
                break;
            case ContextMenu.ITEM_TYPES.CHECKBOX:
                if (!item.text || typeof item.text !== 'string') throw new Error('Checkbox item must have a "text" property of type string.');
                if (typeof item.checked !== 'boolean') throw new Error('Checkbox item must have a "checked" property of type boolean.');
                break;
            case ContextMenu.ITEM_TYPES.RADIO:
                if (!item.label || typeof item.label !== 'string') throw new Error('Radio item must have a "label" property of type string.');
                if (!item.name || typeof item.name !== 'string') throw new Error('Radio item must have a "name" property of type string.');
                break;
            case ContextMenu.ITEM_TYPES.SEARCH_SELECT:
                if (!item.label || typeof item.label !== 'string') throw new Error('SearchSelect item must have a "label" property of type string.');
                if (!Array.isArray(item.options) || item.options.length === 0) throw new Error('SearchSelect item must have a non-empty "options" array.');
                break;
            default:
                throw new Error(`Unhandled item type: ${item.type}`);
        }
    }

    #_generateId() {
        return '_' + Math.random().toString(36).substring(2, 9);
    }

    #_render() {
        const menuContainer = document.createElement('div');
        menuContainer.classList.add(ContextMenu.CLASSNAMES.MENU);
        menuContainer.id = this.id;
        menuContainer.setAttribute('role', 'menu');
        menuContainer.setAttribute('aria-orientation', 'vertical');
        menuContainer.style.width = `${this.options.width}px`;

        // Set the indentation level as a data attribute
        menuContainer.dataset.indent = this.options.indentLevel;

        this.items.forEach((item, index) => {
            let element;

            switch (item.type) {
                case ContextMenu.ITEM_TYPES.BUTTON:
                    element = this.#_createButton(item);
                    break;
                case ContextMenu.ITEM_TYPES.SEPARATOR:
                    index < this.items.length - 1 ?         // Only create a separator if it's not the last item
                        element = this.#_createSeparator()
                        : null;
                    break;
                case ContextMenu.ITEM_TYPES.SUBMENU:
                    element = this.#_createSubmenu(item);
                    break;
                case ContextMenu.ITEM_TYPES.INPUT:
                    element = this.#_createInput(item);
                    break;
                case ContextMenu.ITEM_TYPES.DOUBLE_INPUT:
                    element = this.#_createDoubleInput(item);
                    break;
                case ContextMenu.ITEM_TYPES.DROPDOWN:
                    element = this.#_createDropdown(item);
                    break;
                case ContextMenu.ITEM_TYPES.CHECKBOX:
                    element = this.#_createCheckbox(item);
                    break;
                case ContextMenu.ITEM_TYPES.RADIO:
                    element = this.#_createRadio(item);
                    break;
                case ContextMenu.ITEM_TYPES.SEARCH_SELECT:
                    element = this.#_createSearchSelect(item);
                    break;
                default:
                    console.warn(`Unknown item type: ${item.type}`);
            }

            if (element) {
                menuContainer.appendChild(element);
            }

            setTimeout(() => {
                // Check if the item has a `showWhen` condition
                if (item.showWhen) {
                    const {elementId, value} = item.showWhen;
                    const controllingElement = document.querySelector('#' + elementId);

                    if (controllingElement) {
                        const toggleVisibility = () => {
                            const shouldShow = value.includes(controllingElement.value);
                            element.style.display = shouldShow ? '' : 'none';
                        };

                        // Add event listener to monitor changes
                        controllingElement.addEventListener('input', toggleVisibility);
                        controllingElement.addEventListener('change', toggleVisibility);

                        // Initial check
                        toggleVisibility();
                    }
                }
            }, 0);
        });


        return menuContainer;
    }

    #_createButton(item) {
        const button = document.createElement('button');
        button.classList.add(ContextMenu.CLASSNAMES.BUTTON);
        button.id = item.id;
        button.innerText = item.text;
        button.disabled = item.disabled || false;
        button.dataset.marked = item.marked || false;
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

    #_createSeparator() {
        const separator = document.createElement('div');
        separator.classList.add(ContextMenu.CLASSNAMES.SEPARATOR);
        return separator;
    }

    #_createSubmenu(item) {
        const submenuButton = document.createElement('button');
        submenuButton.classList.add(ContextMenu.CLASSNAMES.SUBMENU);
        submenuButton.innerText = item.text;
        submenuButton.setAttribute('aria-haspopup', 'true');
        submenuButton.dataset.submenuId = item.id;

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

    #_createInput(item) {
        const inputContainer = document.createElement('div');
        inputContainer.classList.add(ContextMenu.CLASSNAMES.INPUT);

        const input = document.createElement('input');
        input.type = item.type || 'text';
        input.placeholder = item.placeholder || '';
        input.value = item.value || '';
        input.oninput = (e) => item.onChange?.(e.target.value);
        input.id = item.id;

        inputContainer.appendChild(input);
        return inputContainer;
    }

    #_createDoubleInput(item) {
        //do a div and add 2 inputs to it
        const inputContainer = document.createElement('div');
        inputContainer.classList.add(ContextMenu.CLASSNAMES.DOUBLE_INPUT);
        inputContainer.id = item.id;

        var values = {left: item.value || '', right: item.value_2 || ''};

        const generalChangeHandler = () => {
            if ((values.left === '' && values.left === null || values.left === undefined) && (values.right === '' && values.right === null || values.right === undefined)) {
                item.onChange?.({left: undefined, right: undefined});
            } else {
                item.onChange?.(values);
            }
        }

        const input1 = this.#_createInput({
            type: 'text',
            placeholder: item.placeholder || '',
            value: item.value || '',

            onChange: (value) => {
                values.left = value;
                generalChangeHandler();
            }, id: item.id + '-1'
        });

        const input2 = this.#_createInput({
            type: 'text', placeholder: item.placeholder_2 || '', value: item.value_2 || '',

            onChange: (value) => {
                values.right = value;
                generalChangeHandler();
            }, id: item.id + '-2'
        });

        inputContainer.appendChild(input1);
        inputContainer.appendChild(input2);
        return inputContainer;
    }

    #_createDropdown(item) {
        const select = document.createElement('select');
        select.classList.add(ContextMenu.CLASSNAMES.DROPDOWN);
        select.id = item.id;

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

    #_createCheckbox(item) {
        const label = document.createElement('label');
        label.classList.add(ContextMenu.CLASSNAMES.CHECKBOX);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.checked || false;
        checkbox.onchange = (e) => item.onChange?.(e.target.checked);
        checkbox.id = item.id;

        const span = document.createElement('span');
        span.textContent = item.text;

        label.appendChild(checkbox);
        label.appendChild(span);
        return label;
    }

    #_createRadio(item) {
        const label = document.createElement('label');
        label.classList.add(ContextMenu.CLASSNAMES.RADIO);

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = item.name;
        radio.value = item.value;
        radio.checked = item.checked || false;
        radio.onchange = (e) => item.onChange?.(e.target.value);
        radio.id = item.id;

        const span = document.createElement('span');
        span.textContent = item.label;

        label.appendChild(radio);
        label.appendChild(span);
        return label;
    }

    #_createSearchSelect(item) {
        //this is a scrollable list with selectable items (checkboxes)
        //at the top there is a search input that filters the items (if the search input is not empty, then show everything)
        const container = document.createElement('div');
        container.classList.add(ContextMenu.CLASSNAMES.SEARCH_SELECT);
        container.id = item.id;

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = item.label || '';

        const list = document.createElement('div');
        list.classList.add(ContextMenu.CLASSNAMES.SEARCH_SELECT + '-list');

        //add select all option
        // const selectAll = document.createElement('label');
        // selectAll.classList.add(ContextMenu.CLASSNAMES.SEARCH_SELECT + '-select-all');
        // const selectAllCheckbox = document.createElement('input');
        // selectAllCheckbox.type = 'checkbox';
        // selectAllCheckbox.onchange = (e) => {
        //     const checkboxes = list.querySelectorAll('input[type="checkbox"]');
        //     checkboxes.forEach(checkbox => {
        //         checkbox.checked = e.target.checked;
        //     });
        //
        //     //return an array of selected values
        //     const selectedValues = Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value).slice(1);
        //
        //     item.onChange?.(selectedValues);
        //     container.value = selectedValues;
        // }
        // const selectAllLabel = document.createElement('span');
        // selectAllLabel.textContent = 'Select All';
        // selectAll.appendChild(selectAllCheckbox);
        // selectAll.appendChild(selectAllLabel);
        // list.appendChild(selectAll);

        const toggleAll = document.createElement('button');
        toggleAll.textContent = 'Toggle All';
        toggleAll.onclick = (e) => {
            const checkboxes = list.querySelectorAll('input[type="checkbox"]');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(checkbox => {
                checkbox.checked = !allChecked;
            });

            //return an array of selected values
            const selectedValues = Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

            item.onChange?.(selectedValues);
            container.value = selectedValues;
        }
        list.appendChild(toggleAll);

        item.options.forEach(option => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = option.value;
            checkbox.checked = option.checked || false;
            checkbox.onchange = (e) => {
                //return an array of selected values
                const selectedValues = Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
                item.onChange?.(selectedValues);
                container.value = selectedValues;
            }

            const label = document.createElement('label');
            label.textContent = option.label;
            label.appendChild(checkbox);
            list.appendChild(label);
        });
        container.appendChild(input);
        container.appendChild(list);

        input.oninput = (e) => {
            const searchValue = e.target.value.toLowerCase();
            const items = list.querySelectorAll('label');
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(searchValue) ? 'block' : 'none';
            });
        };
        return container;
    }

    #_positionMenu(menu, position) {
        const {x, y} = position;
        const {xOffset, yOffset} = this.options.position;

        // Apply styles to position the menu
        menu.style.left = `${x + xOffset || this.options.width}px`;
        menu.style.top = `${y + yOffset}px`;
        menu.style.position = 'fixed';
    }


    #_animateIn(menu) {
        if (!this.options.animation.enabled) return;

        // Apply initial styles for animation
        menu.style.opacity = 0;
        menu.style.transform = 'scale(0.9)';
        menu.style.transition = `opacity ${this.options.animation.duration}ms ${this.options.animation.timing},transform ${this.options.animation.duration}ms ${this.options.animation.timing}`;

        // Trigger the animation
        requestAnimationFrame(() => {
            menu.style.opacity = 1;
            menu.style.transform = 'scale(1)';
        });
    }

    installStyles() {
        if (document.getElementById('context-menu-styles')) return;

        const styleElement = document.createElement('style');
        styleElement.id = 'context-menu-styles';
        styleElement.textContent = `:root {--context-menu-bg:` + (this.options.style.backgroundColor || '#ffffff') + `;--context-menu-text:` + (this.options.style.textColor || '#333333') + `;--context-menu-hover-bg:` + (this.options.style.backgroundHoverColor || '#f0f0f0') + `;--context-menu-border:` + (this.options.style.border || 'rgba(0, 0, 0, 0.08)') + `;--context-menu-shadow:` + (this.options.style.shadow || '0 10px 25px rgba(0, 0, 0, 0.1)') + `;--context-menu-accent:` + (this.options.style.accent || '#3b82f6') + `;--context-menu-separator:` + (this.options.style.separator || 'rgba(0, 0, 0, 0.08)') + `;--padding:` + (this.options.style.padding || '10px') + `;--padding-horizontal:` + (this.options.style.paddingHorizontal || '15px') + `;--gap:` + (this.options.style.gap || '10px') + `;--border-radius:` + (this.options.style.borderRadius || '8px') + `;--border-radius-input:` + (this.options.style.borderRadiusInput || '4px') + `;--font-size:` + (this.options.style.fontSize || '14px') + `;--transition:` + (this.options.style.transition || '0.2s') + ` ease;--transition-fast:` + (this.options.style.transitionFast || '0.1s') + ` ease;--transition-input:` + (this.options.style.transitionInput || '0.2s') + ` ease;}`;
        styleElement.textContent += ".context-menu{background:var(--context-menu-bg);border:1px solid var(--context-menu-border);border-radius:var(--border-radius);box-shadow:var(--context-menu-shadow);padding:var(--padding) 0;min-width:220px;z-index:1000;font-family:Arial,sans-serif;color:var(--context-menu-text);animation:contextMenuSlideIn var(--transition-fast) forwards;transform-origin:top center}.context-menu .context-menu{position:relative;left:-5px}.context-menu:has(> .context-menu-dropdown)::after{content:'';position:absolute;inset:0 0 -400% 0;z-index:-1}.context-menu-button,.context-menu-checkbox,.context-menu-radio,.context-menu-submenu{display:flex;align-items:center;width:100%;padding:calc(var(--padding) + 2px) var(--padding-horizontal);border:none;background:0 0;font-size:var(--font-size);text-align:left;cursor:pointer;color:var(--context-menu-text);transition:background-color var(--transition-fast),color var(--transition-fast);position:relative;gap:var(--gap)}.context-menu-button:hover,.context-menu-checkbox:hover,.context-menu-radio:hover,.context-menu-search-select-list label:hover,.context-menu-submenu:hover{background-color:var(--context-menu-hover-bg)}.context-menu-button:focus,.context-menu-submenu:focus{outline:0;background-color:var(--context-menu-hover-bg)}.context-menu-button[data-marked=true],.context-menu-checkbox input:checked,.context-menu-radio input:checked{background-color:var(--context-menu-accent)}.context-menu-button:focus-visible,.context-menu-submenu:focus-visible{outline:2px solid var(--context-menu-accent);outline-offset:-2px}.context-menu-button:disabled{color:rgba(26,26,26,.4);cursor:not-allowed}.context-menu-button[data-marked=true]{font-weight:700;color:#fff;border-radius:calc(var(--border-radius)/ 2);border:1px solid var(--context-menu-accent)}.context-menu-button[data-marked=true]:hover{background-color:var(--context-menu-accent);color:#fff}.context-menu-button span,.context-menu-submenu span{display:flex;align-items:center;pointer-events:none}.context-menu-separator{height:1px;background-color:var(--context-menu-separator);margin:var(--padding) 0}.context-menu-dropdown,.context-menu-input input,.context-menu-search-select input{padding:var(--padding);border:1px solid var(--context-menu-border);border-radius:var(--border-radius-input);font-size:var(--font-size);background-color:#f9fafb;transition:border-color var(--transition-input),box-shadow var(--transition-input)}.context-menu-double-input,.context-menu-input{padding:var(--padding) var(--padding-horizontal)}.context-menu-dropdown:focus,.context-menu-input input:focus,.context-menu-search-select input:focus{outline:0;border-color:var(--context-menu-accent);box-shadow:0 0 0 2px rgba(59,130,246,.2)}.context-menu-input input{width:calc(100% - var(--padding-horizontal))}.context-menu-double-input{display:flex;gap:10px;align-items:center}.context-menu-double-input>.context-menu-input{padding:unset!important}.context-menu-dropdown{width:calc(100% - calc(var(--padding-horizontal) * 2));margin:var(--padding) var(--padding-horizontal)}.context-menu-checkbox input,.context-menu-radio input,.context-menu-search-select-list input{margin-right:var(--gap);accent-color:var(--context-menu-accent)}.context-menu-checkbox input:focus,.context-menu-radio input:focus,.context-menu-search-select-list input:focus{outline:0;box-shadow:0 0 0 2px rgba(59,130,246,.2)}.context-menu-search-select{display:flex;flex-direction:column;padding:calc(var(--padding) + 2px) var(--padding-horizontal)}.context-menu-search-select-list{max-height:200px;overflow-y:auto;margin-top:var(--padding)}.context-menu-search-select-list button{width:100%;padding:var(--padding);background:#007bff;font-size:var(--font-size);text-align:left;cursor:pointer;color:#fff;transition:background-color var(--transition-fast),color var(--transition-fast)}.context-menu-search-select-list label{display:flex;flex-direction:row-reverse;gap:var(--gap);align-items:center;padding:var(--padding) 0;justify-content:flex-end}@keyframes contextMenuSlideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(calc(-1 * var(--padding)))}}.context-menu:focus{outline:0}";
        document.head.appendChild(styleElement);
    }
}