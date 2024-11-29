import type { Config } from 'jest';

const config: Config = 
{
    preset: 'ts-jest',
    roots: ['<rootDir>/tests'],
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    testMatch: ['**/tests/**/*.test.ts'],
    collectCoverage: true,
    coverageProvider: 'v8',
    collectCoverageFrom: ['src/**/*.ts', 'tests/**/*.ts'],
    clearMocks: true,
    testEnvironment: 'node',
    silent: false,
    verbose: true,
    reporters: [`default`]
};

export default config;
