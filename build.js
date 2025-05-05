const { minify } = require('terser');
const fs = require('fs');

const outputDir = './Compiled/';
const config = {
    compress: {
        dead_code: true,
        drop_console: ['log', 'info'],
        drop_debugger: true,
        keep_classnames: true,
        keep_fargs: false,
        keep_fnames: false,
        keep_infinity: false
    },
    mangle: false,
    module: false,
    output: {
        comments: 'some'
    }
};

const files = [
    "./DynamicGrid/DynamicGrid.js",
    "./DynamicGrid/DynamicGridUI.js",
    "./DynamicGrid/TypePlugin.js",
    "./DynamicGrid/InherentTypePlugin.js",
    "./DynamicGrid/QueryParser.js",
    "./DynamicGrid/SJQLEngine.js",
    "./DynamicGrid/EventEmitter.js",
    "./DynamicGrid/KeyboardShortcuts.js",
    "./DynamicGrid/DynamicGridUtils.js",
    "./DynamicGrid/ContextMenu.js"
];

const separateFiles = [
    "./DynamicGrid/APIConnector.js",
    "./DynamicGrid/ContextMenu.js",
    "./DynamicGrid/KeyboardShortcuts.js",
];

const eventRegex = /eventEmitter\.emit\('([^']*)',/g;
const events = [];

// Helper function to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    console.log('=== Starting Minification Process ===');
    await delay(200); // Initial pause

    try {
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        let combinedCode = '';

        console.log('\nCombining main files...');
        await delay(200);

        for (const file of files) {
            combinedCode += `// ${file}\n`;
            const currFile = fs.readFileSync(file, 'utf8') + '\n\n';
            combinedCode += currFile;
            console.log(`↳  Added: ${file}`);

            // Extract events from the current file
            let match;
            while ((match = eventRegex.exec(currFile)) !== null) {
                //add event to list:
                // {eventName: 'eventName', file: 'fileName', line: lineNumber}
                const eventName = match[1];
                const lineNumber = currFile.substring(0, match.index).split('\n').length;
                events.push({ eventName, file: file.split('/').pop(), line: lineNumber });
                console.log(`  ↳ Found event: ${eventName} in ${file} at line ${lineNumber}`);
            }

            await delay(100); // Small delay for each file
        }

        console.log('\nSaving combined file...');
        await delay(300);
        const combinedFilePath = outputDir + 'DynamicGrid.js';
        fs.writeFileSync(combinedFilePath, combinedCode);
        console.log(`↳  Combined file saved: ${combinedFilePath}`);

        //save events to a file
        const eventsFilePath = outputDir + 'events.json';
        fs.writeFileSync(eventsFilePath, JSON.stringify(events, null, 2));
        console.log(`↳  Events saved: ${eventsFilePath} (${events.length})`);
        await delay(300);

        console.log('\nMinifying combined file...');
        await delay(300);
        const minifiedCombined = await minify(combinedCode, {
            ...config,
            sourceMap: {
                filename: 'DynamicGrid.min.js.map',
                url: 'DynamicGrid.min.js.map'
            }
        });
        fs.writeFileSync(outputDir + 'DynamicGrid.min.js', minifiedCombined.code);
        fs.writeFileSync(outputDir + 'DynamicGrid.min.js.map', minifiedCombined.map);
        console.log('↳  Minified combined file and source map saved.');
        await delay(300);

        console.log('\nProcessing separate files...');
        await delay(200);

        for (const file of separateFiles) {
            console.log(`↳  Processing: ${file}`);
            await delay(100); // Delay for reading each file

            const fileCode = fs.readFileSync(file, 'utf8');
            const fileName = file.split('/').pop();
            const unminifiedFilePath = `${outputDir}${fileName}`;
            const minifiedFilePath = `${outputDir}${fileName.replace('.js', '.min.js')}`;
            const sourceMapPath = `${minifiedFilePath}.map`;

            // Save the unminified file in the Compiled folder
            fs.writeFileSync(unminifiedFilePath, fileCode);

            console.log(`  ↳ Unminified file saved:`);
            await delay(100);

            // Minify the file and save the minified version and source map
            const minifiedFile = await minify(fileCode, {
                compress: true,
                mangle: true,
                sourceMap: {
                    filename: `${fileName}.map`,
                    url: `${fileName}.map`
                }
            });

            fs.writeFileSync(minifiedFilePath, minifiedFile.code);
            fs.writeFileSync(sourceMapPath, minifiedFile.map);
            console.log(`  ↳ Minified file and source map saved\n`);
            await delay(200); // Delay after saving each file
        }

        console.log('\n=== Minification Process Completed Successfully ===');
    } catch (error) {
        console.error('Error during minification:', error);
    }
})();