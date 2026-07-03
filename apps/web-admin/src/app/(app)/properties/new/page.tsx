'use client';

import PropertyForm from '@/components/PropertyForm';
import { PageHeader } from '@/components/ui';

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="เพิ่มทรัพย์ใหม่" subtitle="กรอกข้อมูลทรัพย์ (จะถูกบันทึกเป็นฉบับร่างก่อน)" />
      <div className="mt-6"><PropertyForm mode="create" /></div>
    </div>
  );
}
