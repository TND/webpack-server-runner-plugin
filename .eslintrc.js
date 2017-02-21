'use strict';

module.exports = {
    env: {
        node: true,
        es6: false
    },
    parserOptions: {
        ecmaVersion: 2015,
    },
    extends: 'eslint:recommended',
    rules: {
        'no-console': 'off',
        'no-unused-vars': 'warn'
    }
};
