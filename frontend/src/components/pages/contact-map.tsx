import {ArrowUpLeft,MapPin} from 'lucide-react';
import {CONTACT_SHOWROOM} from '@/lib/constants';

const directions=[
  {label:'Google Maps',href:CONTACT_SHOWROOM.directionsUrl},
  {label:'نقشه نشان',href:'https://nshn.ir/1bvW7ANxRQPE'},
];

export function ContactMap(){
  return <section aria-label="مسیریابی دفتر مرکزی و شوروم" className="rounded-[22px] border border-white/10 bg-[linear-gradient(120deg,rgba(255,255,255,.075),rgba(255,255,255,.035))] p-4 shadow-[0_14px_36px_rgba(0,0,0,.14)] sm:p-5" dir="rtl">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.07] text-white/75"><MapPin size={18}/></span>
        <div className="min-w-0"><h2 className="m-0 text-sm font-semibold text-white">{CONTACT_SHOWROOM.label}</h2><p className="mb-0 mt-1.5 text-xs leading-6 text-white/60">{CONTACT_SHOWROOM.address}</p></div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:pr-4">
        {directions.map(({label,href})=><a key={label} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.06] px-3.5 text-[11px] font-medium text-white/80 transition hover:border-white/25 hover:bg-white/[.11] hover:text-white">مسیریابی با {label}<ArrowUpLeft size={14}/></a>)}
      </div>
    </div>
  </section>;
}
