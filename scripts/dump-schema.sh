#!/usr/bin/env bash
#
# Regenerates db/schema.sql and db/roles.sql from a live Postgres database.
#
# The schema is not otherwise represented in this repo (no ORM, no migrations),
# so these dumps are the source of truth for tables, constraints, indexes,
# grants and — most importantly — the RLS policies that enforce tenant isolation.
#
# Schema only: no table data is ever read or written. Role passwords are excluded.
#
# Usage:
#   npm run db:dump-schema              # dumps the DEV_* database from .env
#   PG_ENV=PROD npm run db:dump-schema  # dumps using PROD_* vars instead
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"
CA_CERT="$REPO_ROOT/src/common/util/ca-certificate.crt"
OUT_DIR="$REPO_ROOT/db"

# Which set of env vars to read: DEV (default) or PROD.
PREFIX="${PG_ENV:-DEV}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found. Connection settings are read from it." >&2
  exit 1
fi

# Read one value from .env without echoing it or sourcing the whole file
# (the file contains a multi-line CA cert that breaks naive sourcing).
getval() {
  grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'\$//"
}

PGHOST="$(getval "${PREFIX}_PGHOST")"
PGDATABASE="$(getval "${PREFIX}_PGDATABASE")"
PGUSER="$(getval "${PREFIX}_PGUSER")"
PGPASSWORD="$(getval "${PREFIX}_PGPASSWORD")"
PGPORT="$(getval PGPORT)"
export PGHOST PGDATABASE PGUSER PGPASSWORD PGPORT

for var in PGHOST PGDATABASE PGUSER PGPASSWORD; do
  if [[ -z "${!var}" ]]; then
    echo "error: ${PREFIX}_${var} is empty or missing in $ENV_FILE" >&2
    exit 1
  fi
done

# Verify the server certificate against DigitalOcean's CA when we have it.
# The cert is gitignored (*.crt), so a fresh clone falls back to encrypted-but-
# unverified; download it from the DO database console to get full verification.
if [[ -f "$CA_CERT" ]]; then
  export PGSSLMODE=verify-full
  export PGSSLROOTCERT="$CA_CERT"
else
  export PGSSLMODE=require
  echo "warning: $CA_CERT not found — connecting with sslmode=require" >&2
  echo "         (encrypted, but the server certificate is NOT verified)." >&2
fi

# postgresql@16 is keg-only on Homebrew and is shadowed by any older install.
# pg_dump must be >= the server major version, so prefer the pinned one.
if [[ -d /opt/homebrew/opt/postgresql@16/bin ]]; then
  PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
fi

server_major="$(psql -Atc 'SHOW server_version_num' | cut -c1-2)"
dump_major="$(pg_dump --version | sed -E 's/.* ([0-9]+)\..*/\1/')"
if (( dump_major < server_major )); then
  echo "error: pg_dump $dump_major is older than server $server_major; it will refuse to dump." >&2
  echo "       Install a matching client: brew install postgresql@${server_major}" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

# Owners, grants and RLS policies are all retained deliberately — they are the
# part of the schema that matters most when reviewing tenant isolation.
echo "Dumping schema from $PGDATABASE (server $server_major, pg_dump $dump_major)..."
pg_dump --schema-only --file "$OUT_DIR/schema.sql"

# pg_dumpall connects to template1 by default, which DigitalOcean rejects;
# -l points it at a database we are actually allowed to open.
echo "Dumping roles..."
pg_dumpall --roles-only --no-role-passwords -l "$PGDATABASE" -f "$OUT_DIR/roles.sql"

echo "Wrote db/schema.sql and db/roles.sql"
echo "Note: the \\restrict token near the top of schema.sql is randomised per run,"
echo "      so those two lines always show as changed in git diff."
