const { minify } = require('terser');
const fs = require('fs');

const outputDir = './Dist/';

// Parse command line arguments
const args = process.argv.slice(2);
const versionIndex = args.indexOf('--as-version');
const version = versionIndex !== -1 && args[versionIndex + 1] ? args[versionIndex + 1] : null;
const hasFullBuild = args.includes('--full-build') || args.includes('-fb');
const hasGithub = args.includes('--github');

const config = {
    compress: {
        dead_code: true,
        drop_console: false,
        drop_debugger: true,
        keep_classnames: false,
        keep_fargs: true,
        keep_fnames: false,
        keep_infinity: false,
        passes: 3, // Number of passes to optimize the code (1 is default)
    },
    mangle: {
        eval: false,
        keep_classnames: false,
        keep_fnames: false,
        toplevel: false,
        safari10: false
    },
    module: false,
    // sourceMap: {
    //     filename: 'DynamicGrid.min.js',
    //     url: 'DynamicGrid.min.js.map'
    // },
    output: {
        comments: 'some'
    }
};

hasFullBuild ? config.sourceMap = { filename: 'DynamicGrid.min.js', url: 'DynamicGrid.min.js.map' } : null;

const files = [
    "./DynamicGrid/DynamicGrid.js",
    "./DynamicGrid/DynamicGridUI.js",
    "./DynamicGrid/exportConnectors/ExportConnector.js",
    "./DynamicGrid/exportConnectors/InherentExportConnector.js",
    "./DynamicGrid/typePlugins/TypePlugin.js",
    "./DynamicGrid/typePlugins/BooleanTypePlugin.js",
    "./DynamicGrid/typePlugins/StringTypePlugin.js",
    "./DynamicGrid/typePlugins/NumberTypePlugin.js",
    "./DynamicGrid/typePlugins/DateTypePlugin.js",
    "./DynamicGrid/QueryParser.js",
    "./DynamicGrid/SJQLEngine.js",
    "./DynamicGrid/EditTracker.js",
    "./DynamicGrid/DynamicGridUtils.js",
    "./DynamicGrid/libs/EventEmitter.js",
    "./DynamicGrid/libs/KeyboardShortcuts.js",
    "./DynamicGrid/libs/ContextMenu.js",
];

const separateFiles = [
    "./DynamicGrid/libs/ContextMenu.js",
    "./DynamicGrid/libs/EventEmitter.js",
    "./DynamicGrid/libs/KeyboardShortcuts.js",
    "./DynamicGrid/libs/APIConnector.js",
];

const cssFiles = [
    "./DynamicGrid.css",
];

const eventRegex = /eventEmitter\.emit\('([^']*)',/g;
const events = [];

const shortcutRegex = /\.addShortcut\('([^']*)',.*?'([^']*)'/g;
const shortcuts = [];

// Helper function to inject version comment
function injectVersionComment(code, version) {
    if (!version) return code;

    // Look for @license MIT comment and add version after it
    const licenseRegex = /(@license\s+MIT)/i;
    const versionComment = `\n * @version ${version}`;

    if (licenseRegex.test(code)) {
        return code.replace(licenseRegex, `$1${versionComment}`);
    } else {
        // If no license comment found, add version comment at the beginning
        const versionHeader = `/**\n * @version ${version}\n */\n`;
        return versionHeader + code;
    }
}

// Helper function to add delay
const zeroDelay = true
const delay = (ms) => zeroDelay ? new Promise(resolve => setTimeout(resolve, 0)) : new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    console.clear();
    console.log('DynamicGrid Build Script');
    console.log('=====================================');
    console.log(`Output Directory: ${outputDir}`);
    console.log(`Full Build: ${hasFullBuild ? 'Enabled' : 'Disabled'}`);
    console.log(`Version: ${version ? version : 'Not specified'}`);
    console.log('=====================================');

    //remove output directory if it exists
    if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
    }

    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true });
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

            if (file === "./DynamicGrid/libs/KeyboardShortcuts.js") continue;
            // Extract shortcuts from the current file
            while ((match = shortcutRegex.exec(currFile)) !== null) {
                //add event to list:
                // {keybind: 'eventName', description: 'description', file: 'fileName', line: lineNumber}
                const eventName = match[1];
                const description = match[2] || '';
                const lineNumber = currFile.substring(0, match.index).split('\n').length;
                console.log(`  ↳ Found shortcut: ${eventName} in ${file} at line ${lineNumber}`);

                if (!description || description.trim() === '') {
                    console.log(`\x1b[33m    ↳ No description found for shortcut: ${eventName} in ${file} at line ${lineNumber} (SKIPPING IT)\x1b[0m`);
                    continue; // Skip if no description is found
                }

                // Add the shortcut to the list
                shortcuts.push({ keybind: eventName, description: description, file: file.split('/').pop(), line: lineNumber });
            }

            await delay(100); // Small delay for each file
        }

        // Inject version comment if version is provided
        if (version) {
            combinedCode = injectVersionComment(combinedCode, version);
            console.log(`↳  Version comment injected: ${version}`);
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

        //save shortcuts to a file
        const shortcutsFilePath = outputDir + 'shortcuts.json';
        fs.writeFileSync(shortcutsFilePath, JSON.stringify(shortcuts, null, 2));
        console.log(`↳  Shortcuts saved: ${shortcutsFilePath} (${shortcuts.length})`);
        await delay(300);

        console.log('\nMinifying combined file...');
        await delay(300);
        const minifiedCombined = await minify(combinedCode, {
            ...config,
        });
        fs.writeFileSync(outputDir + 'DynamicGrid.min.js', minifiedCombined.code);
        hasFullBuild ? fs.writeFileSync(outputDir + 'DynamicGrid.min.js.map', minifiedCombined.map) : null;
        console.log('↳  Minified combined file and source map saved.');
        await delay(300);

        console.log('\nProcessing separate files...');
        await delay(200);

        for (const file of separateFiles) {
            console.log(`↳  Processing: ${file}`);
            await delay(100); // Delay for reading each file

            let fileCode = fs.readFileSync(file, 'utf8');

            // Inject version comment for separate files too
            if (version) {
                fileCode = injectVersionComment(fileCode, version);
            }

            const fileName = file.split('/').pop();
            const unminifiedFilePath = `${outputDir}${fileName}`;
            const minifiedFilePath = `${outputDir}${fileName.replace('.js', '.min.js')}`;
            const sourceMapPath = `${minifiedFilePath}.map`;

            // Save the unminified file in the Compiled folder
            hasFullBuild ? fs.writeFileSync(unminifiedFilePath, fileCode) : null;

            console.log(`  ↳ Unminified file saved:`);
            await delay(100);

            // Minify the file and save the minified version and source map
            const config = {
                compress: true,
                mangle: true,
                // sourceMap: {
                //     filename: `${fileName}.map`,
                //     url: `${fileName}.map`
                // },
                output: {
                    comments: function (node, comment) {
                        // Preserve license comments and version comments
                        const text = comment.value;
                        return text.includes('@license') || text.includes('@version');
                    }
                }
            }
            hasFullBuild ? config.sourceMap = { filename: `${fileName}.min.js`, url: `${fileName}.min.js.map` } : null;
            const minifiedFile = await minify(fileCode, config);

            fs.writeFileSync(minifiedFilePath, minifiedFile.code);
            hasFullBuild ? fs.writeFileSync(sourceMapPath, minifiedFile.map) : null;
            console.log(`  ↳ Minified file and source map saved\n`);
            await delay(200); // Delay after saving each file
        }

        console.log('\nProcessing CSS files...');
        await delay(200);

        for (const cssFile of cssFiles) {
            console.log(`↳  Processing: ${cssFile}`);
            await delay(100); // Delay for reading each file

            let cssCode = fs.readFileSync(cssFile, 'utf8');

            // Inject version comment for CSS files too

            const cssFileName = cssFile.split('/').pop();
            const unminifiedCssPath = `${outputDir}${cssFileName}`;
            const minifiedCssPath = `${outputDir}${cssFileName.replace('.css', '.min.css')}`;

            // Save the unminified CSS file
            hasFullBuild ? fs.writeFileSync(unminifiedCssPath, cssCode) : null;
            console.log(`  ↳ Unminified CSS file saved: ${unminifiedCssPath}`);

            // Minify the CSS file (using a simple regex for demonstration)
            var minifiedCss = cssCode.replace(/\s+/g, ' ').trim();
            //remove /* comments */
            minifiedCss = minifiedCss.replace(/\/\*[\s\S]*?\*\//g, '').trim();

            if (version) {
                //cssCode = `/* @version ${version} */\n` + cssCode;
                minifiedCss = `/* @version ${version} */\n` + minifiedCss;
            }

            fs.writeFileSync(minifiedCssPath, minifiedCss);
            console.log(`  ↳ Minified CSS file saved: ${minifiedCssPath}\n`);
        }

        console.log('\n=== Minification Process Completed Successfully ===');

        if (hasGithub) {
            console.log('\ngithub pushed build to package repository');
            console.log('full package can be found at:');
            console.log('https://cdn.jsdelivr.net/gh/matttersteege/dynamicgrid@' + (version ? version : 'latest') + '/Dist/');
        }
    } catch (error) {
        console.error('Error during minification:', error);
    }
})();