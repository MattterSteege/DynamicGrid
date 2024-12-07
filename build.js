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
    "./DynamicGrid/DynamicGridUtils.js",
    "./DynamicGrid/ContextMenu.js"
];

const separateFiles = [
    "./DynamicGrid/APIConnection.js",
    "./DynamicGrid/ContextMenu.js",
];

// Helper function to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    console.log('=== Starting Minification Process ===');
    await delay(300); // Initial pause

    try {
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        let combinedCode = '';

        console.log('\nCombining main files...');
        await delay(300);

        for (const file of files) {
            combinedCode += `// ${file}\n`;
            combinedCode += fs.readFileSync(file, 'utf8') + '\n\n';
            console.log(`  Added: ${file}`);
            await delay(200); // Small delay for each file
        }

        console.log('\nSaving combined file...');
        await delay(500);
        const combinedFilePath = outputDir + 'DynamicGrid.js';
        fs.writeFileSync(combinedFilePath, combinedCode);
        console.log(`  Combined file saved: ${combinedFilePath}`);

        console.log('\nMinifying combined file...');
        await delay(500);
        const minifiedCombined = await minify(combinedCode, {
            ...config,
            sourceMap: {
                filename: 'DynamicGrid.min.js.map',
                url: 'DynamicGrid.min.js.map'
            }
        });
        fs.writeFileSync(outputDir + 'DynamicGrid.min.js', minifiedCombined.code);
        fs.writeFileSync(outputDir + 'DynamicGrid.min.js.map', minifiedCombined.map);
        console.log('  Minified combined file and source map saved.');
        await delay(500);

        console.log('\nProcessing separate files...');
        await delay(300);

        for (const file of separateFiles) {
            console.log(`  Processing: ${file}`);
            await delay(200); // Delay for reading each file

            const fileCode = fs.readFileSync(file, 'utf8');
            const fileName = file.split('/').pop();
            const unminifiedFilePath = `${outputDir}${fileName}`;
            const minifiedFilePath = `${outputDir}${fileName.replace('.js', '.min.js')}`;
            const sourceMapPath = `${minifiedFilePath}.map`;

            // Save the unminified file in the Compiled folder
            fs.writeFileSync(unminifiedFilePath, fileCode);
            console.log(`    Unminified file saved: ${unminifiedFilePath}`);
            await delay(200);

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
            console.log(`    Minified file and source map saved: ${minifiedFilePath}, ${sourceMapPath}`);
            await delay(300); // Delay after saving each file
        }

        console.log('\n=== Minification Process Completed Successfully ===');
    } catch (error) {
        console.error('Error during minification:', error);
    }
})();