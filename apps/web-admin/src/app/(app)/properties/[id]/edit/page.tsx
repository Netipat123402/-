'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import PropertyForm, { type PropertyInitial } from '@/components/PropertyForm';
import { PageHeader } from '@/components/ui';

export default function EditPropertyPage() {
  const { api } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [initial, setInitial] = useState<PropertyInitial | null>(null);

  useEffect(() => {
    (async () => {
      const r = await api<PropertyInitial & { amenities?: Record<string, boolean> }>(`/properties/${id}`);
      setInitial({ ...r.data, id });
    })();
  }, [api, id]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="แก้ไขทรัพย์" />
      <div className="mt-6">
        {initial ? <PropertyForm mode="edit" initial={initial} />
          : <div className="h-64 animate-pulse rounded-card bg-canvas" />}
      </div>
    </div>
  );
}
