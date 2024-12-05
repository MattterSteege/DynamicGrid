//to build the project run the following command in the terminal: node build.js

const { minify } = require('terser');
const fs = require('fs');

const outputDir = './Compiled/';
// Configuratie voor Terser
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
    sourceMap: {
        filename: outputDir + 'DynamicGrid.min.js.map',
        url: outputDir + 'DynamicGrid.min.js'
    },
    output: {
        comments: 'some'
    }
};


// Bestanden samenvoegen
const files = [
    "./DynamicGrid/DynamicGrid.js",
    "./DynamicGrid/DynamicGridUI.js",
    "./DynamicGrid/TypePlugin.js",
    "./DynamicGrid/InherentTypePlugin.js",
    "./DynamicGrid/QueryParser.js",
    "./DynamicGrid/SJQLEngine.js",
    "./DynamicGrid/DynamicGridUtils.js",
    "./DynamicGrid/ContextMenu.js"
];

// Parse command line arguments
const removeCombinedFile = process.argv.includes('--remove-combine-file') || process.argv.includes('--rcf');
const keepCombinedFile = process.argv.includes('--keep-combine-file') || process.argv.includes('--kcf');

(async () => {
    console.log('\n' + '='.repeat(50));
    console.log('Starting the minification process...');
    console.log('=' .repeat(50) + '\n');

    try {
        let code = '';

        // Inform the user about file concatenation
        console.log('Step 1: Reading and concatenating files...');
        console.log('--------------------------------------------------');

        // Voeg alle bestanden samen
        for (const file of files) {
            code += "// " + file + "\n";
            code += fs.readFileSync(file, 'utf8') + '\n\n';
            console.log(`  - Added ${file}`);
        }

        // Save the combined code
        console.log('\nStep 2: Saving combined code as "DynamicGrid.js"...');
        console.log('--------------------------------------------------');
        fs.writeFileSync(outputDir + 'DynamicGrid.js', code);
        console.log('  - Combined code saved as "DynamicGrid.js"');

        console.log('\n======================================================');
        console.log('Step 3: Minifying the code...');
        console.log('--------------------------------------------------');

        // Minificeren
        const minified = await minify(code, config);
        console.log('  - Minification complete!\n');

        // Minified code en sourcemap opslaan
        console.log('Step 4: Saving minified code and sourcemaps...');
        console.log('--------------------------------------------------');
        fs.writeFileSync(config.sourceMap.url, minified.code);
        fs.writeFileSync(config.sourceMap.filename, minified.map);
        console.log('  - Minified code and sourcemaps saved!');

        console.log('\n======================================================');
        console.log('Minification process finished successfully!\n');

        // Prompt user to remove DynamicGrid.js if not using --remove-combine-file or --rcf
        if (removeCombinedFile) {
            console.log('Removing "DynamicGrid.js" file as requested...');
            fs.unlinkSync(outputDir + 'DynamicGrid.js');
            console.log('  - "DynamicGrid.js" file removed successfully.');
        }
        else if (keepCombinedFile){
            console.log('  - "DynamicGrid.js" file kept.');
            fs.writeFileSync(outputDir + 'DynamicGrid.js', code);
            console.log('  - Combined code saved as "DynamicGrid"');
        }
        else {
            // Ask user if they want to delete the DynamicGrid.js file
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('Do you want to remove the "DynamicGrid.js" file? (y/n): ', (answer) => {
                if (answer.toLowerCase() === 'y') {
                    fs.unlinkSync(outputDir + 'DynamicGrid.js');
                    console.log('  - "DynamicGrid.js" file removed successfully.');
                } else {
                    console.log('  - "DynamicGrid.js" file kept.');
                }
                rl.close();
            });
        }

    } catch (err) {
        console.error('\nError during minification: ', err);
    }
})();
