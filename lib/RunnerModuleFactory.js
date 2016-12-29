'use strict';

var Tapable = require('tapable');
var RunnerModule = require('./RunnerModule');

function RunnerModuleFactory() {
    Tapable.call(this);
}

RunnerModuleFactory.prototype = Object.create(Tapable.prototype);
RunnerModuleFactory.prototype.constructor = RunnerModuleFactory;

RunnerModuleFactory.prototype.create = function (data, callback) {
    var dependency = data.dependencies[0];
    callback(null, new RunnerModule(data.context, dependency.dependencies, dependency.name, dependency.type));
};

module.exports = RunnerModuleFactory;
