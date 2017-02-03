'use strict';

const RunnerEntryDependency = require('./RunnerEntryDependency');
const SingleEntryDependency = require('webpack/lib/dependencies/SingleEntryDependency');
const RunnerModuleFactory = require('./RunnerModuleFactory');

class RunnerEntryPlugin {
    constructor(context, entries, name) {
        this.context = context;
        this.entries = entries;
        this.name = name;
    }

    apply(compiler) {
        compiler.plugin('compilation', (compilation, params) => {
            const runnerModuleFactory = new RunnerModuleFactory();
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(RunnerEntryDependency, runnerModuleFactory);
            compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
        });

        compiler.plugin('make', (compilation, callback) => {
            compilation.addEntry(this.context, new RunnerEntryDependency(this.entries.map((e, idx) => {
                const dep = new SingleEntryDependency(e);
                dep.loc = `${this.name}:${idx}`;
                return dep;
            }), this.name), this.name, callback);
        });
    }
}

module.exports = RunnerEntryPlugin;
