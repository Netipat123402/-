#!/usr/bin/env bash
# ============================================================================
# ROS Restore — กู้คืนฐานข้อมูล + ไฟล์อัปโหลด จาก backup (MR-01)
#
# ใช้:
#   ./restore.sh <backup-dir> [--db <dbname>] [--uploads <dir>] [--yes]
#
#   <backup-dir>   โฟลเดอร์ backup เช่น  ~/ros-backups/ros-20260622-1700
#   --db NAME      restore DB ลงฐานชื่อ NAME (default = PGDATABASE/ros)
#   --uploads DIR  คลายไฟล์ uploads ลง DIR (default = UPLOADS_DIR)
#   --yes          ไม่ถามยืนยัน (ใช้ใน script/test)
#
# ⚠️ การ restore DB จะ DROP object เดิมที่ชนกัน (pg_restore --clean) — ระวังกับฐาน production
# ============================================================================
set -euo pipefail
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_pg_tools
init_db_conn

SRC=""; TARGET_DB="${PGDATABASE}"; TARGET_UPLOADS="$UPLOADS_DIR"; ASSUME_YES=0
while [ $# -gt 0 ]; do
  case "$1" in
    --db)      TARGET_DB="$2"; shift 2 ;;
    --uploads) TARGET_UPLOADS="$2"; shift 2 ;;
    --yes|-y)  ASSUME_YES=1; shift ;;
    -*)        die "ไม่รู้จัก option: $1" ;;
    *)         SRC="$1"; shift ;;
  esac
done

[ -n "$SRC" ] || die "ต้องระบุโฟลเดอร์ backup — ดู: ./restore.sh <backup-dir>"
[ -d "$SRC" ] || die "ไม่พบโฟลเดอร์ backup: $SRC"
[ -f "$SRC/db.dump" ] || die "ไม่พบ $SRC/db.dump"

# ตรวจ checksum ถ้ามี
if [ -f "$SRC/SHA256SUMS" ]; then
  log "ตรวจ checksum..."
  ( cd "$SRC" && shasum -a 256 -c SHA256SUMS ) || die "checksum ไม่ตรง — backup อาจเสียหาย"
fi

log "จะ restore:"
log "  จาก     : $SRC"
log "  → DB    : $TARGET_DB (host=$PGHOST user=$PGUSER)"
log "  → uploads: $TARGET_UPLOADS"
if [ "$ASSUME_YES" -ne 1 ]; then
  printf '⚠️  จะเขียนทับข้อมูลในฐาน "%s" — พิมพ์ "yes" เพื่อยืนยัน: ' "$TARGET_DB"
  read -r ans; [ "$ans" = "yes" ] || die "ยกเลิก"
fi

# ---- 1) สร้างฐานถ้ายังไม่มี ---------------------------------------------------
if ! "$PSQL" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$TARGET_DB'" | grep -q 1; then
  log "สร้างฐานข้อมูล $TARGET_DB"
  "$CREATEDB" "$TARGET_DB"
fi

# ---- 2) restore DB -----------------------------------------------------------
log "[1/2] pg_restore → $TARGET_DB"
# --clean --if-exists = ลบ object เดิมก่อนสร้างใหม่ (idempotent), --no-owner = ไม่ผูก role เดิม
"$PG_RESTORE" --clean --if-exists --no-owner --no-privileges \
  -d "$TARGET_DB" "$SRC/db.dump" || log "pg_restore เตือน (อาจเป็น object ที่ไม่มีให้ลบ — ปกติ)"

# ---- 3) restore uploads ------------------------------------------------------
if [ -f "$SRC/uploads.tar.gz" ]; then
  log "[2/2] คลาย uploads → $(dirname "$TARGET_UPLOADS")"
  mkdir -p "$(dirname "$TARGET_UPLOADS")"
  tar -xzf "$SRC/uploads.tar.gz" -C "$(dirname "$TARGET_UPLOADS")"
else
  log "[2/2] ข้าม uploads — ไม่มี uploads.tar.gz ใน backup"
fi

log "=== restore สำเร็จ ==="
