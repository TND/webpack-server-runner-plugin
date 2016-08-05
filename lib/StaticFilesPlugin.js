const path = require('path');
const url = require('url');
const express = require('express');
const webpackHotMiddleware = require('webpack-hot-middleware');

function StaticFilesPlugin(runner) {
    this.runner = runner;
    this.runner.staticFilesPlugins.push(this);
}

StaticFilesPlugin.prototype.apply = function (compiler) {
    const { path, publicPath } = compiler.options.output;
    const route = url.parse(publicPath || '').path.replace(/\/?$/, '/');
    const escaped = route.replace(/\//, '\\/');

    this.runner.staticServer.use(route, webpackHotMiddleware(compiler));
    this.runner.staticServer.use(route, express.static(path));
    this.pattern = new RegExp(`^${escaped}`);
};

module.exports = StaticFilesPlugin;
