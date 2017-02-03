'use strict';

const express = require('express');
const logger = require('morgan');

class StaticServerPlugin {
    constructor() {
        this.app = express();
        this.app.use(logger('dev'));
    }

    apply() {
        // All StaticFilesPlugin must have been registered by now
        this.app.use(set404);
        this.app.use(error);
    }
}

function set404(req, res, next) {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
}

function error(err, req, res, next) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';

    res.status(status);
    res.send(`
        <html>
            <head>
                <title>${status} ${message}</title>
            </head>
            <body>
                <h1>${status} ${message}</h1>
                <p>
                    This error is thrown by WebpackServerRunnerPlugin. This path
                    corresponds to one of StaticFilesPlugin's output.publicPath
                    in your Webpack config, but the resource does not exist in the
                    corresponding output.path directory or something else went
                    wrong.
                </p>
            </body>
        </html>`
    );
}

module.exports = StaticServerPlugin;
