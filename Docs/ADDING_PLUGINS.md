when you want to create a new plugin, you can use the 'ExampleTypePlugin' as a template:

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
Ii will walk you trough the code step by step and show you how to implement the methods:

# import
`// @requires ./BaseTypePlugin.js`<br>
this line is used to import the base class for the plugin. The base class provides common functionality that can be reused in your plugin.
This line might not be necessary if you want to externally load this plugin into the engine, but when you want to alter the code and want this plugin to be bundled with the whole library, you need to import the base class. (and import it like all other plugins)

# constructor
```javascript
constructor(options = {}) {
    super();
    this.sortingHint = 'date'; // or 'string', 'number', 'boolean', 'date'
    this.options = options;
    this.operators = ['>', '<', '>=', '<=', '><'];
}
```

In the constructor, you can set the `sortingHint` to indicate how the values should be sorted. The `options` object can be used to pass any additional configuration options to your plugin. You do this like this when you initialize the plugin in the engine:
```javascript
let grid = new DynamicGrid({
    headers: {
        registered: {type: 'date', options: {minDate: '2000-01-01', maxDate: '2025-12-31'}},
    }
});
```

here we do assume that the plugin is registered as 'date' in the engine, so the engine will automatically load the `DateTypePlugin` when it encounters a column with type 'date'.

The `operators` array defines the operators that can be used for filtering and sorting. You can customize this array to include any operators that are relevant for your plugin.
There are a bunch of operators that are already implemented in the engine, so you can use those as a reference. The operators are used in the `evaluateCondition` method to compare the data value with the compare value.

# validate
```javascript
validate(value) {
    return true
}
```

The `validate` method is used to validate the value that is being set for the column. You can implement your own validation logic here to ensure that the value meets certain criteria. If the value is valid, return `true`, otherwise return `false`. This method is called when the user tries to set a value in the grid.
The value passed to this method is already parsed by the `parseValue` method, so you can assume that the value is in the correct format.
There are a bunch of validation methods that are already implemented in the engine, so you can use those as a reference (as i said before :) )

# parseValue
```javascript
parseValue(value) {
    return true;
}
```
The `parseValue` method is used to parse the value that is being set for the column. You can implement your own parsing logic here to convert the value into the format that you need. This method is called when the user tries to set a value in the grid.
The value passed to this method is the raw value that the user has entered in string format. You can return the parsed value, which will be used in the grid.

# getInputComponent
```javascript
getInputComponent(currentValue, onChange) {
    const input = document.createElement('input');
    input.type = ''; // set the type of the input, e.g. 'text', 'number', 'date', etc.
    input.name = '_'; // set the name of the input, this is used to identify the input in the grid
    input.value = this.parseValue(currentValue); // set the current value of the input
    input.addEventListener('change', () => onChange(input.value)); // call onChange when the value changes
    return input; // return the input element
}
```

The `getInputComponent` method is used to create the input component that will be used to edit the value in the grid. You can create any HTML element that you want, but it is recommended to use an input element for text-based values.
When you set `{ type: 'string', isEditable: false}` the engine will not call this method, but instead with create a span with a stringified value.
You can set the type of the input element to match the type of the value that you are working with, such as 'text', 'number', 'date', etc. The `currentValue` parameter is the current value of the column, and the `onChange` parameter is a callback function that should be called when the value changes. You can use this callback to update the value in the grid's internal database.

# getContextMenuItems
```javascript
getContextMenuItems(columnName, engine, ui) {
    return []
}
```

The `getContextMenuItems` method is used to add custom items to the context menu that appears when the user right-clicks on a cell in the grid. You can return an array of menu items that will be displayed in the context menu. Each item can have a label and a callback function that will be called when the item is clicked.

there are 4 types of context menu items that you can return:
### **Action item**:
```javascript
{
    type: 'action',
    label: 'Calculate Stats',
    action: () => this.calculateStats(columnName)
}
```

here we define an action item that will call the `calculateStats` inside the plugin when the user clicks on the item. The `columnName` is passed to the action so you can use it to identify which column the action is related to.

type `action` is used to define an action item that will execute a function when clicked. The `label` is the text that will be displayed in the context menu.

### **Filter and/or sorting item**:
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

These items are used to add filtering and sorting options to the context menu. The `operators` array is used to define the operators that can be used for filtering, and the `sortingHint` is used to indicate how the values should be sorted.

For the filter it might be possible that you use an operator that is not defined in the named list of operators, when this happens, the engine will just use the operator as a string instead of a named operator. `(== -> 'equals', != -> 'not equals', etc.)`

### **Separator item**:
```javascript
{
    type: 'separator'
}
```
A separator item is used to create a visual separation between different groups of items in the context menu. It does not have any functionality and is just used for layout purposes.
Beware, this is meant to be used between custom actions etc. filter and sort automatically get separated by the engine, so you don't need to add a separator between them.

# evaluateCondition
```javascript
evaluateCondition(dataValue, operator, compareValue) {
    return true; // or false
}
```
The `evaluateCondition` method is used to evaluate a condition based on the data value, operator, and compare value. You can implement your own logic here to compare the data value with the compare value using the specified operator. The method should return `true` if the condition is met, `false` if it is not met.

an example of this would be:
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

The method is call with already parsed values, so you can assume that the `dataValue` and `compareValue` are in the correct (and thus same) format and type. The `operator` is a string that represents the operator that is being used for the comparison.