Here's a README for the `QueryParser` project based on the code provided:

# QueryParser

## Introduction
`QueryParser` is a utility class designed to parse complex query strings and transform them into structured query objects, ready for further processing. It supports multiple query types, such as range limits, sorting, and conditional selection. This parser is highly customizable and relies on a specified engine to handle plugins for various query operators and field types.

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Dependencies](#dependencies)
- [Error Handling](#error-handling)
- [Contributing](#contributing)
- [License](#license)

## Features
- **Range Queries**: Limit the number of results within specified bounds.
- **Sorting Queries**: Sort results by specified keys in ascending or descending order.
- **Conditional Selection**: Filter results based on conditional expressions.

## Installation
To include `QueryParser` in your project, clone the repository and import the `QueryParser` class. Ensure you have a compatible query engine that supports plugins.

```bash
# Clone this repository
git clone https://github.com/yourusername/QueryParser.git
```

## Usage
1. **Instantiate `QueryParser`**: Provide an instance of a query engine that manages plugins for each field type.
2. **Parse a Query**: Use `parseQuery` to convert query strings into structured query objects.

### Example
```javascript
// Assuming `engine` is an instance of the query engine with appropriate plugins.
const queryParser = new QueryParser(engine);

const query = "range 10-20 and sort name asc and age > 25";
const parsedQueries = queryParser.parseQuery(query);
console.log(parsedQueries);
```

## Configuration
`QueryParser` relies on the `engine` instance provided during instantiation:
- **`engine.headers`**: Maps keys to field types to determine the required plugin.
- **`engine.getPlugin(pluginType)`**: Fetches the plugin associated with a specific field type.

### Supported Query Types
- **RANGE**: `range [value]`, where `[value]` can be a single integer or a range (e.g., `10`, `10-20`, `-10`).
- **SORT**: `sort [key] [asc|desc]`, for sorting based on a field.
- **SELECT**: `[key] [operator] [value]`, for conditional selection (e.g., `age > 25`).

## Dependencies
`QueryParser` is designed to work with an external `engine` that:
- Contains a `headers` dictionary to map query keys to field types.
- Provides plugins for handling operations on various fields.

## Error Handling
Custom error handling is implemented within `QueryParser`:
- **Operator Errors**: If an unsupported operator is used in a query, `formatOperatorError` returns a detailed message with valid options.
- **Plugin Errors**: If a plugin does not exist for a field type, an error is thrown specifying the missing plugin.

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request for any changes or improvements. Ensure code is well-documented and thoroughly tested.

## License
This project is licensed under the MIT License.
```

This README provides a concise overview of the `QueryParser` class, guiding users on setup, configuration, and usage. Let me know if you'd like any further customization or additional details!