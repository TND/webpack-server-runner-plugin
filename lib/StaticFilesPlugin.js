'use strict';

var url = require('url');
var express = require('express');
var webpackHotMiddleware = require('webpack-hot-middleware');

function StaticFilesPlugin() {
    this.router = express.Router();
}

StaticFilesPlugin.prototype.apply = function (compiler) {
    var path = compiler.options.output.path;
    var publicPath = compiler.options.output.publicPath;
    var route = url.parse(publicPath || '').path.replace(/\/?$/, '/');
    var escaped = route.replace(/\//, '\\/');

    this.router.use(route, webpackHotMiddleware(compiler));
    this.router.use(route, express.static(path));
    this.pattern = new RegExp('^' + escaped);
};

module.exports = StaticFilesPlugin;
