import {ExternalLink,Mail,MapPin,Phone} from 'lucide-react';
import {SiteShell} from '@/components/layout/site-shell';
import {Container} from '@/components/ui/brand-ui';
import {ContactMessageModal} from '@/components/contact-message-modal';
import {CONTACT_LOCATIONS,CONTACT_SHOWROOM} from '@/lib/constants';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';

export async function ContactView(){const page=await getSitePage('contact');const hero=getSection(page,'hero');const details=getSection(page,'details');return <SiteShell>
  <section className="relative -mt-[68px] bg-[#171b19] pb-5 pt-[88px] sm:-mt-[76px] sm:pb-7 sm:pt-[104px]" dir="rtl">
    <Container>
      <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:gap-7">
        <div className="w-fit max-w-full rounded-[26px] border border-white/10 bg-white/[0.07] p-5 shadow-[0_16px_48px_rgba(0,0,0,.2)] backdrop-blur-xl sm:p-7">
          <span dir="ltr" className="mb-3 block text-[10px] font-semibold tracking-[.24em] text-white/55 sm:text-xs">FAROMID CONTACT</span>
          <h1 className="m-0 max-w-[min(72vw,640px)] text-[clamp(1.55rem,3vw,2.45rem)] font-semibold leading-[1.25] text-white">{hero?.title||'تماس با ما'}</h1>
          <p className="mb-0 mt-3 max-w-xl text-sm leading-7 text-white/70">{hero?.subtitle||'برای دریافت اطلاعات محصولات، شرایط همکاری و مشاوره با ما در تماس باشید.'}</p>
        </div>
        <div dir="ltr" className="relative min-h-[320px] overflow-hidden rounded-[24px] border border-[#303733] bg-[#171b19] p-2 shadow-[0_18px_48px_rgba(31,38,31,.16)] sm:min-h-[380px] lg:min-h-[420px]">
          <iframe title={`Google Map: ${CONTACT_SHOWROOM.label}, ${CONTACT_SHOWROOM.address}`} src={CONTACT_SHOWROOM.embedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen className="absolute inset-2 h-[calc(100%-16px)] w-[calc(100%-16px)] rounded-[18px] border-0" style={{filter:'invert(.9) hue-rotate(180deg) brightness(.82) contrast(.92)'}} />
          <div className="absolute bottom-5 left-5 z-10 max-w-[min(88%,320px)] rounded-2xl border border-white/15 bg-[#171b19]/85 p-4 text-white shadow-lg backdrop-blur-xl sm:bottom-6 sm:left-6 sm:p-5">
            <p className="mb-1 text-[9px] font-semibold tracking-[.18em] text-white/55">OUR LOCATION</p>
            <p className="m-0 text-base font-semibold">{CONTACT_SHOWROOM.label}</p>
            <p className="mb-3 mt-1 text-xs leading-5 text-white/65">{CONTACT_SHOWROOM.address}</p>
            <a href={CONTACT_SHOWROOM.directionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-medium text-white transition hover:bg-white/20"><span>Open in Google Maps</span><ExternalLink size={13}/></a>
          </div>
        </div>
      </div>
    </Container>
  </section>
  <section className="bg-[#171b19] pb-10 pt-3 sm:pb-14 sm:pt-5" dir="rtl">
    <Container><div className="grid content-start gap-4 sm:grid-cols-2">
      {details?.body&&<div className="rounded-[20px] border border-white/10 bg-white/[0.06] p-5 text-sm leading-8 text-white/75 backdrop-blur-xl sm:col-span-2" dangerouslySetInnerHTML={{__html:details.body}}/>}
      <div className="rounded-[20px] border border-white/10 bg-white/[0.06] p-5 text-white shadow-[0_12px_32px_rgba(0,0,0,.12)] backdrop-blur-xl"><div className="mb-2 flex items-center gap-2.5 text-white/75"><Phone size={18}/><h2 className="m-0 text-sm font-semibold">تلفن</h2></div><a href="tel:+982178328000" className="text-base font-medium text-white transition hover:text-white/75 hover:underline" dir="ltr">021 7832 8000</a></div>
      <div className="rounded-[20px] border border-white/10 bg-white/[0.06] p-5 text-white shadow-[0_12px_32px_rgba(0,0,0,.12)] backdrop-blur-xl"><div className="mb-2 flex items-center gap-2.5 text-white/75"><Mail size={18}/><h2 className="m-0 text-sm font-semibold">ایمیل</h2></div><a href="mailto:info@faromid.com" className="text-sm text-white transition hover:text-white/75 hover:underline" dir="ltr">info@faromid.com</a></div>
      {CONTACT_LOCATIONS.map(location=><div key={location.label} className="rounded-[20px] border border-white/10 bg-white/[0.06] p-5 text-white shadow-[0_12px_32px_rgba(0,0,0,.12)] backdrop-blur-xl"><div className="mb-2 flex items-center gap-2.5 text-white/75"><MapPin size={18}/><h2 className="m-0 text-sm font-semibold">{location.label}</h2></div><p className="mb-0 text-[13px] leading-7 text-white/65">{location.address}</p></div>)}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-white/10 bg-white/[0.06] p-5 text-white shadow-[0_12px_32px_rgba(0,0,0,.12)] backdrop-blur-xl sm:col-span-2"><p className="m-0 max-w-md text-sm leading-7 text-white/65">برای پرسش درباره محصولات یا همکاری، پیام خود را برای ما بفرستید.</p><ContactMessageModal/></div>
    </div></Container>
  </section>
{page?.sections.filter(s=>s.enabled!==false&&!['hero','details'].includes(s.key)).map(s=><CMSExtraBlock key={s.key} section={s}/>)}
</SiteShell>}
