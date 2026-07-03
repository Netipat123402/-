import { ContractStatus } from '@prisma/client';

/**
 * Contract Lifecycle — 3 สถานะ
 *   draft (ร่าง) → active (มีผล) → ended (สิ้นสุด)
 *   "ใกล้ครบกำหนด" = คำนวณจาก endDate (ไม่ใช่สถานะ) | ต่อสัญญา = สร้างฉบับใหม่ status=draft
 */
const T: Record<ContractStatus, ContractStatus[]> = {
  draft: ['active', 'ended'],
  active: ['ended'],
  ended: [],
};

export function canTransitionContract(from: ContractStatus, to: ContractStatus): boolean {
  if (from === to) return false;
  return (T[from] ?? []).includes(to);
}

/**
 * สถานะสัญญาที่ยัง "ครองทรัพย์" อยู่ — ทรัพย์ห้ามมีสัญญาแบบนี้ซ้อนกันเกิน 1 ฉบับ (กันทำสัญญาซ้อน)
 * รวม draft ด้วย — กันสร้างสัญญาฉบับ 2 ตั้งแต่ยังร่าง. ended ไม่นับ — สร้างสัญญาใหม่ได้
 */
export const LIVE_CONTRACT_STATUSES: ContractStatus[] = ['draft', 'active'];

/** สถานะที่ถือว่า "กำลังเช่าอยู่จริง" (สำหรับกัน active ซ้อน) */
export const OCCUPYING_CONTRACT_STATUSES: ContractStatus[] = ['active'];

/** สถานะที่ต่อสัญญา (renew) ได้ */
export const RENEWABLE_CONTRACT_STATUSES: ContractStatus[] = ['active'];

/** มีสัญญาที่ครองทรัพย์อยู่แล้วหรือไม่ (pure — ทดสอบง่าย) */
export function hasLiveContract(statuses: ContractStatus[]): boolean {
  return statuses.some((s) => LIVE_CONTRACT_STATUSES.includes(s));
}
