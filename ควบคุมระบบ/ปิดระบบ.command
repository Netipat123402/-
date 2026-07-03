#!/bin/bash
# ============================================================
#  ■ ปิดระบบ ROS  (ดับเบิลคลิกเพื่อหยุดทำงาน)
#  หยุด: API + เว็บลูกค้า + เว็บแอดมิน
#  (ไม่ปิดฐานข้อมูล Postgres.app — ปิดเองได้จากเมนูบาร์)
# ============================================================

cd "$(dirname "$0")/.." || exit 1
ROOT="$(pwd)"

echo ""
echo "================================================="
echo "   ■  กำลังปิดระบบ ROS ..."
echo "================================================="
echo ""

stop_port () {
  local name="$1" port="$2"
  local pids
  pids="$(lsof -ti:"$port" 2>/dev/null)"
  if [ -n "$pids" ]; then
    echo "   • หยุด $name (port $port)..."
    echo "$pids" | xargs kill 2>/dev/null
    sleep 1
    # ถ้ายังไม่ตาย บังคับปิด
    pids="$(lsof -ti:"$port" 2>/dev/null)"
    [ -n "$pids" ] && echo "$pids" | xargs kill -9 2>/dev/null
    echo "     ✓ ปิดแล้ว"
  else
    echo "   • $name ไม่ได้ทำงานอยู่"
  fi
}

stop_port "เว็บลูกค้า"  3000
stop_port "เว็บแอดมิน" 3001
stop_port "API"        4000

# เก็บกวาด pid files
rm -f "$ROOT/.run/"*.pid 2>/dev/null

echo ""
echo "================================================="
echo "   ✅ ปิดระบบเรียบร้อย"
echo "   (ฐานข้อมูล Postgres.app ยังเปิดอยู่ — ปิดได้จากเมนูบาร์ถ้าต้องการ)"
echo "================================================="
echo ""
