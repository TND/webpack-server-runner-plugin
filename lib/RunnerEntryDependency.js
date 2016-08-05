'use strict';

const Dependency = require('webpack/lib/Dependency');

function RunnerEntryDependency(dependencies, name, type) {
    Dependency.call(this);
    this.dependencies = dependencies;
    this.name = name;
    this.type = type;
}

RunnerEntryDependency.prototype = Object.create(Dependency.prototype);
RunnerEntryDependency.prototype.constructor = RunnerEntryDependency;
RunnerEntryDependency.prototype.type = 'runner entry';

module.exports = RunnerEntryDependency;
