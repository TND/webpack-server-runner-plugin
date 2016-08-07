'use strict';

var Module = require('webpack/lib/Module');
var RawSource = require('webpack-core/lib/RawSource');

function RunnerModule(context, dependencies, name, type) {
    Module.call(this);
    this.context = context;
    this.dependencies = dependencies;
    this.name = name;
    this.built = false;
    this.cacheable = true;
    this.type = type;
}

RunnerModule.prototype = Object.create(Module.prototype);

RunnerModule.prototype.identifier = function () {
    return 'runner ' + this.name;
};

RunnerModule.prototype.readableIdentifier = function () {
    return 'runner ' + this.name;
};

RunnerModule.prototype.disconnect = function disconnect() {
    this.built = false;
    Module.prototype.disconnect.call(this);
};

RunnerModule.prototype.build = function build(options, compilation, resolver, fs, callback) {
    this.built = true;
    return callback();
};

RunnerModule.prototype.source = function () {
    var main = this.dependencies.slice(-1).pop();
    var otherDependencies = this.dependencies.slice(0, -1);

    return new RawSource([
        otherDependencies.map(function (dep) {
            return dep.module ?
                '__webpack_require__(' + JSON.stringify(dep.module.id) + ');' :
                '(function webpackMissingModule() { throw new Error("' +
                    'Cannot find module ' + dep.request +
                    '"); }());'
        }),
        '',
        'module.exports = {',
        '\tmainId: ' + (main.module ? JSON.stringify(main.module.id) : 'undefined') + ',',
        '\trequire: __webpack_require__,',
        '\tmodule: module',
        '};'
    ].join('\n'));
};

RunnerModule.prototype.needRebuild = function needRebuild() {
    return false;
};

RunnerModule.prototype.size = function () {
    return 16 + this.dependencies.length * 12;
};

RunnerModule.prototype.updateHash = function (hash) {
    hash.update('runner module');
    hash.update(this.name || '');
    Module.prototype.updateHash.call(this, hash);
};

module.exports = RunnerModule;
