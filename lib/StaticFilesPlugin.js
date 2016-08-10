'use strict';

var url = require('url');
var express = require('express');
var webpackHotMiddleware = require('webpack-hot-middleware');

var prefix = '[ServerRunnerPlugin] ';

function StaticFilesPlugin() {
    this.router = express.Router();
}

StaticFilesPlugin.prototype.apply = function (compiler) {
    var path = compiler.options.output.path;
    var publicPath = compiler.options.output.publicPath;

    if (typeof publicPath !== 'string') {
        throw new Error(prefix + 'supply an output.publicPath for your client');
    }

    var route = url.parse(publicPath).path.replace(/\/?$/, '/');

    if (route.length <= 1) {
        throw new Error(prefix + 'to access your server routes, ' +
            'client output.publicPath cannot be root');
    }
    var escaped = route.replace(/\//, '\\/');

    this.router.use(route, webpackHotMiddleware(compiler));
    this.router.use(route, express.static(path));
    this.pattern = new RegExp('^' + escaped);
};

module.exports = StaticFilesPlugin;
