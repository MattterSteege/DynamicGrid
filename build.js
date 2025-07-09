const { minify } = require('terser');
const fs = require('fs');
const path = require('path');

const outputDir = './Dist/';

// Parse command line arguments
const args = process.argv.slice(2);
const versionIndex = args.indexOf('--as-version');
const version = versionIndex !== -1 && args[versionIndex + 1] ? args[versionIndex + 1] : null;
const hasFullBuild = args.includes('--full-build') || args.includes('-fb');
const hasGithub = args.includes('--github');
const dramaticBuild = args.includes('--dramatic-build') || args.includes('-db');

// Entry point file - specify your main file here
const entryPoint = './DynamicGrid/DynamicGrid.js';

// Base directories to search for files
const searchDirectories = [
    './DynamicGrid',
    './DynamicGrid/exportConnectors',
    './DynamicGrid/typePlugins',
    './DynamicGrid/libs'
];

// File extensions to consider
const fileExtensions = ['.js'];

const config = {
    compress: {
        dead_code: true,
        drop_console: false,
        drop_debugger: true,
        keep_classnames: false,
        keep_fargs: true,
        keep_fnames: false,
        keep_infinity: false,
        passes: 3,
    },
    mangle: {
        eval: false,
        keep_classnames: false,
        keep_fnames: false,
        toplevel: false,
        safari10: false
    },
    module: false,
    output: {
        comments: 'some'
    }
};

hasFullBuild ? config.sourceMap = { filename: 'DynamicGrid.min.js', url: 'DynamicGrid.min.js.map' } : null;

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

/**
 * Scans directories recursively to find all JavaScript files
 */
function findAllFiles(directories, extensions) {
    const allFiles = new Set();

    function scanDirectory(dir) {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                scanDirectory(fullPath);
            } else if (stat.isFile()) {
                const ext = path.extname(item);
                if (extensions.includes(ext)) {
                    allFiles.add(path.normalize(fullPath));
                }
            }
        }
    }

    directories.forEach(dir => scanDirectory(dir));
    return Array.from(allFiles);
}

/**
 * Parses a JavaScript file to extract import/export dependencies
 */
function parseFileDependencies(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const dependencies = [];

    // Common import patterns to match
    const importPatterns = [
        // ES6 imports
        /import\s+.*?from\s+['"]([^'"]+)['"];?/g,
        /import\s+['"]([^'"]+)['"];?/g,

        // CommonJS requires
        /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,

        // Custom patterns you might use
        /\/\/\s*@requires?\s+['"]?([^'"]+)['"]?/g,
        /\/\*\s*@requires?\s+(['"]?)([^'"]+)\1\s*\*\//g,

        // JSDoc-style dependencies
        /\/\*\*[\s\S]*?@requires?\s+(['"]?)([^'"]+)\1[\s\S]*?\*\//g
    ];

    importPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const importPath = match[1] || match[2];
            if (importPath && !importPath.startsWith('.')) {
                // Skip external modules (node_modules, etc.)
                continue;
            }

            // Resolve relative paths
            const resolvedPath = resolveImportPath(filePath, importPath);
            if (resolvedPath) {
                dependencies.push(resolvedPath);
            }
        }
    });

    return dependencies;
}

/**
 * Resolves import paths relative to the importing file
 */
function resolveImportPath(fromFile, importPath) {
    if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
        return null; // External module
    }

    const fromDir = path.dirname(fromFile);
    let resolved = path.resolve(fromDir, importPath);

    // Try different extensions if no extension provided
    if (!path.extname(resolved)) {
        for (const ext of fileExtensions) {
            const withExt = resolved + ext;
            if (fs.existsSync(withExt)) {
                return path.normalize(withExt);
            }
        }
    } else if (fs.existsSync(resolved)) {
        return path.normalize(resolved);
    }

    return null;
}

/**
 * Performs topological sort to determine build order
 */
function topologicalSort(dependencies) {
    const graph = new Map();
    const inDegree = new Map();
    const allFiles = new Set();

    // Initialize graph
    for (const [file, deps] of Object.entries(dependencies)) {
        allFiles.add(file);
        if (!graph.has(file)) {
            graph.set(file, []);
        }
        if (!inDegree.has(file)) {
            inDegree.set(file, 0);
        }

        deps.forEach(dep => {
            allFiles.add(dep);
            if (!graph.has(dep)) {
                graph.set(dep, []);
            }
            if (!inDegree.has(dep)) {
                inDegree.set(dep, 0);
            }

            graph.get(dep).push(file);
            inDegree.set(file, inDegree.get(file) + 1);
        });
    }

    // Kahn's algorithm for topological sorting
    const queue = [];
    const result = [];

    // Find all nodes with no incoming edges
    for (const [file, degree] of inDegree) {
        if (degree === 0) {
            queue.push(file);
        }
    }

    while (queue.length > 0) {
        const current = queue.shift();
        result.push(current);

        // For each neighbor of current
        const neighbors = graph.get(current) || [];
        for (const neighbor of neighbors) {
            inDegree.set(neighbor, inDegree.get(neighbor) - 1);
            if (inDegree.get(neighbor) === 0) {
                queue.push(neighbor);
            }
        }
    }

    // Check for circular dependencies
    if (result.length !== allFiles.size) {
        const remaining = Array.from(allFiles).filter(file => !result.includes(file));
        throw new Error(`Circular dependency detected. Files involved: ${remaining.join(', ')}`);
    }

    return result;
}

/**
 * Builds the dependency tree starting from entry point
 */
function buildDependencyTree(entryPoint, allFiles) {
    const dependencies = {};
    const visited = new Set();

    function traverse(filePath) {
        if (visited.has(filePath)) return;
        visited.add(filePath);

        const deps = parseFileDependencies(filePath);
        dependencies[filePath] = deps;

        deps.forEach(dep => {
            if (allFiles.includes(dep)) {
                traverse(dep);
            }
        });
    }

    traverse(entryPoint);
    return dependencies;
}

/**
 * Creates the dynamic files array based on dependencies
 */
function createDynamicFilesArray() {
    console.log('🔍 Scanning for JavaScript files...');

    // Find all JavaScript files in the project
    const allFiles = findAllFiles(searchDirectories, fileExtensions);
    console.log(`📁 Found ${allFiles.length} JavaScript files`);

    // Build dependency tree starting from entry point
    console.log(`🌳 Building dependency tree from entry point: ${entryPoint}`);
    const dependencies = buildDependencyTree(entryPoint, allFiles);

    // Perform topological sort to get correct build order
    console.log('🔄 Performing topological sort...');
    const sortedFiles = topologicalSort(dependencies);

    // Filter to only include files that are actually dependencies
    const relevantFiles = sortedFiles.filter(file =>
        Object.keys(dependencies).includes(file) ||
        Object.values(dependencies).some(deps => deps.includes(file))
    );

    console.log(`📋 Build order determined (${relevantFiles.length} files):`);
    relevantFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
    });

    return relevantFiles;
}

// Helper function to inject version comment
function injectVersionComment(code, version) {
    if (!version) return code;

    const licenseRegex = /(@license\s+MIT)/i;
    const versionComment = `\n * @version ${version}`;

    if (licenseRegex.test(code)) {
        return code.replace(licenseRegex, `$1${versionComment}`);
    } else {
        const versionHeader = `/**\n * @version ${version}\n */\n`;
        return versionHeader + code;
    }
}

// Helper function to add delay
const delay = (ms) => !dramaticBuild ? new Promise(resolve => setTimeout(resolve, 0)) : new Promise(resolve => setTimeout(resolve, ms));

/*---------===[ Main entry point ]===---------*/

(async () => {
    console.clear();
    console.log('🚀 DynamicGrid Dynamic Build Script');
    console.log('=====================================');
    console.log(`📁 Output Directory: ${outputDir}`);
    console.log(`🔧 Full Build: ${hasFullBuild ? 'Enabled' : 'Disabled'}`);
    console.log(`🏷️  Version: ${version ? version : 'Not specified'}`);
    console.log(`🎯 Entry Point: ${entryPoint}`);
    console.log('=====================================');

    // Remove output directory if it exists
    if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
    }

    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true });
    await delay(200);

    try {
        // Create dynamic files array
        const files = createDynamicFilesArray();

        if (files.length === 0) {
            console.log('⚠️  No files found to build!');
            return;
        }

        console.log('\n📦 Starting build process...');

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        let combinedCode = '';

        console.log('\n🔗 Combining files in dependency order...');
        await delay(200);

        for (const file of files) {
            combinedCode += `// ${file}\n`;
            const currFile = fs.readFileSync(file, 'utf8') + '\n\n';
            combinedCode += currFile;
            console.log(`✅ Added: ${file}`);

            // Extract events from the current file
            let match;
            while ((match = eventRegex.exec(currFile)) !== null) {
                const eventName = match[1];
                const lineNumber = currFile.substring(0, match.index).split('\n').length;
                events.push({ eventName, file: file.split('/').pop(), line: lineNumber });
                console.log(`  📡 Found event: ${eventName} in ${file} at line ${lineNumber}`);
            }

            if (file === "./DynamicGrid/libs/KeyboardShortcuts.js") continue;

            // Extract shortcuts from the current file
            while ((match = shortcutRegex.exec(currFile)) !== null) {
                const eventName = match[1];
                const description = match[2] || '';
                const lineNumber = currFile.substring(0, match.index).split('\n').length;
                console.log(`  ⌨️  Found shortcut: ${eventName} in ${file} at line ${lineNumber}`);

                if (!description || description.trim() === '') {
                    console.log(`\x1b[33m    ⚠️  No description found for shortcut: ${eventName} in ${file} at line ${lineNumber} (SKIPPING)\x1b[0m`);
                    continue;
                }

                shortcuts.push({ keybind: eventName, description: description, file: file.split('/').pop(), line: lineNumber });
            }

            await delay(100);
        }

        // Inject version comment if version is provided
        if (version) {
            combinedCode = injectVersionComment(combinedCode, version);
            console.log(`🏷️  Version comment injected: ${version}`);
        }

        console.log('\n💾 Saving combined file...');
        await delay(300);
        const combinedFilePath = outputDir + 'DynamicGrid.js';
        fs.writeFileSync(combinedFilePath, combinedCode);
        console.log(`✅ Combined file saved: ${combinedFilePath}`);

        // Save events to a file
        const eventsFilePath = outputDir + 'events.json';
        fs.writeFileSync(eventsFilePath, JSON.stringify(events, null, 2));
        console.log(`📡 Events saved: ${eventsFilePath} (${events.length})`);

        // Save shortcuts to a file
        const shortcutsFilePath = outputDir + 'shortcuts.json';
        fs.writeFileSync(shortcutsFilePath, JSON.stringify(shortcuts, null, 2));
        console.log(`⌨️  Shortcuts saved: ${shortcutsFilePath} (${shortcuts.length})`);
        await delay(300);

        console.log('\n🗜️  Minifying combined file...');
        await delay(300);
        const minifiedCombined = await minify(combinedCode, {
            ...config,
        });
        fs.writeFileSync(outputDir + 'DynamicGrid.min.js', minifiedCombined.code);
        hasFullBuild ? fs.writeFileSync(outputDir + 'DynamicGrid.min.js.map', minifiedCombined.map) : null;
        console.log('✅ Minified combined file and source map saved.');
        await delay(300);

        console.log('\n🔧 Processing separate files...');
        await delay(200);

        for (const file of separateFiles) {
            console.log(`🔄 Processing: ${file}`);
            await delay(100);

            let fileCode = fs.readFileSync(file, 'utf8');

            if (version) {
                fileCode = injectVersionComment(fileCode, version);
            }

            const fileName = file.split('/').pop();
            const unminifiedFilePath = `${outputDir}${fileName}`;
            const minifiedFilePath = `${outputDir}${fileName.replace('.js', '.min.js')}`;
            const sourceMapPath = `${minifiedFilePath}.map`;

            hasFullBuild ? fs.writeFileSync(unminifiedFilePath, fileCode) : null;
            console.log(`  💾 Unminified file saved`);
            await delay(100);

            const separateConfig = {
                compress: true,
                mangle: true,
                output: {
                    comments: function (node, comment) {
                        const text = comment.value;
                        return text.includes('@license') || text.includes('@version');
                    }
                }
            };

            hasFullBuild ? separateConfig.sourceMap = { filename: `${fileName}.min.js`, url: `${fileName}.min.js.map` } : null;
            const minifiedFile = await minify(fileCode, separateConfig);

            fs.writeFileSync(minifiedFilePath, minifiedFile.code);
            hasFullBuild ? fs.writeFileSync(sourceMapPath, minifiedFile.map) : null;
            console.log(`  🗜️  Minified file and source map saved\n`);
            await delay(200);
        }

        console.log('\n🎨 Processing CSS files...');
        await delay(200);

        for (const cssFile of cssFiles) {
            console.log(`🔄 Processing: ${cssFile}`);
            await delay(100);

            let cssCode = fs.readFileSync(cssFile, 'utf8');

            const cssFileName = cssFile.split('/').pop();
            const unminifiedCssPath = `${outputDir}${cssFileName}`;
            const minifiedCssPath = `${outputDir}${cssFileName.replace('.css', '.min.css')}`;

            hasFullBuild ? fs.writeFileSync(unminifiedCssPath, cssCode) : null;
            console.log(`  💾 Unminified CSS file saved: ${unminifiedCssPath}`);

            var minifiedCss = cssCode.replace(/\s+/g, ' ').trim();
            minifiedCss = minifiedCss.replace(/\/\*[\s\S]*?\*\//g, '').trim();

            if (version) {
                minifiedCss = `/* @version ${version} */\n` + minifiedCss;
            }

            fs.writeFileSync(minifiedCssPath, minifiedCss);
            console.log(`  🗜️  Minified CSS file saved: ${minifiedCssPath}\n`);
        }

        console.log('\n🎉 === Build Process Completed Successfully ===');
        console.log(`📦 Total files processed: ${files.length}`);
        console.log(`📡 Events found: ${events.length}`);
        console.log(`⌨️  Shortcuts found: ${shortcuts.length}`);

        if (hasGithub) {
            console.log('\n🐙 GitHub package repository updated');
            console.log('📋 Full package available at:');
            console.log(`🔗 https://cdn.jsdelivr.net/gh/matttersteege/dynamicgrid@${version ? version : 'latest'}/Dist/`);
        }
    } catch (error) {
        console.error('❌ Error during build process:', error);
        process.exit(1);
    }
})();