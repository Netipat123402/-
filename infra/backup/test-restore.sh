#!/usr/bin/env bash
# ============================================================================
# ROS Backup — ทดสอบ restore อัตโนมัติ (MR-01 acceptance)
#
# พิสูจน์ว่า backup กู้คืนได้จริงและข้อมูลครบ:
#   1) เลือก backup ล่าสุด (หรือรับ path เป็น arg)
#   2) restore ลงฐานข้อมูล "เปล่า" ชื่อชั่วคราว (ros_restore_test_<ts>)
#   3) เทียบจำนวนแถวของ core tables: ต้นฉบับ (PGDATABASE) == ฐานที่ restore
#   4) ลบฐานชั่วคราวทิ้ง
#
# exit 0 = ผ่าน, exit 1 = ไม่ผ่าน  → ใช้เป็น CI/cron health check ได้
#
# ใช้: ./test-restore.sh [backup-dir]
# ============================================================================
set -euo pipefail
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_pg_tools
init_db_conn

SRC="${1:-}"
if [ -z "$SRC" ]; then
  SRC="$(find "$BACKUP_DIR" -maxdepth 1 -type d -name 'ros-*' | sort | tail -n1 || true)"
  [ -n "$SRC" ] || die "ไม่พบ backup ใน $BACKUP_DIR — รัน ./backup.sh ก่อน"
fi
[ -f "$SRC/db.dump" ] || die "ไม่พบ $SRC/db.dump"

SOURCE_DB="$PGDATABASE"
TEST_DB="ros_restore_test_$(date '+%Y%m%d%H%M%S')"

log "=== ทดสอบ restore ==="
log "backup     : $SRC"
log "source DB  : $SOURCE_DB"
log "scratch DB : $TEST_DB (จะถูกลบเมื่อจบ)"

cleanup () { "$DROPDB" --if-exists "$TEST_DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

# restore ลงฐานเปล่า (ไม่ถาม, ไม่แตะ uploads/ ของจริง)
"$CREATEDB" "$TEST_DB"
"$(dirname "${BASH_SOURCE[0]}")/restore.sh" "$SRC" --db "$TEST_DB" --uploads "/tmp/ros-restore-test-uploads-$$" --yes >/dev/null
rm -rf "/tmp/ros-restore-test-uploads-$$" 2>/dev/null || true

# เทียบ row count ของ core tables
TABLES="users owners properties leads customers appointments contracts documents audit_logs community_posts"
log "เทียบจำนวนแถว (source vs restored):"
FAIL=0
for t in $TABLES; do
  src_n="$("$PSQL" -d "$SOURCE_DB" -tAc "SELECT count(*) FROM \"$t\"" 2>/dev/null || echo "ERR")"
  res_n="$("$PSQL" -d "$TEST_DB"   -tAc "SELECT count(*) FROM \"$t\"" 2>/dev/null || echo "ERR")"
  if [ "$src_n" = "$res_n" ] && [ "$src_n" != "ERR" ]; then
    printf '  ✓ %-16s %s\n' "$t" "$src_n"
  else
    printf '  ✗ %-16s source=%s restored=%s\n' "$t" "$src_n" "$res_n"
    FAIL=1
  fi
done

# ตรวจว่า audit immutable trigger ติดมาด้วย (โครงสร้างครบ ไม่ใช่แค่ข้อมูล)
TRG="$("$PSQL" -d "$TEST_DB" -tAc "SELECT count(*) FROM pg_trigger WHERE tgname LIKE '%audit%' AND NOT tgisinternal" 2>/dev/null || echo 0)"
log "audit triggers ในฐานที่ restore: $TRG"

if [ "$FAIL" -eq 0 ]; then
  log "=== ✅ ผ่าน — restore สำเร็จและข้อมูลครบ ==="
  exit 0
else
  log "=== ❌ ไม่ผ่าน — จำนวนแถวไม่ตรง ==="
  exit 1
fi
