#!/bin/bash
# ============================================================
#  ▶ เปิดระบบ ROS  (ดับเบิลคลิกเพื่อเริ่มทำงาน)
#  เริ่ม: ฐานข้อมูล + API + เว็บลูกค้า + เว็บแอดมิน
#  แล้วเปิดเบราว์เซอร์ให้ทั้ง 2 เว็บอัตโนมัติ
# ============================================================

# ไปที่โฟลเดอร์โปรเจกต์ (โฟลเดอร์แม่ของ "ควบคุมระบบ")
cd "$(dirname "$0")/.." || exit 1
ROOT="$(pwd)"
mkdir -p .run

# ---------- ซิงค์ LAN IP ลงไฟล์ env ก่อนเริ่มเซิร์ฟเวอร์ ----------
# กัน IP ค้างเมื่อ WiFi/DHCP เปลี่ยน → รูป (MEDIA_BASE) + API + CORS ใช้ IP ปัจจุบันเสมอ
# (client-side ใช้ window.location อยู่แล้ว — ส่วนนี้แก้ SSR/CORS ให้ตรง ไม่ให้รูปแตกตอนเปิดบนมือถือ)
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)"
if [ -n "$LAN_IP" ]; then
  for f in apps/web-public/.env.local apps/web-admin/.env.local; do
    # อัปเฉพาะ URL ที่เป็น IP (localhost ไม่ถูกแตะ เพราะ [0-9.]+ ไม่ match ตัวอักษร)
    [ -f "$ROOT/$f" ] && sed -i '' -E "s#http://[0-9]+\.[0-9.]+:4000#http://${LAN_IP}:4000#g" "$ROOT/$f"
  done
  [ -f "$ROOT/apps/api/.env" ] && sed -i '' -E "s#^CORS_ORIGINS=.*#CORS_ORIGINS=\"http://localhost:3000,http://localhost:3001,http://${LAN_IP}:3000,http://${LAN_IP}:3001\"#" "$ROOT/apps/api/.env"
  echo "   • ซิงค์ LAN IP = $LAN_IP ลง env แล้ว"
fi

# เผื่อ node/npm อยู่ใน path เหล่านี้ (nvm/homebrew)
export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:$HOME/.nvm/versions/node/*/bin"

PG_APP="/Users/iiamtikm/Applications/Postgres.app"
PSQL="$PG_APP/Contents/Versions/latest/bin/psql"

echo ""
echo "================================================="
echo "   ▶  กำลังเปิดระบบ ROS ..."
echo "================================================="

# ---------- 0) ฐานข้อมูล (Postgres.app) ----------
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
  if "$PSQL" -U "$USER" -d ros -h /tmp -tAc "SELECT 1" >/dev/null 2>&1; then
    echo "      ✓ ฐานข้อมูลพร้อม"
  else
    echo "      ⚠ เชื่อมฐานข้อมูลไม่ได้ — เปิด Postgres.app เองแล้วลองใหม่"
  fi
fi

# ฟังก์ชันช่วย: สตาร์ท service ถ้ายังไม่รัน (เช็คจาก port)
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
  local name="$1" url="$2"
  for i in $(seq 1 60); do
    curl -s -o /dev/null "$url" && return 0
    sleep 1
  done
  return 1
}

echo ""
echo "[2/4] เริ่ม API (ระบบหลังบ้าน)..."
start_svc "api" 4000 "npm run start:dev -w @ros/api" "$ROOT/.run/api.log"
echo -n "      รอ API พร้อม"
wait_port "api" "http://localhost:4000/api/v1/health" && echo " ✓" || echo " ⚠ (ดู .run/api.log)"

echo ""
echo "[3/4] เริ่มเว็บลูกค้า + เว็บแอดมิน..."
start_svc "web-public" 3000 "npm run dev -w @ros/web-public" "$ROOT/.run/web-public.log"
start_svc "web-admin"  3001 "npm run dev -w @ros/web-admin"  "$ROOT/.run/web-admin.log"
echo -n "      รอเว็บพร้อม (ครั้งแรกอาจนานสักครู่)"
wait_port "web-public" "http://localhost:3000"
wait_port "web-admin"  "http://localhost:3001"
echo " ✓"

echo ""
echo "[4/4] เปิดเบราว์เซอร์..."
sleep 2
open "http://localhost:3000"   # เว็บลูกค้า
open "http://localhost:3001"   # เว็บแอดมิน

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)"

echo ""
echo "================================================="
echo "   ✅ เปิดระบบเรียบร้อย!"
echo ""
echo "   ── บนเครื่องนี้ (Mac) ──"
echo "   เว็บลูกค้า  : http://localhost:3000"
echo "   เว็บแอดมิน : http://localhost:3001"
if [ -n "$LAN_IP" ]; then
echo ""
echo "   ── บนมือถือ/แท็บเล็ต (ต่อ WiFi เดียวกับ Mac) ──"
echo "   เว็บลูกค้า  : http://$LAN_IP:3000"
echo "   เว็บแอดมิน : http://$LAN_IP:3001"
fi
echo ""
echo "   เข้าสู่ระบบแอดมิน : admin@ros.local / ChangeMe!2026"
echo ""
echo "   * ปิดระบบเมื่อเลิกใช้: ดับเบิลคลิก 'ปิดระบบ.command'"
echo "   * หน้าต่างนี้ปิดได้เลย (ระบบทำงานเบื้องหลังต่อ)"
echo "================================================="
echo ""
