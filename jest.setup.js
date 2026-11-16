const { createBetterSqliteConnection, setDatabaseConnectionForTesting } = require('./__tests__/helpers/testDatabase');

// Automatically provide an in-memory SQLite database connection for Jest tests
setDatabaseConnectionForTesting(createBetterSqliteConnection(true));
