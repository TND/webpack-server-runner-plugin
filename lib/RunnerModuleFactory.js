'use strict';

const Tapable = require('tapable');
const RunnerModule = require('./RunnerModule');

class RunnerModuleFactory extends Tapable {
    create(data, callback) {
        const dependency = data.dependencies[0];
        callback(null, new RunnerModule(data.context, dependency.dependencies, dependency.name, dependency.type));
    }
}

module.exports = RunnerModuleFactory;
