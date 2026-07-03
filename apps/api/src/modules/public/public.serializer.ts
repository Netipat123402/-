import type { Property, PropertyMedia } from '@prisma/client';

type PropertyWithMedia = Property & { media?: PropertyMedia[] };

/**
 * แปลง Property → public shape (Phase 7 — Response DTO แยก)
 * ตัดข้อมูลภายในออก: ownerId, assignedToId, createdBy, branchId, audit cols ฯลฯ
 */
export function toPublicProperty(p: PropertyWithMedia) {
  const media = (p.media ?? [])
    .filter((m) => !m.deletedAt)
    .sort((a, b) => (a.isCover === b.isCover ? a.sortOrder - b.sortOrder : a.isCover ? -1 : 1))
    .map((m) => ({ type: m.mediaType, url: m.storageKey, isCover: m.isCover }));

  return {
    id: p.id,
    code: p.code,
    type: p.propertyType,
    // ไม่คืน status — public เห็นเฉพาะทรัพย์ available อยู่แล้ว (กันข้อมูลภายในรั่ว)
    title: { th: p.titleTh, en: p.titleEn },
    description: { th: p.descriptionTh, en: p.descriptionEn },
    location: {
      province: p.province,
      district: p.district,
      subdistrict: p.subdistrict,
      projectName: p.projectName,
      lat: p.latitude ? Number(p.latitude) : null,
      lng: p.longitude ? Number(p.longitude) : null,
    },
    monthlyRent: Number(p.monthlyRent),
    depositMonths: p.depositMonths,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    areaSqm: p.areaSqm ? Number(p.areaSqm) : null,
    floor: p.floor,
    furnished: p.furnished,
    amenities: p.amenities ?? {},
    media,
    publishedAt: p.publishedAt,
  };
}

/** การ์ดสำหรับหน้า list (เบากว่า) */
export function toPublicCard(p: PropertyWithMedia) {
  // เรียงรูป: ปกขึ้นก่อน แล้วตาม sortOrder — ใช้ทั้ง cover และ image carousel ในการ์ด
  const sorted = (p.media ?? [])
    .filter((m) => !m.deletedAt && m.mediaType === 'image')
    .sort((a, b) => (a.isCover === b.isCover ? a.sortOrder - b.sortOrder : a.isCover ? -1 : 1));
  const images = sorted.map((m) => m.storageKey);
  const am = (p.amenities ?? {}) as Record<string, boolean>;
  return {
    id: p.id,
    code: p.code,
    type: p.propertyType,
    title: { th: p.titleTh, en: p.titleEn },
    province: p.province,
    district: p.district,
    projectName: p.projectName,
    monthlyRent: Number(p.monthlyRent),
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    areaSqm: p.areaSqm ? Number(p.areaSqm) : null,
    coverImage: images[0] ?? null,
    images, // รูปทั้งหมดสำหรับ carousel ในการ์ด
    nearTransit: !!(am.near_bts || am.near_mrt || am.near_airport_link), // ใกล้รถไฟฟ้า
    petFriendly: !!am.pet_friendly, // เลี้ยงสัตว์ได้
  };
}
