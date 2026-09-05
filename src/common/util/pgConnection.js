/*
 * Connection helpers shared by the application's pools (config.js) and the database
 * scripts under db/. Pure functions of the environment, with no dependency on the
 * application config, which validates variables the scripts do not need and refuses
 * to load without them.
 */
const fs = require('fs');

// TLS for every connection:
//   require    encrypt and verify the server certificate against Node's bundled CA
//              store; correct for managed providers with publicly trusted certs.
//   verify-ca  encrypt and verify against a private CA, supplied by path
//              (PGSSL_CA_FILE) or inline (PGSSL_CA). A PEM does not survive a .env
//              round-trip, since dotenv cannot hold a raw multi-line value, so the
//              path is the practical choice locally.
//   disable    plain TCP, for a local Postgres only.
const buildSslOptions = () => {
  const mode = process.env.PGSSL_MODE || 'require';
  if (mode === 'disable') return false;
  if (mode === 'verify-ca') {
    const ca = process.env.PGSSL_CA_FILE
      ? fs.readFileSync(process.env.PGSSL_CA_FILE, 'utf8')
      : process.env.PGSSL_CA;
    // Fail loudly rather than fall back to the public trust store: a half-configured
    // CA is how certificate verification quietly stops happening.
    if (!ca || !ca.includes('BEGIN CERTIFICATE')) {
      throw new Error(
        'PGSSL_MODE=verify-ca but no usable certificate was found in PGSSL_CA_FILE or PGSSL_CA.',
      );
    }
    return { rejectUnauthorized: true, ca };
  }
  return { rejectUnauthorized: true };
};

// pg-connection-string maps an `sslmode` query parameter onto its own ssl config, and
// that mapping overrides the `ssl` option passed alongside connectionString. Strip it
// so TLS is decided in exactly one place, PGSSL_MODE. Provider-issued URLs routinely
// carry ?sslmode=require.
const stripSslParams = (connectionString) => {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('ssl');
    return url.toString();
  } catch (error) {
    // Not a parseable URL: hand it to pg unchanged and let pg report the problem.
    return connectionString;
  }
};

// Role, host and database a connection string points at, with the password dropped,
// so it is safe to log.
const describeTarget = (connectionString) => {
  try {
    const url = new URL(connectionString);
    return `${url.username}@${url.hostname}${url.pathname}`;
  } catch (error) {
    return 'unparseable connection string';
  }
};

module.exports = { buildSslOptions, stripSslParams, describeTarget };
