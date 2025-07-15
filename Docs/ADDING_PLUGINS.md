# Plugin Development Guide

When creating a new plugin, you can use the `ExampleTypePlugin` as a template:

```javascript
// @requires ./BaseTypePlugin.js

class ExampleTypePlugin extends BaseTypePlugin {
    constructor(options = {}) {
        super();
        this.sortingHint = 'date';
        this.options = options;
        this.operators = ['>', '<', '>=', '<=', '><'];
    }

    validate(value) {
        return true
    }

    parseValue(value) {
        return true;
    }

    getInputComponent(currentValue, onChange) {
        const input = document.createElement('input');
        input.type = '';
        input.name = '_'
        input.value = this.parseValue(currentValue);
        input.addEventListener('change', () => onChange(input.value));
        return input;
    }

    getContextMenuItems(columnName, engine, ui) {
        return []
    }

    evaluateCondition(dataValue, operator, compareValue) {
        return undefined;
    }
}
```

This guide will walk you through the code step by step and show you how to implement each method properly.

## Import Statement

```javascript
// @requires ./BaseTypePlugin.js
```

This line imports the base class for the plugin. The base class provides common functionality that can be reused in your plugin implementation.

This import might not be necessary if you plan to [externally load](#external-loading) the plugin into the engine. However, if you want to modify the code and have this plugin bundled with the entire library, you need to import the base class (and import it like all other plugins).

## Constructor

```javascript
constructor(options = {}) {
    super();
    this.sortingHint = 'date'; // Options: 'string', 'number', 'boolean', 'date'
    this.options = options;
    this.operators = ['>', '<', '>=', '<=', '><'];
}
```

In the constructor, you can set the `sortingHint` to indicate how values should be sorted. The `options` object can be used to pass additional configuration options to your plugin.

Here's how you would initialize a plugin with options in the engine:

```javascript
let grid = new DynamicGrid({
    headers: {
        registered: {
            type: 'date', 
            options: {
                minDate: '2000-01-01', 
                maxDate: '2025-12-31'
            }
        },
    }
});
```

In this example, we assume the plugin is registered as 'date' in the engine, so the engine will automatically load the `DateTypePlugin` when it encounters a column with type 'date'.

The `operators` array defines the operators that can be used for filtering and sorting. You can customize this array to include any operators relevant to your plugin. The engine already implements several operators that you can use as reference. These operators are used in the `evaluateCondition` method to compare the data value with the comparison value.

## validate Method

```javascript
validate(value) {
    return true
}
```

The `validate` method is used to validate values being set for the column. You can implement your own validation logic here to ensure values meet certain criteria. Return `true` if the value is valid, otherwise return `false`. This method is called when the user attempts to set a value in the grid.

The value passed to this method has already been processed by the `parseValue` method, so you can assume it's in the correct format. The engine already implements several validation methods that you can use as reference.

## parseValue Method

```javascript
parseValue(value) {
    return true;
}
```

The `parseValue` method is used to parse values being set for the column. You can implement your own parsing logic here to convert the value into the format you need. This method is called when the user attempts to set a value in the grid.

The value passed to this method is the raw value that the user has entered in string format. You should return the parsed value, which will be used in the grid.

## getInputComponent Method

```javascript
getInputComponent(currentValue, onChange) {
    const input = document.createElement('input');
    input.type = ''; // Set the input type, e.g. 'text', 'number', 'date', etc.
    input.name = '_'; // Set the input name, used to identify the input in the grid
    input.value = this.parseValue(currentValue); // Set the current value of the input
    input.addEventListener('change', () => onChange(input.value)); // Call onChange when value changes
    return input; // Return the input element
}
```

The `getInputComponent` method creates the input component used to edit values in the grid. You can create any HTML element you want, but it's recommended to use an input element for text-based values.

When you set `{ type: 'string', isEditable: false}`, the engine will not call this method. Instead, it will create a span with a stringified value.

You can set the input element type to match the type of value you're working with, such as 'text', 'number', 'date', etc. The `currentValue` parameter is the current value of the column, and the `onChange` parameter is a callback function that should be called when the value changes. Use this callback to update the value in the grid's internal database.

## getContextMenuItems Method

```javascript
getContextMenuItems(columnName, engine, ui) {
    return []
}
```

The `getContextMenuItems` method adds custom items to the context menu that appears when users right-click on a cell in the grid. You can return an array of menu items that will be displayed in the context menu. Each item can have a label and a callback function that will be called when the item is clicked.

There are 4 types of context menu items you can return:

### Action Item

```javascript
{
    type: 'action',
    label: 'Calculate Stats',
    action: () => this.calculateStats(columnName)
}
```

This defines an action item that will call the `calculateStats` method inside the plugin when the user clicks on the item. The `columnName` is passed to the action so you can identify which column the action is related to.

Type `action` is used to define an action item that will execute a function when clicked. The `label` is the text that will be displayed in the context menu.

### Filter and/or Sorting Items

```javascript
{
    type: 'filter',
    label: 'Filter',
    operators: this.operators
},
{
    type: 'sort',
    label: 'Sort',
    sortingHint: this.sortingHint
}
```

These items add filtering and sorting options to the context menu. The `operators` array defines the operators that can be used for filtering, and the `sortingHint` indicates how values should be sorted.

For the filter, it's possible that you use an operator that is not defined in the named list of operators. When this happens, the engine will use the operator as a string instead of a named operator (e.g., `==` → 'equals', `!=` → 'not equals', etc.).

### Separator Item

```javascript
{
    type: 'separator'
}
```

A separator item creates a visual separation between different groups of items in the context menu. It has no functionality and is used purely for layout purposes.

Note: This is meant to be used between custom actions. Filter and sort automatically get separated by the engine, so you don't need to add a separator between them.

## evaluateCondition Method

```javascript
evaluateCondition(dataValue, operator, compareValue) {
    return true; // or false
}
```

The `evaluateCondition` method evaluates a condition based on the data value, operator, and compare value. You can implement your own logic here to compare the data value with the compare value using the specified operator. The method should return `true` if the condition is met, `false` if it is not met.

Here's an example implementation:

```javascript
evaluateCondition(dataValue, operator, compareValue) {
    switch (operator) {
        case '==': return dataValue === compareValue;
        case '!=': return dataValue !== compareValue;
        case '>':  return dataValue > compareValue;
        case '<':  return dataValue < compareValue;
        case '>=': return dataValue >= compareValue;
        case '<=': return dataValue <= compareValue;
        default:   return false;
    }
}
```

The method is called with already parsed values, so you can assume that the `dataValue` and `compareValue` are in the correct (and same) format and type. The `operator` is a string that represents the operator being used for the comparison.

# External Loading
So you've created a plugin and want to load it externally into the engine? Here's how you can do it:
```javascript
let grid = new DynamicGrid({
    headers: {
        registered: {
            type: 'example', 
            options: {}
            ... // other options
        },
    },
    plugins: {
        example: ExampleTypePlugin,
    }
});
```

here `example` is the name of the type the plugin represents, and `ExampleTypePlugin` is the class you created. What you DON'T want to do is do `new ExampleTypePlugin()` here, because the engine will do that for you when it needs to create an instance of the plugin.

## sortData Method

The `sortData` method is not explicitly defined in the plugin class, but it is a method that the engine will call when it needs to sort data in a column. The engine will automatically use the `sortingHint` you provided in the constructor to determine how to sort the data. When the `sortingHint` is set to `custom`, the engine will call the `sortData` method with the data for the column and the sorting options.

```javascript
sortData(data, order = 'asc') {
    // Implement your custom sorting logic here, you will get all the data for the column
}
```

# Good to Know's 
Each column in the grid can have its own plugin instance, this means you can have different configurations for each column. The engine will create a new instance of the plugin for each column that uses it.
This is handy when you, for example, need 2 date columns, one where the min/max date is set to a specific range, and another where the min/max date is set to a different range. You can achieve this by passing different options to each column's plugin instance.

```javascriptlet grid = new DynamicGrid({
    headers: {
        registered: {
            type: 'date', 
            options: { minDate: '2000-01-01', maxDate: '2025-12-31' }
        },
        anotherDate: {
            type: 'date', 
            options: { minDate: '2010-01-01', maxDate: '2030-12-31' }
        },
    }
});
```

It is also good to know that you can create more functions in your plugin class that can be called from the engine. For example, you can create a `calculateStats` function that calculates statistics for the column and logs them to the console. This function can be called from the context menu item you created earlier.
since the `getContextMenuItems` function passes you the `columnName` and the `engine` and `ui` instances, you can pass these to your custom function as well.

```javascript
calculateStats(columnName, engine) {
    const data = engine.getDataForColumn(columnName);
    const stats = {
        count: data.length,
        min: Math.min(...data),
        max: Math.max(...data),
        average: data.reduce((sum, value) => sum + value, 0) / data.length
    };
    console.log(`Statistics for ${columnName}:`, stats);
}
```