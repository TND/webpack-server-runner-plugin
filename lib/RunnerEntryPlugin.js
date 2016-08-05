'use strict';

const RunnerEntryDependency = require('./RunnerEntryDependency');
const SingleEntryDependency = require('webpack/lib/dependencies/SingleEntryDependency');
const RunnerModuleFactory = require('./RunnerModuleFactory');

function RunnerEntryPlugin(context, entries, name, type) {
    this.context = context;
    this.entries = entries;
    this.name = name;
    this.type = type;
}

RunnerEntryPlugin.prototype.apply = function (compiler) {
    compiler.plugin('compilation', (compilation, params) => {
        const runnerModuleFactory = new RunnerModuleFactory();
        const normalModuleFactory = params.normalModuleFactory;

        compilation.dependencyFactories.set(RunnerEntryDependency, runnerModuleFactory);
        compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
    });

    compiler.plugin('make', (compilation, callback) => {
        compilation.addEntry(this.context, new RunnerEntryDependency(this.entries.map((e, idx) => {
            const dep = new SingleEntryDependency(e);
            dep.loc = this.name + ":" + idx;
            return dep;
        }, this), this.name, this.type), this.name, callback);
    });
};

module.exports = RunnerEntryPlugin;
