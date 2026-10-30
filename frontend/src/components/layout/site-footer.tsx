import Image from 'next/image';
import Link from 'next/link';
import {Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter} from 'lucide-react';
import {brand} from '@/lib/media';
import {CONTACT_LOCATIONS,links} from '@/lib/constants';
import {Container} from '@/components/ui/brand-ui';
import {FooterLinksModal} from './footer-links-modal';

export function SiteFooter() {
  const socialIcons=[{label:'Facebook',Icon:Facebook},{label:'Twitter',Icon:Twitter},{label:'Instagram',Icon:Instagram},{label:'LinkedIn',Icon:Linkedin}];
  return <footer className="bg-[#1d201f] pt-10 text-white md:pt-14" dir="rtl">
    <Container>
      <div dir="ltr" className="grid gap-8 border-b border-white/10 pb-8 md:grid-cols-[.9fr_1fr_1.3fr] md:gap-10 md:pb-10">
        <div dir="rtl"><Image src={brand.logo} width={220} height={60} alt="Faromid Group" className="mb-4 h-auto w-[160px]" /><p className="m-0 max-w-sm text-[12px] leading-[2.1] text-white/60">تولیدکنندهٔ ام‌دی‌اف دورو سینکرونایز، فوق‌برجسته و سوپرمات آنتی‌فینگر</p></div>
        <div dir="rtl"><h2 className="mb-3 mt-0 text-sm font-semibold">پیوندها</h2><FooterLinksModal/><h3 className="mb-2 mt-5 text-[11px] font-medium text-white/45">دسترسی سریع</h3><div className="grid grid-cols-2 gap-x-3 gap-y-2">{links.map(link => <Link key={link.href} href={link.href} className="text-[11px] leading-relaxed text-white/55 transition-colors hover:text-white">{link.label}</Link>)}</div></div>
        <div dir="rtl"><h2 className="mb-3 mt-0 text-sm font-semibold">تماس با ما</h2><div className="grid gap-2.5 text-[11px] leading-[1.9] text-white/60">
          {CONTACT_LOCATIONS.map(location=><p key={location.label} className="m-0 flex items-start gap-2.5"><MapPin size={15} className="mt-1 shrink-0 text-white/40"/><span><b className="font-medium text-white/75">{location.label}:</b> {location.address}</span></p>)}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 pt-2.5"><a href="tel:+982178328000" className="inline-flex items-center gap-2 transition-colors hover:text-white"><Phone size={14}/><span dir="ltr">021 7832 8000</span></a><a href="mailto:info@faromid.com" className="inline-flex items-center gap-2 transition-colors hover:text-white"><Mail size={14}/><span dir="ltr">info@faromid.com</span></a></div>
          <details className="group border-t border-white/10 pt-2"><summary className="w-fit cursor-pointer text-[11px] text-white/55 transition hover:text-white">شماره‌های بیشتر و فکس</summary><div className="mt-2 grid gap-1.5 rounded-xl bg-white/[.04] p-3 sm:grid-cols-2"><span>فکس دفتر مرکزی: <bdi dir="ltr">021 2282 3107</bdi></span><span>تلفن کارخانه: <bdi dir="ltr">021 3684 9085</bdi></span><span>تلفن کارخانه: <bdi dir="ltr">021 3684 9086</bdi></span><span>فکس کارخانه: <bdi dir="ltr">021 3684 9474</bdi></span></div></details>
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2.5"><span className="ml-1 text-[10px] text-white/40">شبکه‌های اجتماعی</span>{socialIcons.map(({label,Icon})=><span key={label} role="img" aria-label={label} title={label} dir="ltr" className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/[.04] text-white/65 transition-colors hover:border-white/30 hover:bg-white/[.09] hover:text-white"><Icon size={15} strokeWidth={1.8}/></span>)}</div>
        </div></div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-b border-white/10 py-4 text-[11px] text-white/55"><Link href="/representatives" className="transition hover:text-white">نمایندگان رسمی</Link><Link href="/representative/login" className="transition hover:text-white">ورود نمایندگان</Link><Link href="/collaboration" className="transition hover:text-white">همکاری سازمانی</Link><Link href="/track" className="transition hover:text-white">پیگیری درخواست</Link><Link href="/news" className="transition hover:text-white">اخبار</Link><Link href="/gallery" className="transition hover:text-white">پروژه‌ها</Link></div>
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-[11px] text-white/40 sm:flex-row sm:gap-5" dir="ltr"><span>© {new Date().getFullYear()} Faromid Group</span><span className="text-white/20">|</span><span className="text-[10px] text-white/50">Developed by <bdi dir="rtl" className="font-normal">پوریا محمدیان</bdi></span><a href="tel:+989907253800" className="text-[10px] text-white/50 transition hover:text-white/80">09907253800</a></div>
    </Container>
  </footer>;
}
