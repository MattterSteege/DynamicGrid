# Adding Custom Type Plugins in DynamicGrid

## Overview

DynamicGrid allows you to extend its functionality by creating custom type plugins. These plugins define how specific data types are validated, rendered, sorted, and filtered. This guide explains how to create and register custom type plugins, following the structure used in `InherentTypePlugin.js`.

## Plugin Structure

Each type plugin extends the `TypePlugin` base class and overrides its methods to implement type-specific behavior. Below are the key methods you need to implement:

### Required Methods

1. **`constructor()`**
   - Initialize the plugin and define supported operators.
   - Example:
     ```javascript
     constructor() {
         super();
         this.operators = ['==', '!=', '>', '<']; // Define operators
     }
     ```

2. **`validate(value)`**
   - Validates if a value matches the plugin's type.
   - Example:
     ```javascript
     validate(value) {
         return typeof value === 'string'; // Example for string type
     }
     ```

3. **`parseValue(value)`**
   - Converts a value to the appropriate type.
   - Example:
     ```javascript
     parseValue(value) {
         return String(value); // Example for string type
     }
     ```

4. **`evaluate(query, dataIndexes, data, indices)`**
   - Filters data based on the query.
   - Example:
     ```javascript
     evaluate(query, dataIndexes, data, indices) {
         for (const index of indices) {
             if (!this.evaluateCondition(data[index][query.field], query.operator, query.value)) {
                 indices.delete(index);
             }
         }
         return indices;
     }
     ```

5. **`evaluateCondition(dataValue, operator, value)`**
   - Compares a data value with a query value using the specified operator.
   - Example:
     ```javascript
     evaluateCondition(dataValue, operator, value) {
         switch (operator) {
             case '==': return dataValue === value;
             case '!=': return dataValue !== value;
             // Add more operators as needed
         }
     }
     ```

6. **`sort(query, data)`**
   - Sorts data based on the query.
   - Example:
     ```javascript
     sort(query, data) {
         const { field, value: direction } = query;
         return data.sort((a, b) => direction === 'asc' ? a[field] - b[field] : b[field] - a[field]);
     }
     ```

7. **`renderCell(value)`**
   - Creates a table cell for displaying the value.
   - Example:
     ```javascript
     renderCell(value) {
         const cell = document.createElement('div');
         cell.innerText = String(value);
         return cell;
     }
     ```

8. **`renderEditableCell(value, onEdit)`**
   - Creates an editable table cell.
   - Example:
     ```javascript
     renderEditableCell(value, onEdit) {
         const cell = document.createElement('div');
         cell.contentEditable = true;
         cell.innerText = String(value);
         cell.addEventListener('focusout', () => onEdit(cell.innerText));
         return cell;
     }
     ```

9. **`showMore(key, element, engine, UI)` (Optional)**
   - Adds additional interactions for the column, such as context menus.
   - Example:
     ```javascript
     showMore(key, element, engine, UI) {
         const { x, y, height } = element.getBoundingClientRect();
         UI.contextMenu.clear();
         UI.contextMenu
             .button('Sort ascending', () => {
                 engine.setSort(key, 'asc');
                 UI.render(engine.runCurrentQuery());
             })
             .button('Sort descending', () => {
                 engine.setSort(key, 'desc');
                 UI.render(engine.runCurrentQuery());
             });
         UI.contextMenu.showAt(x, y + height);
     }
     ```

## Example: String Type Plugin

Below is an example of a custom plugin for handling string data:

```javascript
class stringTypePlugin extends TypePlugin {
    constructor() {
        super();
        this.operators = ['==', '!=', '%=', '=%', '*=', '!*=']; // Define operators
    }

    validate(value) {
        return typeof value === 'string';
    }

    parseValue(value) {
        return String(value);
    }

    evaluate(query, dataIndexes, data, indices) {
        for (const index of indices) {
            if (!this.evaluateCondition(data[index][query.field], query.operator, query.value)) {
                indices.delete(index);
            }
        }
        return indices;
    }

    evaluateCondition(dataValue, operator, value) {
        switch (operator) {
            case '==': return dataValue === value;
            case '!=': return dataValue !== value;
            case '%=': return dataValue.startsWith(value);
            case '=%': return dataValue.endsWith(value);
            case '*=': return dataValue.includes(value);
            case '!*=': return !dataValue.includes(value);
        }
    }

    sort(query, data) {
        const { field, value: direction } = query;
        return data.sort((a, b) => direction === 'asc' ? a[field].localeCompare(b[field]) : b[field].localeCompare(a[field]));
    }
}
```

## Registering Plugins

To use your custom plugin, register it with the `DynamicGrid` instance:

```javascript
const grid = new DynamicGrid({
    plugins: {
        string: new stringTypePlugin(), //is registered by default (can override by custom plugin)
        number: new NumberTypePlugin(), //is registered by default (can override by custom plugin)
        boolean: new BooleanTypePlugin(), //is registered by default (can override by custom plugin)
    }
});
```

## Extending Existing Plugins

You can extend existing plugins to modify or add functionality. For example, to create a custom money type plugin:

```javascript
class moneyTypePlugin extends NumberTypePlugin {
    renderCell(value) {
        const parts = value.toFixed(2).split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return '€' + parts.join(",");
    }
}
```

## Best Practices

1. **Keep Plugins Modular**: Each plugin should handle only one type.
2. **Optimize Performance**: Ensure `evaluate` and `evaluateCondition` are efficient.
3. **Follow Patterns**: Use the structure and style of existing plugins for consistency.

## Debugging Tips

- Use `console.log()` to debug your plugin during development.
- Test your plugin with various datasets and queries.

## Conclusion

Custom plugins allow you to tailor DynamicGrid to your specific needs. By following the structure outlined above, you can create robust and reusable plugins for any data type.
