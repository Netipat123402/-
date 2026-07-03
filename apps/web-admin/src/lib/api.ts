/**
 * API base — เรียกผ่าน host เดียวกับที่เปิดเว็บ (รองรับทดสอบบนมือถือผ่าน LAN IP)
 * เปิดเว็บที่ localhost → API ที่ localhost | เปิดที่ 192.168.x.x → API ที่ IP เดียวกัน
 */
export function apiBase(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4000/api/v1`;
  }
  return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';
}

/** URL รูปทรัพย์ (เสิร์ฟจาก /uploads ของ API) */
export function mediaUrl(storageKey: string): string {
  const host = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : 'http://localhost:4000';
  return `${host}/uploads/${storageKey}`;
}

export interface ApiError {
  status: number;
  code?: string;
  message: string;
  details?: unknown;
}

export interface ApiResult<T> {
  data: T;
  meta?: Record<string, unknown> & {
    total?: number;
    page?: number;
    totalPages?: number;
    unread?: number;
  };
}

/** เรียก API — คืน envelope เต็ม { data, meta }; credentials include สำหรับ refresh cookie */
export async function apiRaw<T = unknown>(
  path: string,
  opts: RequestInit & { token?: string | null } = {},
): Promise<ApiResult<T>> {
  const { token, headers, ...rest } = opts;
  const isForm = rest.body instanceof FormData;
  const res = await fetch(`${apiBase()}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      // ไฟล์อัปโหลด (FormData) ปล่อยให้ browser ตั้ง Content-Type เอง (มี boundary)
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = json?.error ?? { message: 'เกิดข้อผิดพลาด' };
    throw { status: res.status, ...err } as ApiError;
  }
  return { data: json?.data as T, meta: json?.meta };
}

/** อัปโหลดไฟล์ผ่าน XHR เพื่อรายงาน progress (%) — ใช้กับงานยาว เช่น อัปรูป/เอกสาร */
export function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
  opts: { token?: string | null; onProgress?: (pct: number) => void; method?: string } = {},
): Promise<ApiResult<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(opts.method ?? 'POST', `${apiBase()}${path}`);
    xhr.withCredentials = true;
    if (opts.token) xhr.setRequestHeader('Authorization', `Bearer ${opts.token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) opts.onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let json: { data?: T; meta?: ApiResult<T>['meta']; error?: ApiError } | null = null;
      try { json = JSON.parse(xhr.responseText); } catch { /* */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve({ data: json?.data as T, meta: json?.meta });
      else reject({ ...(json?.error ?? { message: 'อัปโหลดไม่สำเร็จ' }), status: xhr.status } as ApiError);
    };
    xhr.onerror = () => reject({ status: 0, message: 'เครือข่ายขัดข้อง' } as ApiError);
    xhr.send(formData);
  });
}
