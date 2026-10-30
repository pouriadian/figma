import {Mail,MapPin,Phone} from 'lucide-react';
import {SiteShell} from '@/components/layout/site-shell';
import {Container} from '@/components/ui/brand-ui';
import {ContactMessageModal} from '@/components/contact-message-modal';
import {CONTACT_LOCATIONS,CONTACT_SHOWROOM} from '@/lib/constants';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';
import {ContactMap} from '@/components/pages/contact-map';

export async function ContactView(){const page=await getSitePage('contact');const hero=getSection(page,'hero');const details=getSection(page,'details');return <SiteShell>
  <section className="relative -mt-[68px] bg-[#171b19] pb-7 pt-[88px] sm:-mt-[76px] sm:pb-9 sm:pt-[104px]" dir="rtl">
    <Container>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 sm:mb-6">
        <div><span dir="ltr" className="mb-2 block text-[9px] font-semibold tracking-[.24em] text-white/45">FAROMID CONTACT</span><h1 className="m-0 text-[clamp(1.6rem,3vw,2.25rem)] font-semibold leading-tight text-white">{hero?.title||'تماس با ما'}</h1></div>
        <p className="mb-0 max-w-xl text-xs leading-6 text-white/60 sm:text-sm">{hero?.subtitle||'برای دریافت اطلاعات محصولات، شرایط همکاری و مشاوره با ما در تماس باشید.'}</p>
      </div>
    </Container>
  </section>
  <section className="bg-[#171b19] pb-10 pt-0 sm:pb-14" dir="rtl">
    <Container><div className="mx-auto max-w-[1440px]">
      {details?.body&&<div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-xs leading-7 text-white/65" dangerouslySetInnerHTML={{__html:details.body}}/>}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <a href="tel:+982178328000" className="group flex min-h-[62px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] px-4 text-white transition hover:border-white/20 hover:bg-white/[.075]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.08] text-white/70"><Phone size={16}/></span><span><small className="block text-[10px] text-white/45">تلفن</small><bdi dir="ltr" className="mt-0.5 block text-sm font-medium">021 7832 8000</bdi></span></a>
        <a href="mailto:info@faromid.com" className="group flex min-h-[62px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] px-4 text-white transition hover:border-white/20 hover:bg-white/[.075]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.08] text-white/70"><Mail size={16}/></span><span><small className="block text-[10px] text-white/45">ایمیل</small><bdi dir="ltr" className="mt-0.5 block text-sm font-medium">info@faromid.com</bdi></span></a>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {CONTACT_LOCATIONS.map(location=><article key={location.label} className="flex min-h-[92px] gap-3 rounded-2xl border border-white/10 bg-white/[.045] p-4 text-white"><MapPin size={16} className="mt-0.5 shrink-0 text-white/45"/><div><h2 className="m-0 text-xs font-semibold">{location.label}</h2><p className="mb-0 mt-1.5 text-[11px] leading-6 text-white/60">{location.address}</p></div></article>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.045] px-4 py-3 text-white"><p className="m-0 text-xs leading-6 text-white/60">برای پرسش درباره محصولات یا همکاری، با ما در تماس باشید.</p><ContactMessageModal/></div>
      <div className="mx-auto mt-6 max-w-[1000px]"><ContactMap/></div>
    </div></Container>
  </section>
{page?.sections.filter(s=>s.enabled!==false&&!['hero','details'].includes(s.key)).map(s=><CMSExtraBlock key={s.key} section={s}/>)}
</SiteShell>}
