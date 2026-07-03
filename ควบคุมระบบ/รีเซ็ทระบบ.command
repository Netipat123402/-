#!/bin/bash
# ============================================================
#  ↻ รีเซ็ทระบบ ROS  (ดับเบิลคลิก)
#  ล้างข้อมูลทั้งหมด แล้วสร้างใหม่ (ตาราง + ข้อมูลตั้งต้น)
#  ** ข้อมูลที่มีอยู่จะหายทั้งหมด — มีให้ยืนยันก่อน **
# ============================================================

cd "$(dirname "$0")/.." || exit 1
ROOT="$(pwd)"
export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin"

PG_APP="/Users/iiamtikm/Applications/Postgres.app"
PSQL="$PG_APP/Contents/Versions/latest/bin/psql"
URL="postgresql://$USER@localhost:5432/ros?host=/tmp"

echo ""
echo "================================================="
echo "   ↻  รีเซ็ทระบบ ROS"
echo "================================================="
echo ""
echo "   ⚠️  คำเตือน: ข้อมูลทั้งหมดจะถูกลบ"
echo "      (ทรัพย์ / Lead / เจ้าของ / นัด / สัญญา / เอกสาร)"
echo "      แล้วสร้างใหม่พร้อมข้อมูลตั้งต้น (roles, ผู้ดูแล, master data)"
echo ""
read -p "   พิมพ์  yes  เพื่อยืนยัน (อย่างอื่น = ยกเลิก): " ANS

if [ "$ANS" != "yes" ]; then
  echo ""
  echo "   ยกเลิกแล้ว — ไม่มีอะไรเปลี่ยนแปลง"
  echo ""
  read -p "   กด Enter เพื่อปิด..." _
  exit 0
fi

echo ""
echo "   • ตรวจฐานข้อมูล..."
if ! "$PSQL" "$URL" -tAc "SELECT 1" >/dev/null 2>&1; then
  echo "     กำลังเปิด Postgres.app..."
  open "$PG_APP" 2>/dev/null
  for i in $(seq 1 30); do "$PSQL" "$URL" -tAc "SELECT 1" >/dev/null 2>&1 && break; sleep 1; done
fi

echo "   • ล้าง + สร้างตารางใหม่ + ใส่ข้อมูลตั้งต้น..."
( cd "$ROOT/db" && npx prisma migrate reset --force --skip-generate )

if [ $? -ne 0 ]; then
  echo ""
  echo "   ❌ รีเซ็ตไม่สำเร็จ — ดูข้อความด้านบน"
  read -p "   กด Enter เพื่อปิด..." _
  exit 1
fi

echo "   • ใส่ index ขั้นสูง + ตั้งค่าความปลอดภัย audit..."
"$PSQL" "$URL" -f "$ROOT/db/prisma/sql/advanced-indexes.sql" >/dev/null 2>&1
"$PSQL" "$URL" -f "$ROOT/db/prisma/sql/audit-immutable.sql" >/dev/null 2>&1

# รีสตาร์ท API ถ้ารันอยู่ — จำเป็น! หลัง reset ตารางถูกสร้างใหม่ ทำให้ Prisma ที่รันอยู่
# ใช้ cached plan ของตารางเก่า → error "cached plan must not change result type" (500 ทุก query)
# refresh หน้าเว็บไม่ช่วย เพราะเป็นฝั่ง API → ต้องรีสตาร์ท API ให้เชื่อมฐานข้อมูลใหม่
if lsof -ti:4000 >/dev/null 2>&1; then
  echo "   • รีสตาร์ท API (ให้เชื่อมฐานข้อมูลใหม่)..."
  lsof -ti:4000 | xargs kill 2>/dev/null; sleep 2
  ( cd "$ROOT" && npm run start:dev -w @ros/api > "$ROOT/.run/api.log" 2>&1 & echo $! > "$ROOT/.run/api.pid" )
  for i in $(seq 1 40); do curl -s -o /dev/null "http://localhost:4000/api/v1/health" 2>/dev/null && break; sleep 1; done
  echo "     ✓ API พร้อม"
fi

echo ""
echo "================================================="
echo "   ✅ รีเซ็ทระบบเรียบร้อย!"
echo ""
echo "   ผู้ดูแลระบบ: admin@ros.local / ChangeMe!2026"
echo "   * ถ้าเปิดเว็บไว้ ให้รีเฟรชหน้าเว็บ (API รีสตาร์ทให้แล้ว)"
echo "================================================="
echo ""
read -p "   กด Enter เพื่อปิด..." _
