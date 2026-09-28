'use strict';

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    // client-sync es un módulo ESM independiente (type:module) con tooling propio;
    // se excluye del lint CommonJS del backend.
    ignores: ['node_modules/**', 'coverage/**', 'logs/**', 'client-sync/**'],
  },
  js.configs.recommended,
  {
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.jest },
    },
  },
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Los scripts CLI y el bootstrap de configuración escriben directamente en consola;
      // las solicitudes y servicios de la aplicación usan Pino.
      'no-console': 'off',
    },
  },
];
