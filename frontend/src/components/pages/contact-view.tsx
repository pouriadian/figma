import Image from 'next/image';
import {ArrowUpLeft,Mail,MapPin,Phone} from 'lucide-react';
import {SiteShell} from '@/components/layout/site-shell';
import {Container,SectionTitle} from '@/components/ui/brand-ui';
import {ContactForm} from '@/components/contact-form';
import {CONTACT_SHOWROOM} from '@/lib/constants';
import {asset} from '@/lib/assets';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';

export async function ContactView(){const page=await getSitePage('contact');const hero=getSection(page,'hero');const details=getSection(page,'details');return <SiteShell>
  <section className="relative isolate border-b border-[#e2e5df] bg-white py-14 sm:py-20">{hero?.image&&<><Image src={hero.image} fill alt={hero.image_alt||"بنر تماس فرامید"} sizes="100vw" className="-z-10 object-cover opacity-20"/><div className="absolute inset-0 -z-10 bg-white/75"/></>}<Container>
    <h1 className="m-0 text-[clamp(2rem,4vw,3.4rem)] font-semibold text-[#252a26]">{hero?.title||"تماس با ما"}</h1>
    <p className="mb-0 mt-4 max-w-[630px] text-[14px] leading-[2.3] text-[#727a73]">{hero?.subtitle||"برای دریافت اطلاعات محصولات، شرایط همکاری و مشاوره با ما در تماس باشید."}</p>
  </Container></section>
  <section className="bg-[#f5f5f1] py-12 sm:py-20"><Container>
    <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-12">
      <div className="grid content-start gap-4">
        {details?.body&&<div className="rounded-[22px] border border-[#e3e7e1] bg-white p-6 text-sm leading-8 text-[#59645d]" dangerouslySetInnerHTML={{__html:details.body}}/>}
        <div className="rounded-[22px] border border-[#e3e7e1] bg-white p-6 sm:p-7"><div className="mb-2 flex items-center gap-3 text-[#4f5d52]"><Phone size={19}/><h2 className="m-0 text-base font-semibold">تلفن</h2></div><a href="tel:+982178328000" className="inline-block py-1 text-lg font-medium text-[#293129] hover:underline" dir="ltr">021 7832 8000</a></div>
        <div className="rounded-[22px] border border-[#e3e7e1] bg-white p-6 sm:p-7"><div className="mb-2 flex items-center gap-3 text-[#4f5d52]"><Mail size={19}/><h2 className="m-0 text-base font-semibold">ایمیل</h2></div><a href="mailto:info@faromid.com" className="inline-block py-1 text-base text-[#293129] hover:underline" dir="ltr">info@faromid.com</a></div>
        <div className="rounded-[22px] border border-[#e3e7e1] bg-white p-6 sm:p-7"><div className="mb-2 flex items-center gap-3 text-[#4f5d52]"><MapPin size={19}/><h2 className="m-0 text-base font-semibold">آدرس کارخانه</h2></div><p className="mb-0 text-[13px] leading-[2.3] text-[#636d65]">کیلومتر ۲۰ جاده خاوران، روبروی فرون‌آباد اول، کوچه صاحب‌الزمان</p></div>
        <div className="rounded-[22px] border border-[#e3e7e1] bg-white p-6 sm:p-7"><div className="mb-2 flex items-center gap-3 text-[#4f5d52]"><MapPin size={19}/><h2 className="m-0 text-base font-semibold">{CONTACT_SHOWROOM.label}</h2></div><p className="mb-3 text-[13px] leading-[2.3] text-[#636d65]">{CONTACT_SHOWROOM.address}</p><a target="_blank" rel="noopener noreferrer" href={CONTACT_SHOWROOM.directionsUrl} className="group inline-flex items-center gap-2 text-[13px] font-medium text-[#4c584d] underline decoration-[#9ba69b] underline-offset-4">مسیریابی <ArrowUpLeft size={16} className="transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1"/></a></div>
      </div>
      <div className="rounded-[24px] border border-[#e3e7e1] bg-white p-6 sm:p-9 lg:p-11"><SectionTitle title="ارسال پیام"/><ContactForm/></div>
    </div>
  </Container></section>
  <section className="bg-[#f5f5f1] pb-16 sm:pb-24"><Container><a href={CONTACT_SHOWROOM.directionsUrl} target="_blank" rel="noopener noreferrer" aria-label="موقعیت دفتر نمایشگاه روی نقشه" className="group relative block min-h-[280px] overflow-hidden rounded-[24px] border border-[#e4e7e1] bg-[#252825] sm:min-h-[440px]">
    <Image src={details?.image||asset.map} alt="نقشه موقعیت دفتر نمایشگاه فرامید" fill sizes="100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
    <span className="absolute bottom-5 right-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#262c29]/90 px-5 py-3 text-[13px] text-white backdrop-blur-md">نمایش مسیر روی نقشه <ArrowUpLeft size={17}/></span>
  </a></Container></section>
{page?.sections.filter(s=>s.enabled!==false&&!['hero','details'].includes(s.key)).map(s=><CMSExtraBlock key={s.key} section={s}/>)}
</SiteShell>}
