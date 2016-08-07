'use strict';

var RunnerEntryDependency = require('./RunnerEntryDependency');
var SingleEntryDependency = require('webpack/lib/dependencies/SingleEntryDependency');
var RunnerModuleFactory = require('./RunnerModuleFactory');

function RunnerEntryPlugin(context, entries, name, type) {
    this.context = context;
    this.entries = entries;
    this.name = name;
    this.type = type;
}

RunnerEntryPlugin.prototype.apply = function (compiler) {
    compiler.plugin('compilation', function (compilation, params) {
        var runnerModuleFactory = new RunnerModuleFactory();
        var normalModuleFactory = params.normalModuleFactory;

        compilation.dependencyFactories.set(RunnerEntryDependency, runnerModuleFactory);
        compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
    });

    compiler.plugin('make', function (compilation, callback) {
        compilation.addEntry(this.context, new RunnerEntryDependency(this.entries.map(function (e, idx) {
            var dep = new SingleEntryDependency(e);
            dep.loc = this.name + ":" + idx;
            return dep;
        }.bind(this), this), this.name, this.type), this.name, callback);
    }.bind(this));
};

module.exports = RunnerEntryPlugin;
