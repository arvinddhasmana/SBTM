/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  maxWorkers: 2,
  testPathIgnorePatterns: ['<rootDir>/tests/integration/location.test.ts'],
  setupFiles: ['<rootDir>/tests/helpers/setup.ts'],
};