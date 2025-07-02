class EmailTypePlugin extends stringTypePlugin {
    constructor() {
        super();
    }

    validate(value) {
        if (!super.validate(value)) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) || value === '' || value === null;
    }

    parseValue(value) {
        if (value === null || value === undefined) return null;
        return String(value).toLowerCase().trim();
    }

    renderCell(value, onEdit, columnConfig = {}) {
        const cell = document.createElement('div');
        columnConfig.cellClass = columnConfig.cellClass + ' email-cell';

        if (columnConfig.isEditable) {
            cell.append(super.createEditableCell(value, onEdit, columnConfig));
        }

        const link = document.createElement('a');
        link.href = `mailto:${value}`;
        link.textContent = value || '';
        link.style.color = '#0066cc';
        link.style.textDecoration = 'underline';

        cell.appendChild(link);

        return cell;
    }

    showMore(key, element, engine, UI, columnConfig = {}) {
        const {x, y, width, height} = element.getBoundingClientRect();
        UI.contextMenu.clear();

        let operator = '==';
        UI.contextMenu
            .dropdown('Filter ' + key, [
                { label: 'Gelijk aan', value: '==' },
                { label: 'Niet gelijk aan', value: '!=' },
                { label: 'Begint met', value: '%=' },
                { label: 'Eindigt met', value: '=%' },
                { label: 'Bevat', value: '*=' },
                { label: 'Bevat niet', value: '!*=' },
                { label: 'Is leeg', value: '??' },
                { label: 'Is niet leeg', value: '!!' },
            ], {
                value: '==',
                onChange: (value) => {
                    operator = value;

                    if (value === '??' || value === '!!') {
                        engine.setSelect(key, operator, 'empty');
                        UI.render(engine.runCurrentQuery());
                    }
                },
                id: 'dropdown-id'
            })
            .input('Email', {
                placeholder: 'email@example.com',
                onChange: (value) => {
                    engine.setSelect(key, operator, value);
                    UI.render(engine.runCurrentQuery());
                },
                showWhen: {
                    elementId: 'dropdown-id',
                    value: ['==', '!=', '%=', '=%', '*=', '!*='],
                }
            });

        //i wanted super.super.showMore, but it doesn't work in JS :'(
        return UI.contextMenu.showAt(x, y + height);
    }
}