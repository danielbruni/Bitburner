# Tests Directory

This folder contains all test files for the Bitburner strategy system.

## Test Files

### Strategy System Tests

- **`test-strategy-system.js`** - Main integration test for the strategy system
  - Tests basic functionality, manual strategy changes, and automatic recommendations
  - Usage: `run tests/test-strategy-system.js [basic|manual|auto]`

### Development/Debug Tests

- **`comprehensive-test.js`** - Comprehensive Node.js test for all strategy methods

  - Tests all fixed methods: getCurrentStrategy, changeStrategy, getStrategyHistory
  - Usage: `node tests/comprehensive-test.js` (requires Node.js)

- **`test-methods.js`** - Simple method existence test

  - Basic verification that all required methods exist
  - Usage: `node tests/test-methods.js` (requires Node.js)

- **`import-test.js`** - Import verification test
  - Tests that modules can be imported correctly
  - Usage: `node tests/import-test.js` (requires Node.js)

### Existing System Tests

- **`test-process-health.js`** - Process health monitoring tests
- **`test-server-manager.js`** - Server management tests
- **`test-system-integration.js`** - Full system integration tests

## Running Tests in Bitburner

For tests that work in Bitburner (use NetScript API):

```
run tests/test-strategy-system.js
run tests/test-process-health.js
run tests/test-server-manager.js
run tests/test-system-integration.js
```

## Running Tests in Node.js

For development tests that use standard JavaScript:

```
node tests/comprehensive-test.js
node tests/test-methods.js
node tests/import-test.js
```

Note: Node.js tests use mock NetScript APIs and are primarily for development/debugging purposes.
