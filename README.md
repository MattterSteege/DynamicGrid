to compile the files into a single file, use the following command:

```cmd
/DynamicGrid> npx terser ./DynamicGrid/DynamicGrid.js ./DynamicGrid/TypePlugin.js ./DynamicGrid/InherentTypePlugin.js ./DynamicGrid/QueryParser.js ./DynamicGrid/SJQLEngine.js --compress keep_classnames=true,keep_fnames=true,dead_code=true,drop_console=false,drop_debugger=true,keep_fargs=true,keep_fnames=true,keep_infinity=false,passes=1 --output ./dist/DynamicGrid.js
```

make sure that the order is correct, since the files are dependent on each other. you can not compile `InherentTypePlugin.js` before `TypePlugin.js` etc.

or load the `Build.run.xml` inside webstorm and run the `Build` task.