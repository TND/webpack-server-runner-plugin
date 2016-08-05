# webpack-server-runner-plugin

Development server runner for full stack Webpack development

- Run your server code *and* serve your client code on `webpack --watch`
- Keep hot module replacement (HMR) connection between server and browser on both client update and server update
- (TODO) Keep Socket.io connection on both client and server update
- Compatible with Express, Koa, Connect and all other libraries that export a listener for `http.createServer()`
- No HMR acceptance code needed in your server or client code

## Usage

Intended for development use only.

### In your server entry file

Your server entry file should export the listener function for `http.createServer`. This is compatible with Express 4's template project, where `bin/www` imports this listener function from `app.js`. So in Express you should do

    const app = express();
    ...
    module.exports = app;

In Koa, this looks like

    const app = koa();
    ...
    module.exports = app.callback();

### In `webpack.config.js`

Here goes all `WebpackServerRunnerPlugin` code.

    const runServer = new WebpackServerRunnerPlugin({
        port: 3000 // default
    });

    const server = {
        name: 'server',
        entry: [
            'webpack/hot/poll?1000',
            './server'
        ],
        context: __dirname,
        target: 'node',
        output: {
            path: path.join(__dirname, './dist/server'),
            libraryTarget: 'commonjs'
        },
        plugins: [
            new webpack.HotModuleReplacementPlugin(),
            new webpack.NoErrorsPlugin(),
            runServer
        ]
    };

    const client = {
        name: 'client',
        entry: [
            'webpack-hot-middleware/client?dynamicPublicPath=true',
            './client'
        ],
        context: __dirname,
        output: {
            path: path.join(__dirname, './dist/client'),
            new webpack.NoErrorsPlugin()
            publicPath: '/static/'
        },
        plugins: [
            new webpack.HotModuleReplacementPlugin(),
            new runServer.StaticFilesPlugin()
        ]
    };

    module.exports = [server, client];

You can even attach more `StaticFilesPlugin`s (with a different `output.publicPath`) if you have more than one client config.

### Run

    webpack --watch

## License

MIT
