'use client';

import { CONTACT_SHOWROOM } from '@/lib/constants';

type ContactMapEmbedProps = {
  className?: string;
};

/** Interactive map for the showroom address on the contact page (OpenStreetMap). */
export function ContactMapEmbed({ className = '' }: ContactMapEmbedProps) {
  const { lat, lng, label } = CONTACT_SHOWROOM;
  const delta = 0.012;
  const bbox = [lng - delta, lat - delta * 0.75, lng + delta, lat + delta * 0.75].join(',');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <iframe
      className={className}
      title={`نقشه ${label}`}
      src={src}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}
