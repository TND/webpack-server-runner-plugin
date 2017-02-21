# webpack-server-runner-plugin

Development server runner for full stack Webpack 2 development

- Run your server code *and* serve your client code on `webpack --watch`
- Keep [hot module replacement](https://webpack.github.io/docs/hot-module-replacement.html) (HMR) connection between server and browser on both client update and server update
- Compatible with [Express](https://github.com/expressjs/express), [Koa](https://github.com/koajs/koa), [Connect](https://github.com/senchalabs/connect) and all other libraries that export a listener for `http.createServer()`
- No HMR acceptance code needed in your server or client code

## Install

    npm install --save-dev webpack-server-runner-plugin

(Install `webpack-server-runner-plugin@^0.0.6` for Webpack 1 development.)

## Usage

This plugin is intended for development use only.

### In your server entry file

Your server entry file should export the listener function for `http.createServer`. This is compatible with Express 4's [Application generator](https://expressjs.com/en/starter/generator.html), where `bin/www` imports this listener function from `app.js`. So in Express you should do

```js
const app = express();
...
module.exports = app;
```

### In `webpack.config.js`

This section describes how to update your development Webpack config to be
compatible with `ServerRunnerPlugin`. You should use a [multiple configuration setup](https://webpack.github.io/docs/configuration.html#multiple-configurations) for your server and client code:

```js
// in webpack.config.js
const server = { /* server webpack config object */ };
const client = { /* client webpack config object */ };
module.exports = [server, client];
```

You can add more named clients.

Follow these steps to make your webpack config compatible with `ServerRunnerPlugin`:

For the server config, external `node_modules` should be excluded from the build. You could e.g. use [`webpack-node-externals`](https://github.com/liady/webpack-node-externals) for this. Import both libraries:

```js
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const ServerRunnerPlugin = require('webpack-server-runner-plugin');
```

Initialize `ServerRunnerPlugin` with optional port:

```js
const serverRunner = new ServerRunnerPlugin({
    host: 'http://localhost', // default
    port: 8080 // default,
    open: false // open browser on start, default false
});
```

Configuration objects can have a `name` for better debug output. The server
config must have `target: 'node'`, which makes the Webpack output compatible
with Node.js. A `context` is also required.

```js
const server = {
    name: 'server',
    target: 'node',
    context: __dirname,
```

`server.entry` must be an array containing a Webpack hot client and your server entry file:

```js
    entry: [
        'webpack/hot/poll?1000',
        './server'
    ],
```

Use your favorite setup to make sure external `node_modules` - except for the webpack hot client of your choice - are not included in the build, e.g.:

```js
    externals: nodeExternals({
        whitelist: ['webpack/hot/poll?1000']
    }),
```

Output `libraryTarget` must be set and can be either `'commonjs2'` or `'commonjs'`:

```js
    output: {
        path: path.join(__dirname, 'dist/server'),
        filename: 'index.js',
        libraryTarget: 'commonjs2'
    },
```

Apart from our newly created `serverRunner`, we also have to include the HMR plugin, and `NoErrorsPlugin` to not interrupt the HMR with broken builds:

```js
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoErrorsPlugin(),
        serverRunner
    ]
};
```

Our client configuration object should include `webpack-hot-middleware` with `dynamicPublicPath` for each (named or unnamed) entry:

```js
const client = {
    name: 'client',
    entry: [
        'webpack-hot-middleware/client?dynamicPublicPath=true',
        './client'
    ],
    context: __dirname,
```

For named entries, this will look like

```js
const hotMiddleware = 'webpack-hot-middleware/client?dynamicPublicPath=true';
const client = {
    entry: {
        a: [hotMiddleware, './a'],
        b: [hotMiddleware, './b']
    },
```

`ServerRunnerPlugin` will serve the contents of `output.path` on the path component of `publicPath`. (You cannot use `'/'` because then it will override your server routes.)

```js
    output: {
        path: path.join(__dirname, 'dist/client'),
        publicPath: '/static/'
    },
```

Finally, include a `new serverRunner.StaticFilesPlugin()` and the necessary HMR modules:

```js
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoErrorsPlugin(),
        new serverRunner.StaticFilesPlugin()
    ]
};

module.exports = [server, client];
```

*Please file an [issue](https://github.com/TND/webpack-server-runner-plugin/issues) or create a pull request on GitHub if you had to take additional steps to make your setup working.*


### Run

Now you can build, watch, run your server and serve your client with one command:

    webpack --watch

Please note that this plugin enhences the `webpack` command, not `webpack-dev-server`. `webpack-dev-server` only serves client content.


### Tips for Node-targeted Webpack configuration

These settings are not essential for `ServerRunnerPlugin`.


#### Source maps

In your `server` config, setting a [`devtool`](https://webpack.github.io/docs/configuration.html#devtool) is not enough to get correct source line numbers in stack traces. You can achieve this by using this plugin (just like this entire configuration, you should only use this for development):

    npm install --save-dev source-map-support

```js
const server = {
    ...,
    plugins: [
        ...,
        new webpack.BannerPlugin(
            'require("source-map-support").install();', {
            raw: true,
            entryOnly: false
        })
    ],
    // Enable source map support in your preprocessors too:
    module: {
        loaders: [
            { ..., loaders: ['babel?retainLines=true', 'eslint'] },
            ...
        ]
    },
};
```


#### Using `__dirname` in source files

In your server code, you can use `__dirname` relative to a source file with this option:

```js,
const server = {
    ...,
    node: {
        __dirname: true
    }
};
```


#### Webpack configurations for multiple environments

There are multiple ways to combine the common parts of webpack configurations for different environments (e.g. development, test, acceptation and production). There are NPM packages that make inheritance of configuration objects more easy by providing features for combining arrays. However, you can easily define all configurations in one place without a library, using boolean variables for all environments and `[].filter(Boolean)` to remove all falsy values from the resulting arrays:

```js
    plugins: [
        new webpack.DefinePlugin(globals),
        new webpack.optimize.OccurenceOrderPlugin(),
        new webpack.BannerPlugin(
            'require("source-map-support").install();', {
            raw: true,
            entryOnly: false
        }),
        DEV && new webpack.HotModuleReplacementPlugin(),
        DEV && new webpack.NoErrorsPlugin(),
        DEV && serverRunner
    ].filter(Boolean),
    devtool: DEV ? 'eval' : 'cheap-module-source-map'
```


## How it works

`ServerRunnerPlugin` runs your server code via a `require()` statement to the output file. It modifies your entry module like [`DllPlugin`](https://github.com/webpack/docs/wiki/list-of-plugins#dllplugin) does: it exports the internal `require` function and the entry `module` object to be able to update the server after an HMR module reload of the main module.

You can optionally add more `module.hot.accept()` calls in your server code for other modules. If you don't, all HMR replacements will bubble up to your main module, which will then be accepted by `ServerRunnerPlugin`.

Internally, `ServerRunnerPlugin` dispatches every incoming request between your client files and server routes based on the `output.publicPath` setting in your Webpack client config. The client files are served by an express app.

You can even attach more `StaticFilesPlugin`s (with a different `output.publicPath`) if you have more than one client config.


## License

MIT
