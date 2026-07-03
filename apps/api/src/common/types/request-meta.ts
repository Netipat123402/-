/**
 * ข้อมูลบริบทของ request (IP, user-agent) สำหรับแนบลง audit/activity (MR-28)
 * ย้ายมาจาก property.service เพื่อไม่ให้ ~12 โมดูลผูก import กับ property domain
 */
export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}
