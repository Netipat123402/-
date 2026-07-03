#!/usr/bin/env bash
# ============================================================================
# ROS Backup — shared library (sourced by backup.sh / restore.sh / test-restore.sh)
# MR-01 · ป้องกัน data loss ถาวร
#
# หน้าที่:
#   - โหลด config (backup.env ถ้ามี) + ค่า default ที่ปลอดภัยสำหรับ dev (Postgres.app)
#   - หา PostgreSQL client binaries (pg_dump/pg_restore/psql/...) ให้เจอทุกเครื่อง
#   - แปลง DATABASE_URL (รูปแบบ Prisma) → PG* env ที่ libpq เข้าใจ
#   - log helper
# ============================================================================
set -euo pipefail

# ---- โฟลเดอร์อ้างอิง ----------------------------------------------------------
BACKUP_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$BACKUP_LIB_DIR/../.." && pwd)"

# ---- โหลด config (ถ้ามี) ------------------------------------------------------
# ลำดับ override: env ที่ส่งเข้ามา > backup.env > default ด้านล่าง
if [ -f "$BACKUP_LIB_DIR/backup.env" ]; then
  # shellcheck disable=SC1091
  set -a; . "$BACKUP_LIB_DIR/backup.env"; set +a
fi

# ---- ค่า default --------------------------------------------------------------
# ที่เก็บ backup ในเครื่อง (อย่าเก็บใน working dir ที่ติด git/sync — default = ~/ros-backups)
: "${BACKUP_DIR:=$HOME/ros-backups}"
# โฟลเดอร์ไฟล์อัปโหลดจริง (static properties + authed documents)
: "${UPLOADS_DIR:=$PROJECT_ROOT/apps/api/uploads}"
# เก็บ backup กี่วัน (prune อัตโนมัติ)
: "${RETENTION_DAYS:=14}"
# ชื่อ DB เริ่มต้น (dev = Postgres.app)
: "${PGDATABASE:=ros}"

# ---- หา PostgreSQL binaries ---------------------------------------------------
# ใช้ตัวใน PATH ก่อน, ถ้าไม่มีลองที่ Postgres.app / Homebrew
find_pg_bin () {
  local name="$1" p
  if command -v "$name" >/dev/null 2>&1; then command -v "$name"; return 0; fi
  for p in \
    "$HOME/Applications/Postgres.app/Contents/Versions/latest/bin/$name" \
    "/Applications/Postgres.app/Contents/Versions/latest/bin/$name" \
    "/opt/homebrew/bin/$name" \
    "/usr/local/bin/$name" \
    "/usr/bin/$name"; do
    [ -x "$p" ] && { echo "$p"; return 0; }
  done
  return 1
}

PG_DUMP="$(find_pg_bin pg_dump   || true)"
PG_RESTORE="$(find_pg_bin pg_restore || true)"
PSQL="$(find_pg_bin psql       || true)"
CREATEDB="$(find_pg_bin createdb  || true)"
DROPDB="$(find_pg_bin dropdb    || true)"

require_pg_tools () {
  local missing=""
  [ -n "$PG_DUMP" ]    || missing="$missing pg_dump"
  [ -n "$PG_RESTORE" ] || missing="$missing pg_restore"
  [ -n "$PSQL" ]       || missing="$missing psql"
  if [ -n "$missing" ]; then
    echo "ERROR: ไม่พบ PostgreSQL client:$missing — ติดตั้ง Postgres.app หรือ libpq ก่อน" >&2
    exit 1
  fi
}

# ---- แปลง DATABASE_URL (Prisma) → PG* env ------------------------------------
# รองรับ: postgresql://user[:pass]@host[:port]/db?schema=public&host=/tmp&...
# - libpq ไม่รู้จัก query param ของ Prisma (schema, connection_limit) → เราดึงเองแล้ว set PG*
# - ถ้ามี host=/tmp ใน query (Postgres.app unix socket) จะ override host
parse_database_url () {
  local url="${1:-}"
  [ -z "$url" ] && return 0
  local rest userinfo hostport query
  rest="${url#postgresql://}"; rest="${rest#postgres://}"
  # query
  if [[ "$rest" == *\?* ]]; then query="${rest#*\?}"; rest="${rest%%\?*}"; else query=""; fi
  # userinfo @ hostport / db
  if [[ "$rest" == *@* ]]; then userinfo="${rest%%@*}"; rest="${rest#*@}"; else userinfo=""; fi
  hostport="${rest%%/*}"
  local db="${rest#*/}"; [ "$db" = "$rest" ] && db=""

  local user pass host port
  if [[ "$userinfo" == *:* ]]; then user="${userinfo%%:*}"; pass="${userinfo#*:}"; else user="$userinfo"; pass=""; fi
  if [[ "$hostport" == *:* ]]; then host="${hostport%%:*}"; port="${hostport#*:}"; else host="$hostport"; port=""; fi

  # query overrides (เช่น host=/tmp ของ Postgres.app)
  local IFS='&' kv k v
  for kv in $query; do
    k="${kv%%=*}"; v="${kv#*=}"
    case "$k" in
      host) host="$(printf '%b' "${v//%/\\x}")" ;;   # urldecode แบบง่าย
      port) port="$v" ;;
    esac
  done

  [ -n "$user" ] && export PGUSER="$user"
  [ -n "$pass" ] && export PGPASSWORD="$pass"
  [ -n "$host" ] && export PGHOST="$host"
  [ -n "$port" ] && export PGPORT="$port"
  [ -n "$db" ]   && export PGDATABASE="$db"
  return 0
}

# ตั้งค่า connection: ถ้ามี DATABASE_URL ใช้ก่อน, ไม่งั้นใช้ default dev (Postgres.app socket)
init_db_conn () {
  if [ -n "${DATABASE_URL:-}" ]; then
    parse_database_url "$DATABASE_URL"
  fi
  # default dev: Postgres.app ใช้ unix socket /tmp + ผู้ใช้ระบบ + trust auth
  : "${PGHOST:=/tmp}"
  : "${PGUSER:=$USER}"
  : "${PGDATABASE:=ros}"
  export PGHOST PGUSER PGDATABASE
  [ -n "${PGPORT:-}" ] && export PGPORT
  [ -n "${PGPASSWORD:-}" ] && export PGPASSWORD
  return 0
}

log () { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die () { log "ERROR: $*" >&2; exit 1; }
