#!/bin/bash
# ============================================================
#  ▶ เปิดระบบ ROS สำหรับทดสอบ (3 หน้าต่าง — ไม่ต้องสลับล็อกอิน)
#    1) เว็บแอดมิน  — ล็อกอินเป็น Admin อัตโนมัติ
#    2) เว็บลูกค้า  — หน้าเว็บสาธารณะ
#    3) เว็บแอดมิน  — ล็อกอินเป็น Sales Agent (สิทธิ์ต่ำกว่า) อัตโนมัติ
#  (จอ 1 ใช้ Chrome ปกติ / จอ 3 ใช้ Chrome ไม่ระบุตัวตน = คนละ session)
# ============================================================

cd "$(dirname "$0")/.." || exit 1
ROOT="$(pwd)"
mkdir -p .run
export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:$HOME/.nvm/versions/node/*/bin"

PG_APP="/Users/iiamtikm/Applications/Postgres.app"
PSQL="$PG_APP/Contents/Versions/latest/bin/psql"

echo ""
echo "================================================="
echo "   ▶  เปิดระบบ ROS (โหมดทดสอบ 3 จอ) ..."
echo "================================================="

# ---------- 1) ฐานข้อมูล ----------
echo ""
echo "[1/4] ตรวจฐานข้อมูล..."
if "$PSQL" -U "$USER" -d ros -h /tmp -tAc "SELECT 1" >/dev/null 2>&1; then
  echo "      ✓ ฐานข้อมูลพร้อม"
else
  echo "      • กำลังเปิด Postgres.app..."
  open "$PG_APP" 2>/dev/null
  for i in $(seq 1 30); do
    "$PSQL" -U "$USER" -d ros -h /tmp -tAc "SELECT 1" >/dev/null 2>&1 && break
    sleep 1
  done
  "$PSQL" -U "$USER" -d ros -h /tmp -tAc "SELECT 1" >/dev/null 2>&1 \
    && echo "      ✓ ฐานข้อมูลพร้อม" \
    || echo "      ⚠ เชื่อมฐานข้อมูลไม่ได้ — เปิด Postgres.app เองแล้วลองใหม่"
fi

# ฟังก์ชันช่วย
start_svc () {
  local name="$1" port="$2" cmd="$3" logfile="$4"
  if lsof -ti:"$port" >/dev/null 2>&1; then
    echo "      ✓ $name ทำงานอยู่แล้ว (port $port)"
  else
    echo "      • เริ่ม $name ..."
    ( cd "$ROOT" && eval "$cmd" > "$logfile" 2>&1 & echo $! > ".run/$name.pid" )
  fi
}
wait_port () {
  for i in $(seq 1 60); do curl -s -o /dev/null "$2" && return 0; sleep 1; done; return 1
}

# ---------- 2) API ----------
echo ""
echo "[2/4] เริ่ม API (ระบบหลังบ้าน)..."
start_svc "api" 4000 "npm run start:dev -w @ros/api" "$ROOT/.run/api.log"
echo -n "      รอ API พร้อม"
wait_port "api" "http://localhost:4000/api/v1/health" && echo " ✓" || echo " ⚠ (ดู .run/api.log)"

# ---------- 3) เว็บ ----------
echo ""
echo "[3/4] เริ่มเว็บลูกค้า + เว็บแอดมิน..."
start_svc "web-public" 3000 "npm run dev -w @ros/web-public" "$ROOT/.run/web-public.log"
start_svc "web-admin"  3001 "npm run dev -w @ros/web-admin"  "$ROOT/.run/web-admin.log"
echo -n "      รอเว็บพร้อม (ครั้งแรกอาจนานสักครู่)"
wait_port "web-public" "http://localhost:3000"
wait_port "web-admin"  "http://localhost:3001"
echo " ✓"

# ---------- 4) เปิด 3 หน้าต่าง ----------
echo ""
echo "[4/4] เปิดเบราว์เซอร์ 3 หน้าต่าง..."
sleep 2
ADMIN_URL="http://localhost:3001/login?as=admin"
PUBLIC_URL="http://localhost:3000"
SALES_URL="http://localhost:3001/login?as=sales"
CHROME_APP="/Applications/Google Chrome.app"

if [ -d "$CHROME_APP" ]; then
  open -a "Google Chrome" "$ADMIN_URL";  sleep 1
  open -a "Google Chrome" "$PUBLIC_URL"; sleep 1
  # หน้าต่างไม่ระบุตัวตน = คนละ session → ล็อกอิน Sales ได้พร้อมกับ Admin
  open -na "Google Chrome" --args --incognito "$SALES_URL"
  echo "      ✓ จอ 1 Admin + จอ 2 เว็บลูกค้า (Chrome) | จอ 3 Sales (Chrome ไม่ระบุตัวตน)"
else
  # ไม่มี Chrome → ใช้ Safari สำหรับ Admin+ลูกค้า และ Safari สำหรับ Sales (อาจต้อง logout ก่อน)
  open -a "Safari" "$ADMIN_URL"; open -a "Safari" "$PUBLIC_URL"; open -a "Safari" "$SALES_URL"
  echo "      ⚠ ไม่พบ Chrome — เปิดใน Safari ทั้งหมด (จอ Admin กับ Sales อาจใช้ session เดียวกัน"
  echo "        แนะนำติดตั้ง Chrome เพื่อแยก 2 บัญชีพร้อมกัน)"
fi

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)"
echo ""
echo "================================================="
echo "   ✅ เปิดระบบโหมดทดสอบเรียบร้อย! (3 หน้าต่าง)"
echo ""
echo "   จอ 1  เว็บแอดมิน (Admin สิทธิ์เต็ม)   : $ADMIN_URL"
echo "   จอ 2  เว็บลูกค้า                      : $PUBLIC_URL"
echo "   จอ 3  เว็บแอดมิน (Sales สิทธิ์จำกัด)  : $SALES_URL"
echo ""
echo "   บัญชีที่ล็อกอินอัตโนมัติ:"
echo "     • Admin : admin@ros.local / ChangeMe!2026"
echo "     • Sales : somchai.s@ros.local / Agent!2026"
echo ""
echo "   * บัญชี Sales มาจากข้อมูลทดสอบ (seed) — ถ้าล็อกอินไม่ได้ ให้รันใส่ข้อมูลทดสอบก่อน"
echo "   * ปิดระบบ: ดับเบิลคลิก 'ปิดระบบ.command'"
echo "================================================="
echo ""
