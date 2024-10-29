const path = require('path');

module.exports = {
    entry: './DynamicGrid/DynamicGrid.js',
    output: {
        filename: 'DynamicGrid.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'DynamicGrid',
        libraryTarget: 'umd',
        globalObject: 'this',
        libraryExport: 'default', // Export the default export (i.e., the DynamicGrid class)
    },
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
        ],
    },
    resolve: {
        modules: [path.resolve(__dirname, 'DynamicGrid'), 'node_modules'],
    },
};