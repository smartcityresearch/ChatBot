module.exports = {
  transform: {
    '^.+\\.js$': ['babel-jest', {
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]]
    }]
  },
  moduleFileExtensions: ['js'],
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/tests/js/setup-env.js'],
  testMatch: [
    '**/tests/js/**/*.test.js'
  ],
  collectCoverageFrom: [
    'static/js/**/*.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage/frontend',
  coverageReporters: ['lcov', 'text', 'cobertura'],
  transformIgnorePatterns: [
    '/node_modules/',
    'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
  ],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/tests/js/mocks/styleMock.js',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/tests/js/mocks/fileMock.js',
    '^https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js$': '<rootDir>/tests/mocks/lit-core.mock.js',
    '^https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js$': '<rootDir>/tests/mocks/chart.mock.js'
  }
};
