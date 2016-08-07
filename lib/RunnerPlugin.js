'use strict';

var path = require('path');
var http = require('http');
var colors = require('colors/safe');

var RunnerEntryPlugin = require("./RunnerEntryPlugin");
var StaticFilesPlugin = require('./StaticFilesPlugin');
var StaticServerPlugin = require('./StaticServerPlugin');

var prefix = '[WebpackServerRunnerPlugin]';

function WebpackServerRunnerPlugin(options) {
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

WebpackServerRunnerPlugin.prototype.apply = function (compiler) {
    this.compiler = compiler;
    this.compiler.plugin('entry-option', this.onEntryOption.bind(this));
    this.compiler.plugin('done', function () {
        if (!this.app) {
            this.init();
        }
    }.bind(this));

    compiler.apply(this.staticServerPlugin);
};

WebpackServerRunnerPlugin.prototype.listen = function (req, res) {
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

WebpackServerRunnerPlugin.prototype.onError = function (error) {
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

WebpackServerRunnerPlugin.prototype.onEntryOption = function (context, entry) {
    var entries = typeof entry === 'string' ? [entry] : entry;

    if (Array.isArray(entries)) {
        this.compiler.apply(new RunnerEntryPlugin(context, entries, 'main'));
        return true;
    }

    throw new Error(prefix + ' supply an Array or single file as entry');
};

WebpackServerRunnerPlugin.prototype.init = function () {
    var output = this.compiler.options.output;
    var file = path.join(output.path, output.filename || 'main.bundle.js');

    this.build = require(file);
    this.update();

    if (this.build.module.hot) {
        this.build.module.hot.accept(this.build.mainId, this.update.bind(this));
    }
};

WebpackServerRunnerPlugin.prototype.update = function () {
    var firstTime = !this.app;

    this.app = this.build.require(this.build.mainId);
    this.app = this.app.default || this.app;

    if (this.app.io) {
        // TODO socketio integratie met http server
    }

    this.app = this.app.callback && this.app.callback() || this.app;

    if (firstTime) {
        info('Server listening on port ' + this.normalizedPort);
    } else {
        info('Server reloaded on port ' + this.normalizedPort);
    }
};

WebpackServerRunnerPlugin.prototype.boundStaticFilesPlugin = function () {
    var that = this;

    function BoundStaticFilesPlugin() {
        StaticFilesPlugin.call(this, that);
        that.staticFilesPlugins.push(this);
        that.staticServerPlugin.app.use(this.router);
    }
    BoundStaticFilesPlugin.prototype = Object.create(StaticFilesPlugin.prototype);

    return BoundStaticFilesPlugin;
};

module.exports = WebpackServerRunnerPlugin;

function info(str) {
    return console.info(colors.green.bold(prefix + ' ' + str));
}

function error(str) {
    return console.error(colors.red.bold(prefix + ' ' + str));
}
