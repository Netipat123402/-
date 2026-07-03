-- เพิ่ม 'lead' ใน entity_type enum (สำหรับ activity/audit ของ Lead)
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'lead' AFTER 'customer';
