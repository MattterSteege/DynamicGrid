P.S. THIS IS NOT A FINISHED PROJECT, IT IS A WORK IN PROGRESS!!!!
So this 'docs' page is not up to date with the actual project. not all notes are relevant to the current state of the project etc.

to compile the files into a single file, use the following command:

```cmd
/DynamicGrid> npx terser ./DynamicGrid/DynamicGrid.js ./DynamicGrid/TypePlugin.js ./DynamicGrid/InherentTypePlugin.js ./DynamicGrid/QueryParser.js ./DynamicGrid/SJQLEngine.js --compress keep_classnames=true,keep_fnames=true,dead_code=true,drop_console=false,drop_debugger=true,keep_fargs=true,keep_fnames=true,keep_infinity=false,passes=1 --output ./dist/DynamicGrid.js
```

make sure that the order is correct, since the files are dependent on each other. you can not compile `InherentTypePlugin.js` before `TypePlugin.js` etc.

or load the `Build.run.xml` inside webstorm and run the `Build` task.


---
How do SJQL queries work.

Write any query in the following format:
`name == 'John' and age > 20`
you can add sort and limit to the query as well: `name == 'John' and age > 20 and sort age desc and limit 10`
this will return the first 10 records that match the query and sort them by age in descending order.

to make sure that the query engine is perfoomrant, i made sure that only one sort and limit query will be parsed into the final query object. So adding multiple sort queries are useless and only the first will be actually used.

### notes
* the query parser system removes (for the parsing part, so values can still contain them) all double spaces from the query string, so make sure that the query is formatted correctly.
* The processing of the data in respect to the query is done using this flowchart:
<br>
<br>

```mermaid
sequenceDiagram
    participant User
    participant DynamicGrid
    participant SJQLEngine
    participant DynamicGridUI

    User ->> DynamicGrid: Initialize(config)
    activate DynamicGrid
    DynamicGrid ->> SJQLEngine: Initialize(engine, plugins)
    SJQLEngine ->> SJQLEngine: Add default plugins<br>(stringType, numberType, booleanType)
    SJQLEngine ->> DynamicGrid: Return initialized engine
    DynamicGrid ->> DynamicGridUI: Initialize UI(config.ui)
    DynamicGridUI ->> DynamicGridUI: Set up UI properties<br>(row height, virtual scrolling, etc.)
    DynamicGridUI ->> DynamicGrid: Return initialized UI
    DynamicGrid ->> User: Initialization complete
    deactivate DynamicGrid

    User ->> DynamicGrid: Import data(data, config)
    activate DynamicGrid
    DynamicGrid ->> SJQLEngine: Import and parse data
    SJQLEngine ->> SJQLEngine: Create data index<br>(map header values to rows)
    SJQLEngine ->> DynamicGrid: Return indexed data
    DynamicGrid ->> User: Data import complete
    deactivate DynamicGrid

    User ->> DynamicGrid: Render(query)
    activate DynamicGrid
    DynamicGrid ->> SJQLEngine: Execute query(query)
    SJQLEngine ->> SJQLEngine: Parse query into SELECT, SORT, RANGE, GROUP
    SJQLEngine ->> SJQLEngine: Filter data based on query
    SJQLEngine ->> SJQLEngine: Apply sorting and grouping
    SJQLEngine ->> DynamicGrid: Return filtered data
    DynamicGrid ->> DynamicGridUI: Render data
    activate DynamicGridUI
    DynamicGridUI ->> DynamicGridUI: Render headers
    DynamicGridUI ->> DynamicGridUI: Render visible rows
    DynamicGridUI ->> User: Display rendered grid
    deactivate DynamicGridUI
    deactivate DynamicGrid

    User ->> DynamicGridUI: Interact with grid (e.g., toggle column)
    activate DynamicGridUI
    DynamicGridUI ->> DynamicGrid: Request action (e.g., sort)
    DynamicGrid ->> SJQLEngine: Re-query with updated parameters
    SJQLEngine ->> DynamicGrid: Return updated data
    DynamicGrid ->> DynamicGridUI: Update grid display
    DynamicGridUI ->> User: Updated view displayed
    deactivate DynamicGridUI

```

the sequence diagram of the engine is as follows:
```mermaid
sequenceDiagram
    participant User
    participant DynamicGrid
    participant SJQLEngine
    participant QueryParser
    participant Plugins

    User ->> DynamicGrid: Render(query)
    DynamicGrid ->> SJQLEngine: Execute query(query)
    activate SJQLEngine
    SJQLEngine ->> QueryParser: Parse query
    activate QueryParser
    QueryParser ->> QueryParser: Split query into parts<br>(SELECT, SORT, GROUP, RANGE)
    QueryParser ->> SJQLEngine: Return parsed query parts
    deactivate QueryParser

    SJQLEngine ->> SJQLEngine: Initialize validIndices<br>(all data indices)
    SJQLEngine ->> Plugins: Process SELECT queries
    Plugins ->> SJQLEngine: Validate and filter indices<br>(based on SELECT criteria)

    SJQLEngine ->> SJQLEngine: Handle RANGE query<br>(apply range limits)
    SJQLEngine ->> SJQLEngine: Process GROUP query<br>(group rows by key)
    SJQLEngine ->> Plugins: Handle SORT query<br>(sort valid rows)
    Plugins ->> SJQLEngine: Return sorted/grouped data

    SJQLEngine ->> DynamicGrid: Return filtered data
    deactivate SJQLEngine
    DynamicGrid ->> User: Rendered grid displayed

```

* the query parser is partially case insensitive, so `name == 'John'` is the same as `Name == 'John'`
* Make sure that the query is formatted correctly, since the query parser is not (always) able to handle incorrect queries.
* Make sure that the most specific queries are at the beginning of the query, the next query will be executed on the result of the previous query. So `name == 'John' and age > 20` is faster than `age > 20 and name == 'John'` since there are less John's than people over 20.
* Get the fastest result by setting `engine.UseDataEnumeration` to false and `engine.UseDataIndexing` to true. This will use a different method to search the data, but will be faster (1000 rows: 11.5 queries per second vs 8.2 per second).