'use strict';

var path = require('path');
var http = require('http');
var colors = require('colors/safe');

var RunnerEntryPlugin = require("./RunnerEntryPlugin");
var StaticFilesPlugin = require('./StaticFilesPlugin');
var StaticServerPlugin = require('./StaticServerPlugin');

var prefix = '[ServerRunnerPlugin] ';

function ServerRunnerPlugin(options) {
    this.port = options.port || process.env.PORT || 3000;
    this.normalizedPort = normalizePort(this.port);

    this.server = http.createServer(this.listen.bind(this));
    this.server.on('error', this.onError);
    this.server.listen(this.normalizedPort);

    this.staticServerPlugin = new StaticServerPlugin(this);
    this.StaticFilesPlugin = this.boundStaticFilesPlugin();
    this.staticFilesPlugins = [];

    function normalizePort(val) {
        var port = parseInt(val, 10);
        return port >= 0 ? port : false;
    }
}

ServerRunnerPlugin.prototype.apply = function (compiler) {
    var options = compiler.options;

    if (['commonjs', 'commonjs2'].indexOf(options.output.libraryTarget) < 0) {
        throwError('supply either "commonjs" or "commonjs2" as ' +
            'output.libraryTarget for your server');
    }

    this.compiler = compiler;
    this.compiler.plugin('entry-option', this.onEntryOption.bind(this));
    this.compiler.plugin('done', function (stats) {
        if (!this.build) {
            this.init();
        }
    }.bind(this));

    compiler.apply(this.staticServerPlugin);
};

ServerRunnerPlugin.prototype.onEntryOption = function (context, entry) {
    var entries = typeof entry === 'string' ? [entry] : entry;

    if (Array.isArray(entries)) {
        this.compiler.apply(new RunnerEntryPlugin(context, entries, 'main'));
        return true;
    }

    throwError('supply an Array or single file as entry');
};

ServerRunnerPlugin.prototype.init = function () {
    var output = this.compiler.options.output;
    var file = path.join(output.path, output.filename || 'main.bundle.js');

    try {
        this.build = require(file);
    } catch (e) {
        return error('Server not loaded: cannot require server build file, ' +
            'please check your config', e);
    }

    this.update();

    if (this.build.module.hot) {
        this.build.module.hot.accept(this.build.mainId, this.update.bind(this));
    }
};

ServerRunnerPlugin.prototype.update = function () {
    var firstTime = !this.app;

    try {
        // use internal require function of Webpack build file, exported by our RunnerModule
        this.app = this.build.require(this.build.mainId);
    } catch (e) {
        return error('Server not loaded: ' +
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
        info('Server listening on port ' + this.normalizedPort);
    } else {
        info('Server reloaded on port ' + this.normalizedPort);
    }
};

ServerRunnerPlugin.prototype.boundStaticFilesPlugin = function () {
    var that = this;

    function BoundStaticFilesPlugin() {
        StaticFilesPlugin.call(this);
        that.staticFilesPlugins.push(this);
        that.staticServerPlugin.app.use(this.router);
    }
    BoundStaticFilesPlugin.prototype = Object.create(StaticFilesPlugin.prototype);

    return BoundStaticFilesPlugin;
};

ServerRunnerPlugin.prototype.listen = function (req, res) {
    if (this.staticFilesPlugins.find(function (plugin) {
        return plugin.pattern.test(req.url);
    })) {
        this.staticServerPlugin.app(req, res);
    } else if (this.app) {
        this.app(req, res);
    } else {
        res.end();
    }
};

ServerRunnerPlugin.prototype.onError = function (error) {
    if (error.syscall !== 'listen') {
        throw error;
    } else if (error.code === 'EACCES') {
        error('Port ' + this.normalizedPort  + ' requires elevated privileges');
        process.exit(1);
    } else if (error.code === 'EADDRINUSE') {
        error('Port ' + this.normalizedPort + ' is already in use');
        process.exit(1);
    } else {
        throw error;
    }
};

module.exports = ServerRunnerPlugin;

function info(str) {
    console.info(colors.green.bold(prefix + str));
}

function error(str, err) {
    console.error(colors.red.bold(prefix + str));
    if (err) {
        console.error(err);
    }
}

function throwError(str) {
    throw new Error(prefix + str);
}
