'use strict';

const Dependency = require('webpack/lib/Dependency');

class RunnerEntryDependency extends Dependency {
    constructor(dependencies, name) {
        super();
        this.dependencies = dependencies;
        this.name = name;
    }

    get type() {
        return 'runner entry';
    }
}

module.exports = RunnerEntryDependency;
