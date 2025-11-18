/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/services/BatchAuditService.ts',
    'src/services/CompanyDiscoveryService.ts',
    'src/services/RiskScoringService.ts',
    'src/services/RemediationEngine.ts',
    'src/services/orchestration/CircuitBreaker.ts',
    'src/services/keywordExtractor.ts',
    'src/services/AIService.ts',
  ],
  coverageThreshold: {
    'src/services/RiskScoringService.ts': {
      branches: 95,
      functions: 100,
      lines: 98,
      statements: 98,
    },
    'src/services/RemediationEngine.ts': {
      branches: 85,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    'src/services/orchestration/CircuitBreaker.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
};
