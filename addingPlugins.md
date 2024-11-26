# Custom Type Plugins in DynamicGrid

## Overview

DynamicGrid provides a powerful plugin system that allows you to create custom type plugins to handle specific data types and their rendering, sorting, and filtering behaviors. This guide will walk you through creating your own type plugins step by step.

## Understanding the TypePlugin Architecture

Each type plugin is a class that extends the abstract `TypePlugin` base class or any class that is based on that class (so it can extend the default `string`, `bool` and `numberTypePlugin`. The plugin must implement several key methods to integrate seamlessly with the DynamicGrid system:

### Required Methods to Implement

1. **`constructor()`**
    - Initialize your plugin
    - Define supported operators
    - Set up any type-specific configurations

2. **`validate(value)`**
    - Validates if a given value matches the plugin's type
    - Returns `true` if the value is valid, `false` otherwise
    - Used to ensure type consistency

3. **`getJSQLFormat(value)`**
    - Converts the value to a standardized format for querying
    - Should handle type-specific formatting requirements
    - Throw an error if the value cannot be formatted

4. **`evaluate(query, dataIndexes, data, indices)`**
    - Filters data based on the given query
    - Handles type-specific filtering logic
    - Manipulates the set of indices to match the query conditions

5. **`evaluateCondition(dataValue, operator, value)`**
    - Performs the actual comparison for a single condition
    - Implements type-specific comparison logic for different operators

6. **`renderHeader(key)`**
    - Creates and returns the header cell for this type
    - Customize header rendering as needed

7. **`renderCell(value)`**
    - Converts the raw value to a displayable string or HTML
    - Implement type-specific formatting

8. **`sort(query, data)`**
    - Implements custom sorting logic for the type
    - Sorts data based on the specified field and direction

9. **`showMore(key, element, dynamicGrid)` (Optional)**
    - Provides additional interactions for the column
    - Can create context menus or additional UI elements

## Complete Example: Creating a Date Type Plugin

Here's a comprehensive example of a custom date type plugin:

```javascript
class dateTypePlugin extends TypePlugin {
    constructor() { //you can add more parameters to the constructor if needed (like the format of the date) (this is optional
        super();
        // Add date-specific operators
        this.operators = [
            '==', '!=',  // equality
            '>', '<',    // greater/less than
            '>=', '<='   // greater/less than or equal
        ];
    }

    validate(value) {
        // check if the value passed is valid for this type return true/false
    }


    evaluate(query, dataIndexes, data, indices) {
        // Similar to number/string plugins, filter indices
        for (const index of indices) {
            if (!this.evaluateCondition(
                new Date(data[index][query.field]), 
                query.operator, 
                new Date(query.value)
            )) {
                indices.delete(index);
            }
        }
        return indices;
    }

    evaluateCondition(dataValue, operator, value) {
        // dataValue is the value of the dataset
        // operator is the operator used in the query
        // value is the value of the query
        
        //return true/false based on the condition
    }

    renderHeader(key) {
        //return a htmlElement that represents the header of the column
    }

    renderCell(value) {
        // return a string that represents the value of the cell, can be a stringed html element
    }

    sort(query, data) {
        //based on the query, sort the data, return the sorted data
    }

    showMore(key, element, dynamicGrid) {
        // Implement date-specific context menu or interactions
        // Check the docs for the context menu for more information
    }
}
```

## Registering Your Custom Plugin

To use your custom plugin, register it when creating a DynamicGrid instance:

```javascript
const grid = new DynamicGrid({
    plugins: {
        date: new dateTypePlugin(/*optional params for settings to this plugin*/),
        // You can add multiple custom plugins
        custom: new myCustomTypePlugin()
        
        string: new customStringPlugin(), //you can also override the default plugins (string, number, bool)
    }
});
```

## Best Practices

1. **Type Validation**: Always implement robust `validate()` method
2. **Performance**: Optimize `evaluate()` and `evaluateCondition()` methods
3. **Consistency**: Follow the existing plugin patterns in the library

## Extending Existing Plugins

You can also extend existing plugins to modify parts their behavior but keep the rest intact. For example, you can extend the `numberTypePlugin` to create a custom money type plugin:

```javascript
class moneyTypePlugin extends numberTypePlugin {
    renderCell(value) {
        const parts = value.toFixed(2).split("."); // Ensure two decimal places
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "."); // Add dots for thousands | 3000.53 => 3.000.53
        return '€' + parts.join(","); // Join with a comma for decimals | 3000.53 => €3.000,53
    }
}
```

## Troubleshooting

- Ensure all required methods are implemented
- Check that operators match the method implementations
- Verify type conversion and validation logic
- Use console logging during development to debug

## Advanced Techniques

### Dynamic Operators

You can dynamically add or modify operators in the constructor:

```javascript
constructor() {
    super();
    // Add custom operators
    this.operators = ['==', '!=', 'CustomOperator']; //as long as the operator has no spaces, it will work
    //make sure to implement the evaluateCondition method for the new operator
}
```

## Limitations and Considerations

- Performance can degrade with very complex type plugins
- Ensure type plugins are immutable and stateless
- Test thoroughly with various data scenarios

## Contributing

If you develop a useful type plugin, consider contributing it back to the DynamicGrid project!

## Compatibility

- Requires modern browser support for ES6+ features

**Pro Tip**: Always design your type plugins to be as generic and reusable as possible. The more flexible your plugin, the more use cases it can support!<br>
**Pro Tip 2**: console.log() is your best friend when debugging your plugin. Use it liberally to understand the flow of data and logic in your plugin.