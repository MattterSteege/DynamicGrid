# The Complete Query Parser Documentation
## *The Query Bible - Everything You Need to Know About Writing Perfect Queries*

---

## Table of Contents
1. [Overview](#overview)
2. [Query Types](#query-types)
   1. [FUZZY Search 🔍](#1-fuzzy-search-)
   2. [GROUP By 📊](#2-group-by-)
   3. [RANGE Limiting 📏](#3-range-limiting-)
   4. [SORT Ordering 🔢](#4-sort-ordering-)
   5. [SELECT Filtering ⚡](#5-select-filtering-)
3. [Combining Queries](#combining-queries)
4. [Configuration Options](#configuration-options)
5. [Field Matching](#field-matching)
6. [Plugin System](#plugin-system)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Troubleshooting Guide](#troubleshooting-guide)

---

## Overview

The QueryParser is a powerful query language interpreter that allows you to filter, sort, group, and search through data using intuitive natural language syntax. It supports five distinct query types that can be combined using logical operators.

### Core Principles
- **Case-insensitive by default** (configurable)
- **Flexible field matching** with symbol ignoring
- **Plugin-based architecture** for extensible data type support
- **Chainable queries** using AND operators
- **Strict order precedence** from most specific to least specific

---

## Query Types

The parser recognizes five query types, processed in order of specificity:

### 1. FUZZY Search 🔍
**Pattern:** `search "value"`  
**Purpose:** Search for a value across all fields  
**Case Sensitivity:** Always case-insensitive (value converted to lowercase)

```
search "john"           # Find "john" anywhere in any field
search "Project Alpha"  # Find "Project Alpha" in any field
search "2023"          # Find "2023" in any field
```

**Important Notes:**
- Value must be enclosed in double quotes
- Searches across ALL fields in your dataset
- Case-insensitive regardless of configuration
- Most specific query type (highest precedence)

### 2. GROUP By 📊
**Pattern:** `group [field]`  
**Purpose:** Group results by a specific field

```
group department        # Group by department field
group status           # Group by status field
group created_date     # Group by date field
```

**Important Notes:**
- Field name is case-insensitive and flexible (see Field Matching)
- Returns grouped data structure
- Can be combined with other query types

### 3. RANGE Limiting 📏
**Pattern:** `range [number]` or `range [start]-[end]`  
**Purpose:** Limit the number of results returned

```
range 10               # Limit to first 10 results (equals 1-10)
range 20-30            # Results 20 through 30
range 5-5              # Exactly the 5th result
range 15-              # Results from 15 to end of dataset
range -5               # Last 5 results
```

**Range Formats:**
- `range N` → Results 0 to N
- `range N-M` → Results N to M (inclusive)
- `range N-` → Results N to end of dataset
- `range -N` → Last N results

**Important Notes:**
- Negative numbers are supported for the start value
- Single number defaults to starting from 0, only when the single number is positive, otherwise the start value is the dataset length minus the single number
- Start and end values are inclusive
- Range is applied after all other query types
- If the range exceeds available results, it will return all available data

### 4. SORT Ordering 🔢
**Pattern:** `sort [field] [direction]`  
**Purpose:** Sort results by a field in ascending or descending order

```
sort name asc          # Sort by name, ascending
sort date desc         # Sort by date, descending
sort price asc         # Sort by price, ascending
sort created_at desc   # Sort by creation date, descending
```

**Sort Directions:**
- `asc` - Ascending order (A-Z, 0-9, oldest-newest)
- `desc` - Descending order (Z-A, 9-0, newest-oldest)

**Important Notes:**
- Direction is case-insensitive
- Field must exist and have a corresponding plugin
- Plugin determines actual sorting behavior

### 5. SELECT Filtering ⚡
**Pattern:** `[field] [operator] [value]`  
**Purpose:** Filter results where field matches condition  
**Most flexible and commonly used query type**

```
name == "John Doe"     # Exact match
age > 25             # Numeric comparison
status *= "active"   # Partial text match
date < "2023-01-01"   # Date comparison
```

**Operator Support:**
- Operators depend on the field's plugin type
- Each plugin defines its own supported operators
- Invalid operators will show available options in error

---

## Combining Queries

Multiple queries can be combined using AND operators:

### AND Operators
- `and` (case-insensitive)
- `&&` (programming style 😎)

```
name == John and age > 25
status *= active && department == Engineering
search project and sort created_date desc and range 10
group department and status == completed
```

### Query Processing Order
1. Split query on AND operators
2. Parse each sub-query individually
3. Process in the order of query type specificity:
    - FUZZY (most specific)
    - SELECT (least specific, catches everything else)
    - GROUP
    - RANGE
    - SORT

### Complex Examples
```
# Find active engineering employees, sort by name, limit to 20
status == active and department == Engineering and sort name asc and range 20

# Search for "project", group by status, limit results
search project and group status and range 50

# Filter by date range and sort
date >= 2023-01-01 and date <= 2023-12-31 and sort date desc
```

---

## Configuration Options

The QueryParser accepts configuration options to customize behavior:

```javascript
new DynamicGrid({
    engine: {
        useStrictCase: false,
        SymbolsToIgnore: ['_', '-']
    },
    //...
});
```

### useStrictCase
- **Default:** `false`
- **Purpose:** Controls case sensitivity for field matching
- **false:** Field names are case-insensitive
- **true:** Field names must match exactly

### SymbolsToIgnore
- **Default:** `['_', '-']`
- **Purpose:** Symbols ignored when matching field names
- **Example:** With defaults, these all match the same field:
    - `User_name`
    - `user-Name`
    - `username` (after symbol removal)

---

## Field Matching

The parser uses flexible field matching with the `findMatchingIndexKey` function:

### Matching Rules
1. Remove ignored symbols from both query field and header fields
2. Apply case sensitivity based on configuration
3. Find exact match after preprocessing

### Examples
**Headers:** `["first_name", "last_name", "email_address"]`

**Query Field Variations:**
```javascript
first_name    ✓ Direct match
first-name    ✓ Matches first_name (- ignored)
first name    ✓ Matches first_name (space ignored)
firstname     ✓ Matches first_name (_ ignored)
FIRST_NAME    ✓ Matches (if useStrictCase: false)
```

### Case Sensitivity Examples
```javascript
// useStrictCase: false (default)
Name        ✓ name
USER_ID     ✓ user_id

// useStrictCase: true
Name        ✗ name
NAME        ✓ NAME
```

---

## Plugin System

The parser uses a plugin architecture where each field type has an associated plugin that defines:

### Plugin Responsibilities
1. **Operator Validation:** `checkOperator(operator)`
2. **Value Validation:** `validate(value)`
3. **Value Parsing:** `parseValue(value)`
4. **Available Operators:** `getOperatorSymbols()`

### Plugin Integration
```javascript
// Field definition in headers
headers = {
    "name": { type: "string" },
    "age": { type: "number" },
    "created_date": { type: "date" }
}

// Corresponding plugins
plugins = {
    "string": StringPlugin,
    "number": NumberPlugin,
    "date": DatePlugin
}
```

### Query Processing with Plugins
1. Parser identifies field from query
2. Looks up field's plugin type from headers
3. Retrieves corresponding plugin
4. Validates operator against plugin
5. Validates and parses value using plugin

---

## Error Handling

The parser provides detailed error messages for common issues:

### Plugin Not Found
```
Error: No plugin found for header (unknown_type) for key (field_name)
Do you know certain that the name of the key is correct?
```

### Invalid Operator
```
Invalid operator:    >>
       For query:    age >> 25
     options are:    ==, >, <, <=, >=
```

### Invalid Query Format
```
Invalid query: invalid syntax here
Valid queries are: fuzzy, group, range, sort, select
Query: invalid syntax here
```

### Common Error Scenarios
1. **Misspelled field names** - Use flexible matching
2. **Wrong operators** - Check plugin's supported operators
3. **Invalid values** - Plugin validation catches format errors
4. **Missing quotes** - FUZZY queries require quoted values

---

## Best Practices

### 1. Query Structure
- **Start specific, then general:** Begin with exact matches, then add fuzzy search
- **Use meaningful field names:** Leverage flexible matching for readability
- **Combine logically:** Group related conditions together

### 2. Performance Optimization
- **Sort strategically:** Sort by indexed fields when possible
- **Group efficiently:** Group by fields with reasonable cardinality (not too many unique values)

### 3. Maintenance
- **Document field types:** Keep plugin mappings clear
- **Test edge cases:** Verify boundary conditions
- **Handle errors gracefully:** Provide fallback behavior

### 4. Query Design Patterns

#### The Filter-Sort-Limit Pattern
```
[filter conditions] and sort [field] [direction] and range [limit]
```

#### The Search-Group-Analyze Pattern
```
search "[term]" and group [field] and range [sample_size]
```

#### The Time-Range Pattern
```
[date_field] > "[start_date]" and [date_field] < "[end_date]"
```

---

## Troubleshooting Guide

### Query Not Working?

#### 1. Check Query Syntax
- **FUZZY:** Must have quotes: `search "value"`
- **SORT:** Must have direction: `sort field asc`
- **RANGE:** Check number format: [RANGE Limiting 📏](#3-range-limiting-)

#### 2. Verify Field Names
- Check spelling against actual headers
- Remember flexible matching ignores `'_'`, `'-'` (or configured symbols)
- Case sensitivity depends on configuration

#### 3. Validate Operators
- Each plugin supports different operators
- Error messages show available options

#### 4. Check Value Formats
- Strings may need quotes depending on plugin
- Numbers should be numeric
- Dates need proper format for date plugin

### Common Issues and Solutions

| Issue            | Symptom                      | Solution                              |
|------------------|------------------------------|---------------------------------------|
| Field not found  | "No plugin found" error      | Check field name spelling and case    |
| Invalid operator | Operator error with options  | Use suggested operators from error    |
| No results       | Query runs but returns empty | Verify data exists matching criteria  |
| Wrong results    | Unexpected data returned     | Check operator logic and value format |
| Parse error      | "Invalid query" warning      | Verify query syntax against patterns  |

---

## Quick Reference Card

### Query Types (in precedence order)
1. `search "value"` - Fuzzy search all fields
2. `group field` - Group by field
3. `range n`, `range n-m`, `range n-`, `range -n` - Limit results
4. `sort field asc|desc` - Sort by field
5. `field operator value` - Filter by condition

### Combining Queries
- Use `and` or `&&` between conditions
- Process left to right after splitting

*This documentation covers every aspect of the QueryParser system. Bookmark this guide and refer to it whenever you need to construct queries. Happy querying! 🎯*