# webpack-server-runner-plugin

Development server runner for full stack Webpack development

- Run your server code *and* serve your client code on `webpack --watch`
- Keep [hot module replacement](https://webpack.github.io/docs/hot-module-replacement.html) (HMR) connection between server and browser on both client update and server update
- (TODO) Keep [Socket.io](https://github.com/socketio/socket.io) connection on both client and server update
- Compatible with [Express](https://github.com/expressjs/express), [Koa](https://github.com/koajs/koa), [Connect](https://github.com/senchalabs/connect) and all other libraries that export a listener for `http.createServer()`
- No HMR acceptance code needed in your server or client code

## Install

    npm install --save-dev webpack-server-runner-plugin

## Usage

This plugin is intended for development use only.

### In your server entry file

Your server entry file should export the listener function for `http.createServer`. This is compatible with Express 4's template project, where `bin/www` imports this listener function from `app.js`. So in Express you should do

```js
const app = express();
...
module.exports = app;
```

### In `webpack.config.js`

`WebpackServerRunnerPlugin` needs at least the following properties in the Webpack config file. You should use a [multiple configuration setup](https://webpack.github.io/docs/configuration.html#multiple-configurations) for your server and client code:

```js
const webpackHotMiddleware = require('webpack-hot-middleware');
const WebpackServerRunnerPlugin = require('webpack-server-runner-plugin');

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
        new webpack.NoErrorsPlugin(),
        new runServer.StaticFilesPlugin()
    ]
};

module.exports = [server, client];
```

You can even attach more `StaticFilesPlugin`s (with a different `output.publicPath`) if you have more than one client config.

### Run

    webpack --watch

This plugin does not work with `webpack-dev-server`. `webpack-dev-server` only serves client content.

## How does it work

`WebpackServerRunnerPlugin` runs your server code in the `webpack` process via a `require()` statement to the build file. It modifies your entry module like [`DllPlugin`](https://github.com/webpack/docs/wiki/list-of-plugins#dllplugin) does: it exports the internal `require` function and the entry `module` object to be able to update the server after an HMR module reload.

Internally, `WebpackServerRunnerPlugin` dispatches every incoming request between your client files and server routes based on the client's `output.publicPath` setting in your Webpack config file. The client files are served by an express app.

## License

MIT
