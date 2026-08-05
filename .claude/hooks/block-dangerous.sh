#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash) — บล็อกเฉพาะคำสั่ง "หายนะย้อนไม่ได้" เท่านั้น
# ปรัชญา: fail-open — ถ้า parse ไม่ได้/ผิดพลาด ให้ปล่อยผ่าน (exit 0) เสมอ
#         บล็อกก็ต่อเมื่อ match pattern หายนะชัด ๆ (exit 2 = Claude Code หยุด tool call)
# แก้ pattern ได้ที่ตัวแปร PATTERNS ด้านล่าง

set -euo pipefail

# อ่าน command จาก stdin JSON ({"tool_input":{"command":"..."}}) — python3 มีติดเครื่อง mac
cmd="$(python3 -c 'import sys,json;
try:
    d=json.load(sys.stdin); print(d.get("tool_input",{}).get("command",""))
except Exception:
    print("")' 2>/dev/null || true)"

# ว่าง/parse ไม่ได้ = ปล่อยผ่าน
[ -z "$cmd" ] && exit 0

# pattern หายนะ (extended regex) — เพิ่มเฉพาะที่ "ย้อนไม่ได้จริง"
PATTERNS='rm[[:space:]]+(-[a-zA-Z]*[rR][a-zA-Z]*[[:space:]]+)+(/|~|/\*|\$HOME)([[:space:]]|$)'
PATTERNS="$PATTERNS"'|:\(\)\{[[:space:]]*:\|:'                       # fork bomb
PATTERNS="$PATTERNS"'|mkfs|dd[[:space:]]+.*of=/dev/'                 # ฟอร์แมต/เขียนทับ disk
PATTERNS="$PATTERNS"'|>[[:space:]]*/dev/sd'                          # เขียนทับ block device
PATTERNS="$PATTERNS"'|DROP[[:space:]]+(DATABASE|SCHEMA)|TRUNCATE'    # ทำลาย DB
PATTERNS="$PATTERNS"'|git[[:space:]]+push[[:space:]]+.*(--force|-f)([[:space:]]|$)' # force push
PATTERNS="$PATTERNS"'|chmod[[:space:]]+-R[[:space:]]+777[[:space:]]+/'

if echo "$cmd" | grep -Eiq "$PATTERNS"; then
  echo "🛑 block-dangerous: คำสั่งนี้เข้าข่ายหายนะย้อนไม่ได้ — ให้เจ้าของรันเองถ้าตั้งใจจริง" >&2
  echo "   command: $cmd" >&2
  exit 2
fi

exit 0
