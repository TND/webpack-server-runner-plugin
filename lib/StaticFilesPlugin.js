'use strict';

const url = require('url');
const express = require('express');
const webpackHotMiddleware = require('webpack-hot-middleware');

const prefix = '[ServerRunnerPlugin]';

class StaticFilesPlugin {
    constructor() {
        this.router = express.Router();
    }

    apply(compiler) {
        const path = compiler.options.output.path;
        const publicPath = compiler.options.output.publicPath;

        if (typeof publicPath !== 'string') {
            throw new Error(`${prefix} supply an output.publicPath for your client`);
        }

        const route = url.parse(publicPath).path.replace(/\/?$/, '/');

        if (route.length <= 1) {
            throw new Error(`${prefix} to access your server routes, ` +
                `client output.publicPath cannot be root`);
        }
        const escaped = route.replace(/\//, '\\/');

        this.router.use(route, webpackHotMiddleware(compiler));
        this.router.use(route, express.static(path));
        this.pattern = new RegExp(`^${escaped}`);
    }
}

module.exports = StaticFilesPlugin;
