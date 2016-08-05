'use strict';

const path = require('path');
const url = require('url');
const http = require('http');
const colors = require('colors/safe');
const express = require('express');

const RunnerEntryPlugin = require("./RunnerEntryPlugin");
const StaticFilesPlugin = require('./StaticFilesPlugin');

function WebpackServerRunnerPlugin(options) {
    this.port = options.port || process.env.PORT || 3000;
    this.normalizedPort = normalizePort(this.port);

    this.server = http.createServer(this.listen.bind(this));
    this.server.on('error', this.onError);
    this.server.listen(this.normalizedPort, () => console.info(colors.green.bold(
        `[WebpackServerRunner] Server listening on port ${this.port}`
    )));

    this.StaticFilesPlugin = this.boundStaticFilesPlugin();
    this.staticFilesPlugins = [];
    this.staticServer = express();

    function normalizePort(val) {
        const port = parseInt(val, 10);
        return port >= 0 ? port : false;
    }
}

WebpackServerRunnerPlugin.prototype.listen = function (req, res) {
    if (this.staticFilesPlugins.find(plugin => plugin.pattern.test(req.url))) {
        this.staticServer(req, res);
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
        console.error(colors.red.bold(
            `[WebpackServerRunnerPlugin] Port ${port} requires elevated privileges`
        ));
        process.exit(1);
    } else if (error.code === 'EADDRINUSE') {
        console.error(colors.red.bold(
            `[WebpackServerRunnerPlugin] Port ${port} is already in use`
        ));
        process.exit(1);
    } else {
        throw error;
    }
};

WebpackServerRunnerPlugin.prototype.servePlugin = function () {
    return new ServePlugin(this);
};

WebpackServerRunnerPlugin.prototype.apply = function (compiler) {
    this.compiler = compiler;
    this.compiler.plugin('entry-option', this.onEntryOption.bind(this));
    this.compiler.plugin('done', this.onDone.bind(this));
};

WebpackServerRunnerPlugin.prototype.onEntryOption = function (context, entry) {
    const entries = typeof entry === 'string' ? [entry] : entry;

    if (Array.isArray(entries)) {
        this.compiler.apply(new RunnerEntryPlugin(context, entries, 'main'));
        return true;
    }

    throw new Error(`[WebpackServerRunnerPlugin] supply an Array or single file as entry`);
};

WebpackServerRunnerPlugin.prototype.onDone = function () {
    const { output } = this.compiler.options;
    const file = path.join(output.path, output.filename || 'main.bundle.js');

    this.build = require(file);
    this.update();

    if (this.build.module.hot) {
        this.build.module.hot.accept(this.build.mainId, () => this.update());
    }
};

WebpackServerRunnerPlugin.prototype.update = function () {
    const verb = this.app ? 'reloaded' : 'loaded';

    this.app = this.build.require(this.build.mainId);
    this.app = this.app.default || this.app;

    if (this.app.io) {
        // TODO socketio integratie met http server
    }

    console.info(colors.green.bold(
        `[WebpackServerRunnerPlugin] App ${verb} on port ${this.server.normalizedPort}`
    ));
};

WebpackServerRunnerPlugin.prototype.boundStaticFilesPlugin = function () {
    const that = this;

    function BoundStaticFilesPlugin() {
        StaticFilesPlugin.call(this, that, ...arguments);
    }
    BoundStaticFilesPlugin.prototype = Object.create(StaticFilesPlugin.prototype);

    return BoundStaticFilesPlugin;
};

module.exports = WebpackServerRunnerPlugin;
