module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleFileExtensions: ['js'],
  // Use specific test files in tests/js
  testMatch: [
    '**/tests/js/**/*.test.js'
  ],
  // Collect coverage from application code, not test code
  collectCoverageFrom: [
    'static/js/**/*.js',
    '!**/node_modules/**'
  ],
  // Output coverage to a separate directory
  coverageDirectory: 'coverage/frontend',
  coverageReporters: ['lcov', 'text', 'cobertura'],
  // Transform ignore patterns (important for ES modules)
  transformIgnorePatterns: [
    '/node_modules/',
    'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
  ],
  // Mock non-JS module imports
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/tests/js/mocks/styleMock.js',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/tests/js/mocks/fileMock.js',
    '^https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js$': '<rootDir>/tests/mocks/lit-core.mock.js',
    '^https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js$': '<rootDir>/tests/mocks/chart.mock.js',
    'https://cdn\\.jsdelivr\\.net/.*': '<rootDir>/tests/js/mocks/litMock.js',
    'https://cdn\\.jsdelivr\\.net/npm/chart\\.js.*': '<rootDir>/tests/js/mocks/chartJsMock.js',
  },
  // Setup file
  setupFiles: ['<rootDir>/tests/js/setup-env.js'],
  // Skip certain test files
  testPathIgnorePatterns: ['/node_modules/'],
  // Variables to be available in the node environment
  globals: {
    JEST_ENVIRONMENT: true
  },
  // Test timeout
  testTimeout: 10000
};
