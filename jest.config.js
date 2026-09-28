'use strict';

/**
 * Las unitarias son el modo predeterminado. Las integraciones sólo se incluyen
 * cuando el script test:integration declara explícitamente que MySQL es
 * obligatorio; una conexión fallida hace fallar la corrida.
 */
const ejecutarIntegracion = process.env.RUN_MYSQL_INTEGRATION === 'true';

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  testPathIgnorePatterns: [
    ejecutarIntegracion ? '<rootDir>/tests/unit/' : '<rootDir>/tests/integration/',
  ],
  coverageDirectory: 'coverage',
  clearMocks: true,
  testTimeout: 15000,
};
