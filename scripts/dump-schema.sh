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
#   npm run db:dump-schema                     # dumps the DATABASE_URL from .env
#   DATABASE_URL=postgres://... npm run db:dump-schema
#
# DATABASE_URL must be the owning role: the dump has to see every table, policy and
# grant, which a tenant-scoped role cannot.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"
CA_CERT="$REPO_ROOT/src/common/util/ca-certificate.crt"
OUT_DIR="$REPO_ROOT/db"

# Read one value from .env without echoing it or sourcing the whole file
# (the file may contain multi-line values that break naive sourcing).
getval() {
  grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'\$//"
}

# An explicit DATABASE_URL in the environment wins, so a one-off dump of another
# database needs no edit to .env.
if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "error: DATABASE_URL is unset and $ENV_FILE not found." >&2
    exit 1
  fi
  DATABASE_URL="$(getval DATABASE_URL)"
fi

if [[ -z "$DATABASE_URL" ]]; then
  echo "error: DATABASE_URL is empty or missing in $ENV_FILE" >&2
  exit 1
fi

# psql/pg_dump read the database name out of the URL; this is only for log messages.
PGDATABASE="$(basename "${DATABASE_URL%%\?*}")"

# Verify the server certificate against a private CA when one is present. The cert is
# gitignored (*.crt); providers with publicly-trusted certificates need no such file
# and the sslmode in the URL applies instead.
if [[ -f "$CA_CERT" ]]; then
  export PGSSLMODE=verify-full
  export PGSSLROOTCERT="$CA_CERT"
fi

# postgresql@16 is keg-only on Homebrew and is shadowed by any older install.
# pg_dump must be >= the server major version, so prefer the pinned one.
if [[ -d /opt/homebrew/opt/postgresql@16/bin ]]; then
  PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
fi

server_major="$(psql "$DATABASE_URL" -Atc 'SHOW server_version_num' | cut -c1-2)"
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
pg_dump --schema-only --dbname "$DATABASE_URL" --file "$OUT_DIR/schema.sql"

# pg_dumpall connects to template1 by default, which some managed providers reject;
# -d points it at a database we are actually allowed to open.
echo "Dumping roles..."
pg_dumpall --roles-only --no-role-passwords -d "$DATABASE_URL" -f "$OUT_DIR/roles.sql"

echo "Wrote db/schema.sql and db/roles.sql"
echo "Note: the \\restrict token near the top of schema.sql is randomised per run,"
echo "      so those two lines always show as changed in git diff."
