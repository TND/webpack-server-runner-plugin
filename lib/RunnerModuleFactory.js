'use strict';

var Tapable = require('tapable');
var RunnerModule = require('./RunnerModule');

function RunnerModuleFactory() {
    Tapable.call(this);
}

RunnerModuleFactory.prototype = Object.create(Tapable.prototype);
RunnerModuleFactory.prototype.constructor = RunnerModuleFactory;

RunnerModuleFactory.prototype.create = function (context, dependency, callback) {
    callback(null, new RunnerModule(context, dependency.dependencies, dependency.name, dependency.type));
};

module.exports = RunnerModuleFactory;
