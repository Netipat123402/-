#!/usr/bin/env bash
# ============================================================================
# ROS Backup — สำรองฐานข้อมูล + ไฟล์อัปโหลด (MR-01)
#
# สร้าง backup ลงในโฟลเดอร์ timestamp เดียว:
#   $BACKUP_DIR/ros-YYYYMMDD-HHMMSS/
#     ├── db.dump          pg_dump รูปแบบ custom (-Fc, บีบอัด, ใช้ pg_restore ได้)
#     ├── uploads.tar.gz   ไฟล์ properties + documents ทั้งหมด
#     ├── manifest.txt      เวอร์ชัน, ขนาด, จำนวนแถวต่อบาง core table, checksum
#     └── SHA256SUMS        checksum ของ db.dump + uploads.tar.gz (ไว้ตรวจ integrity)
#
# จากนั้น:
#   - ตรวจ integrity ของ dump (pg_restore --list)
#   - prune backup เก่ากว่า RETENTION_DAYS
#   - (ทางเลือก) push ขึ้น offsite ถ้าตั้ง OFFSITE_* (MinIO/S3 ผ่าน mc/aws, หรือ rsync)
#
# ใช้: ./backup.sh            (อ่าน config จาก backup.env / env / default dev)
# Cron: ดู com.ros.backup.plist (macOS) หรือ crontab ใน README.md
# ============================================================================
set -euo pipefail
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_pg_tools
init_db_conn

TS="$(date '+%Y%m%d-%H%M%S')"
DEST="$BACKUP_DIR/ros-$TS"
mkdir -p "$DEST"

LOG_FILE="$BACKUP_DIR/backup.log"
exec > >(tee -a "$LOG_FILE") 2>&1

log "=== ROS backup เริ่ม → $DEST ==="
log "DB: host=$PGHOST db=$PGDATABASE user=$PGUSER  |  uploads=$UPLOADS_DIR  |  retention=${RETENTION_DAYS}d"

cleanup_on_fail () {
  log "ล้มเหลว — ลบ backup ที่ค้าง: $DEST"
  rm -rf "$DEST"
}
trap 'cleanup_on_fail' ERR

# ---- 1) ฐานข้อมูล (pg_dump custom format) ------------------------------------
log "[1/4] pg_dump → db.dump"
# -Fc = custom (บีบอัด + เลือก restore ทีละ object ได้), --no-owner/--no-privileges = พกพาข้าม role ได้
"$PG_DUMP" -Fc --no-owner --no-privileges -f "$DEST/db.dump"
DB_OK=1

# ---- 2) ไฟล์อัปโหลด ----------------------------------------------------------
if [ -d "$UPLOADS_DIR" ]; then
  log "[2/4] tar uploads → uploads.tar.gz"
  # -C เพื่อให้ใน tar เก็บ path เป็น uploads/... (restore กลับที่เดิมได้ตรง)
  tar -czf "$DEST/uploads.tar.gz" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
else
  log "[2/4] ข้าม uploads — ไม่พบโฟลเดอร์ $UPLOADS_DIR"
fi

# ---- 3) manifest + checksum --------------------------------------------------
log "[3/4] เขียน manifest + SHA256SUMS"
{
  echo "ROS backup manifest"
  echo "created_at      : $(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "hostname        : $(hostname)"
  echo "pg_dump_version : $("$PG_DUMP" --version)"
  echo "database        : $PGDATABASE @ $PGHOST"
  echo "uploads_dir     : $UPLOADS_DIR"
  echo ""
  echo "row counts (core tables):"
  "$PSQL" -d "$PGDATABASE" -tAc "
    SELECT '  ' || rpad(relname, 22) || to_char(n_live_tup, 'FM999,999,999')
    FROM pg_stat_user_tables
    WHERE relname IN ('users','owners','properties','leads','customers',
                      'appointments','contracts','documents','audit_logs','community_posts')
    ORDER BY relname;" 2>/dev/null || echo "  (อ่าน row counts ไม่ได้)"
} > "$DEST/manifest.txt"

( cd "$DEST" && shasum -a 256 db.dump uploads.tar.gz 2>/dev/null > SHA256SUMS || true )

# ---- 4) ตรวจ integrity ของ dump ---------------------------------------------
log "[4/4] ตรวจ integrity (pg_restore --list)"
if "$PG_RESTORE" --list "$DEST/db.dump" >/dev/null 2>&1; then
  log "   ✓ dump อ่านได้ (valid custom-format archive)"
else
  die "dump เสียหาย — pg_restore --list ล้มเหลว"
fi

trap - ERR

DB_SIZE="$(du -h "$DEST/db.dump" 2>/dev/null | cut -f1)"
UP_SIZE="$(du -h "$DEST/uploads.tar.gz" 2>/dev/null | cut -f1 || echo '-')"
log "สำเร็จ: db.dump=$DB_SIZE  uploads.tar.gz=$UP_SIZE"

# ---- prune backup เก่า -------------------------------------------------------
log "prune backup เก่ากว่า ${RETENTION_DAYS} วัน"
find "$BACKUP_DIR" -maxdepth 1 -type d -name 'ros-*' -mtime +"$RETENTION_DAYS" -print -exec rm -rf {} \; || true

# ---- offsite (ทางเลือก) ------------------------------------------------------
# ตั้งค่าใน backup.env เพื่อเปิดใช้งาน:
#   OFFSITE_MODE=mc|aws|rsync   และพารามิเตอร์ที่เกี่ยวข้อง
push_offsite () {
  case "${OFFSITE_MODE:-}" in
    mc)    # MinIO/S3 ผ่าน mc (MR-04): OFFSITE_MC_TARGET เช่น "myminio/ros-backups"
      command -v mc >/dev/null 2>&1 || { log "offsite(mc): ไม่พบ mc — ข้าม"; return 0; }
      log "offsite(mc) → ${OFFSITE_MC_TARGET}/ros-$TS"
      mc cp --recursive "$DEST" "${OFFSITE_MC_TARGET%/}/ros-$TS" ;;
    aws)   # AWS S3 / R2: OFFSITE_S3_URI เช่น "s3://ros-backups"
      command -v aws >/dev/null 2>&1 || { log "offsite(aws): ไม่พบ aws cli — ข้าม"; return 0; }
      log "offsite(aws) → ${OFFSITE_S3_URI}/ros-$TS"
      aws s3 cp --recursive "$DEST" "${OFFSITE_S3_URI%/}/ros-$TS" ;;
    rsync) # เครื่องสำรอง: OFFSITE_RSYNC_TARGET เช่น "user@host:/srv/ros-backups"
      log "offsite(rsync) → ${OFFSITE_RSYNC_TARGET}/ros-$TS"
      rsync -az "$DEST/" "${OFFSITE_RSYNC_TARGET%/}/ros-$TS/" ;;
    ""|none) log "offsite: ปิดอยู่ (ตั้ง OFFSITE_MODE ใน backup.env เพื่อส่งออกนอกเครื่อง — ดู MR-04)" ;;
    *)     log "offsite: OFFSITE_MODE='$OFFSITE_MODE' ไม่รู้จัก — ข้าม" ;;
  esac
}
push_offsite

log "=== ROS backup จบ ==="
