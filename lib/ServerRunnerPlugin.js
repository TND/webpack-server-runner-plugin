'use strict';

const path = require('path');
const http = require('http');
const colors = require('colors/safe');
const FlagInitialModulesAsUsedPlugin = require('webpack/lib/FlagInitialModulesAsUsedPlugin');
const OpenBrowserPlugin = require('open-browser-webpack-plugin');

const RunnerEntryPlugin = require("./RunnerEntryPlugin");
const StaticFilesPlugin = require('./StaticFilesPlugin');
const StaticServerPlugin = require('./StaticServerPlugin');

const prefix = '[ServerRunnerPlugin]';

const argv = require('minimist')(process.argv.slice(2), {
    boolean: true,
    default: {
        watch: false,
        'env.startserver': false
    }
});
const { NODE_ENV = 'development' } = process.env;

// optional TODOs
// v start browser (with option 'open')
// - accept entry object with one entry, and with multiple in combination
//   with option 'serverEntry'
// - also log server requests with morgan?
// - test hot reload more thoroughly
// - test framework run on watch with some options?
// - automatically add all hot reload features from plugin
// - clean up documentation
// - functional test to test with different webpack versions

class ServerRunnerPlugin {
    constructor(options = {}) {
        this.options = {
            host: options.host || 'http://localhost',
            port: normalizePort(options.port || process.env.PORT || 8080),
            open: options.open || false
        };

        if (argv.env.startserver) {
            this.server = http.createServer(this.listen.bind(this));
            this.server.on('error', this.onError);
            this.server.listen(this.options.port);
        } else if (NODE_ENV === 'development') {
            logInfo('Server not started (use webpack --watch --env.startserver)');
        }

        this.staticServerPlugin = new StaticServerPlugin(this);
        this.StaticFilesPlugin = this.boundStaticFilesPlugin();
        this.staticFilesPlugins = [];

        function normalizePort(val) {
            const port = parseInt(val, 10);
            return port >= 0 ? port : false;
        }
    }

    apply(compiler) {
        if (!argv.env.startserver) {
            return;
        }

        const options = compiler.options;

        if (['commonjs', 'commonjs2'].indexOf(options.output.libraryTarget) < 0) {
            throwError('supply either "commonjs" or "commonjs2" as ' +
                'output.libraryTarget for your server');
        }

        this.compiler = compiler;

        this.compiler.plugin('entry-option', this.onEntryOption.bind(this));
        this.compiler.plugin('done', (stats) => {
            if (!this.build) {
                this.init();
            }
        });

        this.compiler.apply(this.staticServerPlugin);

        if (this.options.open) {
            this.compiler.apply(new OpenBrowserPlugin({
                url: `${this.options.host}:${this.options.port}`
            }));
        }

        this.compiler.apply(new FlagInitialModulesAsUsedPlugin());
    }

    onEntryOption(context, entry) {
        const entries = typeof entry === 'string' ? [entry] : entry;

        if (Array.isArray(entries)) {
            this.compiler.apply(new RunnerEntryPlugin(context, entries, 'main'));
            return true;
        }

        throwError('supply an Array or single file as entry');
    }

    init() {
        const output = this.compiler.options.output;
        const file = path.join(output.path, output.filename || 'main.bundle.js');

        try {
            this.build = require(file);
        } catch (e) {
            return logError('Server not loaded: cannot require server build file, ' +
                'please check your config', e);
        }

        this.update();

        if (argv.watch && this.build.module.hot) {
            console.log('HOT');
            this.build.module.hot.accept(this.build.mainId, this.update.bind(this));
        }
    }

    update() {
        const firstTime = !this.app;

        try {
            // use internal require function of Webpack build file, exported by our RunnerModule
            this.app = this.build.require(this.build.mainId);
        } catch (e) {
            return logError('Server not loaded: ' +
                'cannot require main module from your server build file, ' +
                'please check your config', e);
        }

        // app may be an es6 module object
        this.app = this.app.default || this.app;

        // Socket.io object may be available
        if (this.app.io) {
            // TODO socketio integration with http server
        }

        // app may be a Koa instance
        this.app = this.app.callback ? this.app.callback() : this.app;

        if (firstTime) {
            logInfo(`Server listening on port ${this.options.port}`);
        } else {
            logInfo(`Server reloaded on port ${this.options.port}`);
        }
    }

    boundStaticFilesPlugin() {
        const serverRunner = this;

        return class BoundStaticFilesPlugin extends StaticFilesPlugin {
            constructor() {
                super();
                serverRunner.staticFilesPlugins.push(this);
                serverRunner.staticServerPlugin.app.use(this.router);
            }
        };
    }

    listen(req, res) {
        if (this.staticFilesPlugins.find((plugin) =>
            plugin.pattern.test(req.url)
        )) {
            this.staticServerPlugin.app(req, res);
        } else if (this.app) {
            this.app(req, res);
        } else {
            // TODO error message in browser: why it went wrong
            res.end();
        }
    }

    onError(error) {
        if (error.syscall !== 'listen') {
            throw error;
        } else if (error.code === 'EACCES') {
            logError(`Port ${this.options.port} requires elevated privileges`);
            process.exit(1);
        } else if (error.code === 'EADDRINUSE') {
            logError(`Port ${this.options.port} is already in use`);
            process.exit(1);
        } else {
            throw error;
        }
    }
}

module.exports = ServerRunnerPlugin;

function logInfo(str) {
    // timeout to add info to console after webpack build report
    setTimeout(() => {
        console.info(colors.green.bold(`\n${prefix} ${str}\n`));
    });
}

function logError(str, err) {
    setTimeout(() => {
        console.error(colors.red.bold(`\n${prefix} ${str}\n`));
        if (err) {
            console.error(`${err}\n`);
        }
    });
}

function throwError(str) {
    throw new Error(`${prefix} ${str}`);
}
