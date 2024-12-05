# 📊 DynamicGrid

**DynamicGrid** is a feature-rich JavaScript library for rendering JSON or CSV data in an interactive grid format. It offers advanced querying capabilities like sorting, filtering, grouping, and virtual scrolling. With an intuitive UI and a powerful API, **DynamicGrid** simplifies data visualization for non-developers while providing developers the tools to customize and extend functionality. 🚀


P.s. this project is not complete yet, and the documentation is not up to date, but I'm working on it!

---

## Table of Contents

1. [🌟 Features](#-features)
2. [⚙️ Installation](#️-installation)
3. [🖥️ Usage](#️-usage)
    - [Developer Guide](#developer-guide)
    - [Non-Developer Guide](#non-developer-guide)
4. [🛠 Configuration](#-configuration)
5. [📚 Documentation](#-documentation)
6. [🎯 Future Plans](#-future-plans)
7. [📄 License](#-license)
8. [💡 Contributing](#-contributing)

---

## 🌟 Features

- **Sorting**: Easily sort data by any column in ascending or descending order.
- **Filtering**: Apply filters with conditions like `==`, `!=`, `>`, `<`, `in`, and more.
- **Grouping**: Organize rows based on shared column values with a single command.
- **Virtual Scrolling**: Efficient rendering of large datasets by displaying only visible rows.
- **Dynamic Column Resizing**: Adjust column widths with resizable headers.
- **Flexible Querying**: Use a SQL-like syntax for advanced operations (e.g., grouping, sorting, filtering).
- **Type-Aware Plugins**: Built-in support for string, numeric, and boolean data types with extensible plugins.
- **Plugin System**: Easily _add_ or _override with_ custom plugins for additional data types. Now you can change the way the data is processed and displayed. with the safety of the backend engine. (check the plugin docs for more information)
- **Context Menu**: Right-click headers to access sorting, grouping, and filtering options.
- **Data Format Support**: Import data from JSON or CSV files. (for now, more hopefully in the future)
- **Optimized Performance**: Fast hashing and indexing for quick data manipulation.

---

## 🚀 Using the query system

This system allows you to write SQL-like queries to interact with and manipulate data. Below is a detailed explanation of the supported query types, how they work, and how to write them correctly.

---

## Supported Query Types

### **1. GROUP Queries**
- **Purpose**: Groups data based on a specified key (e.g., column or field).
- **Syntax**: `group [key]`
- **Example**: 
  ```text
  group category
  ```
This groups data by the `category` field.

---

### **2. RANGE Queries**
- **Purpose**: Filters data to include only a specific range of results.
- **Syntax**: `range [lower]-[upper]` or `range [value]`
- **Examples**:
   - `range 10-20` → Includes rows from the 10th to the 20th index (counting from 0).
   - `range 15` → Limits the results to the first 15 rows.

---

### **3. SORT Queries**
- **Purpose**: Sorts data based on a field in ascending (`asc`) or descending (`desc`) order.
- **Syntax**: `sort [key] [asc|desc]`
- **Examples**:
   - `sort name asc` → Sorts by the `name` field in ascending order.
   - `sort price desc` → Sorts by the `price` field in descending order.

---

### **4. SELECT Queries**
- **Purpose**: Filters data based on a condition applied to a field.
- **Syntax**: `[field] [operator] [value]`
- **Examples**:
   - `price > 50` → Selects rows where the `price` is greater than 50.
   - `status == active` → Selects rows where the `status` is `active`.

#### **Operators** (By Field Type):
- **String Fields**:
   - `%=` → Starts with (`name %= Jo` → Matches `John`).
   - `=%` → Ends with (`name =% hn` → Matches `John`).
   - `*=` → Contains (`name *= oh` → Matches `John`).
   - `!*=` → Does not contain.
   - `==` → Equals.
   - `!=` → Not equals.
   - `in` → Matches any value in a list (`name in ["John", "Jane"]`).

- **Number Fields**:
   - `>` → Greater than.
   - `<` → Less than.
   - `>=` → Greater than or equal to.
   - `<=` → Less than or equal to.
   - `==` → Equals.
   - `!=` → Not equals.
   - `in` → Matches any value in a list (`price in [10, 20, 30]`).

- **Boolean Fields**:
   - `==` → Equals (`status == true`).
   - `!=` → Not equals (`status != true`).

---

## Combining Queries
You can combine multiple subqueries using `and` or `&&` to create complex queries.

**Example**:
```text
price > 50 and category == Electronics and range 10-20
```
- Filters data where the `price` is greater than 50,
- The `category` is `Electronics`,
- And includes only rows from index 10 to 20.

---

## Writing Correct Queries

1. **Understand the Field Names**: Ensure field names match those defined in the data headers.
2. **Choose the Right Operators**: Use operators valid for the field type (string, number, boolean).
3. **Combine Queries Appropriately**: Use `and` or `&&` to join multiple subqueries.
4. **Match Syntax Exactly**: Follow the specified format for each query type (e.g., no extra spaces, correct use of keywords).
5. **Use Plugins**: If plugins are extensible (e.g., for dates or custom types), ensure your query adheres to the operators and validation rules defined by those plugins.

---

## Example Queries

### **1. Grouping**
```text
group category
```
Groups data by the `category` field.

### **2. Sorting**
```text
sort name asc
```
Sorts by the `name` field in ascending order.

### **3. Filtering**
```text
price > 50
```
Filters rows where the `price` is greater than 50.

### **4. Range**
```text
range 5-15
```
Includes rows from index 5 to 15.

### **5. Combined Query**
```text
price > 100 and category == Electronics and sort name desc
```
Filters rows with `price > 100`, `category == Electronics`, and sorts them by the `name` field in descending order.

---

---

## ⚙️ Installation

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/)
- Modules: `Terser` and `fs` (available via `npm`)

### Build Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/DynamicGrid.git
   cd DynamicGrid
   ```

2. Run one of the build commands:
    - `node build.js` — Builds the project and removes the combined file afterward.
    - `node build.js --rcf` — Builds the project and removes the combined file.
    - `node build.js --kcf` — Builds the project and keeps the combined file.

---

## 🖥️ Usage

### Developer Guide

Import and interact with the `DynamicGrid` class in your JavaScript code:

#### Example:
```javascript
const grid = new DynamicGrid({
    headers: { id: 'number', name: 'string', isActive: 'boolean' },
    ui: { containerId: '#grid-container', rowHeight: 50 }
});

// Load data
grid.importData(data, { type: 'json' });

// Render the grid
grid.render('sort name asc and isActive == true');
```

#### Key Methods:
- **`importData(data, config)`**: Load JSON or CSV data.
- **`render(query)`**: Render the grid based on a query.
- **`sort(key, direction)`**: Sort data by a key (`asc` or `desc`).
- **`groupBy(key)`**: Group rows by a key.
- **`addSelect(key, operator, value)`**: Add filters dynamically.
- **`runSelect()`**: Apply all added filters.

For detailed usage, refer to the API documentation in the code.

### Non-Developer Guide

1. Place the `DynamicGrid.min.js` file in your project.
2. Link the script in your HTML:
   ```html
   <script src="DynamicGrid.min.js"></script>
   <script>
       const grid = new DynamicGrid({ 
           ui: { containerId: '#grid-container' }
       });
       grid.importData(jsonData, { type: 'json' });
       grid.render();
   </script>
   ```
3. Right-click on column headers in the grid to access sorting and filtering options.

---

## 🛠 Configuration

The `DynamicGrid` class is highly configurable:

### Example Configuration
```javascript
const config = {
    headers: {
        id: 'number',
        name: 'string',
        isActive: 'boolean'
    },
    ui: {
        containerId: '#grid-container',
        rowHeight: 50,
        virtualScrolling: true,
        autoFitCellWidth: 'header'
    },
    engine: {
        useStrictCase: false,
        SymbolsToIgnore: [' ', '_', '-']
    }
};
```

### UI Options
| Option               | Description                                        | Default |
|----------------------|----------------------------------------------------|---------|
| `containerId`        | ID of the container element for the grid.          | None    |
| `rowHeight`          | Height of each row (in pixels).                    | 40px    |
| `virtualScrolling`   | Enable/disable virtual scrolling.                  | `true`  |
| `autoFitCellWidth`   | Auto-fit cell widths: `'header'`, `'content'`, etc.| `'header'` |

---

## 📚 Documentation

For a full list of methods, properties, and examples, refer to the [DynamicGrid API Documentation](docs/DynamicGrid.md).

---

## 🎯 Future Plans

- **Inline Editing**: Modify grid data directly in cells.
- **API Integration**: Connect to live data sources.
- **Date Handling**: Add support for date columns. (and other complex data types) 
- **Additional Plugins**: Extend type support for complex data types.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 💡 Contributing

Contributions are welcome! To get started:

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature/my-new-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add some feature"
   ```
4. Push to the branch:
   ```bash
   git push origin feature/my-new-feature
   ```
5. Submit a pull request.

---

⚡ **DynamicGrid** — Simplifying data visualization and manipulation!