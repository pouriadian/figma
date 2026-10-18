import Image from 'next/image';
import Link from 'next/link';
import {Mail, MapPin, Phone} from 'lucide-react';
import {brand} from '@/lib/media';
import {links} from '@/lib/constants';
import {Container} from '@/components/ui/brand-ui';

export function SiteFooter() {
  return <footer className="bg-[#1d201f] pt-14 text-white md:pt-20" dir="rtl">
    <Container>
      <div className="grid gap-10 border-b border-white/10 pb-12 md:grid-cols-[1.1fr_.9fr_1.1fr] md:gap-12">
        <div><Image src={brand.logo} width={220} height={60} alt="Faromid Group" className="mb-5 h-auto w-[180px]" /><p className="m-0 max-w-sm text-[13px] leading-[2.3] text-white/65">تولیدکننده MDF ملامینه، سینکرونایز، فوق برجسته و سوپرمات آنتی فینگر</p></div>
        <div><h2 className="mb-5 mt-0 text-base font-semibold">پیوندها</h2><div className="grid grid-cols-2 gap-x-3 gap-y-3">{links.map(link => <Link key={link.href} href={link.href} className="text-[12px] leading-relaxed text-white/60 transition-colors hover:text-white">{link.label}</Link>)}</div></div>
        <div><h2 className="mb-5 mt-0 text-base font-semibold">تماس با ما</h2><div className="grid gap-4 text-[12px] leading-[2.2] text-white/65">
          <p className="m-0 flex items-start gap-3"><MapPin size={17} className="mt-1 shrink-0 text-white/50"/>آدرس کارخانه: کیلومتر ۲۰ جاده خاوران، روبروی فرون‌آباد اول، کوچه صاحب‌الزمان</p>
          <a href="tel:+982178328000" className="flex items-center gap-3 transition-colors hover:text-white"><Phone size={17} /> <span dir="ltr">021 7832 8000</span></a>
          <a href="mailto:info@faromid.com" className="flex items-center gap-3 transition-colors hover:text-white"><Mail size={17} /> <span dir="ltr">info@faromid.com</span></a>
        </div></div>
      </div>
      <div className="flex items-center justify-center gap-6 border-b border-white/10 py-5 text-[12px] text-white/60"><Link href="/representatives" className="transition hover:text-white">نمایندگان رسمی</Link><Link href="/representative/login" className="transition hover:text-white">ورود نمایندگان</Link><Link href="/collaboration" className="transition hover:text-white">همکاری سازمانی</Link><Link href="/track" className="transition hover:text-white">پیگیری درخواست</Link><Link href="/news" className="transition hover:text-white">اخبار</Link><Link href="/projects" className="transition hover:text-white">پروژه‌ها</Link></div>
      <div className="flex items-center justify-center py-6 text-center text-[11px] text-white/40" dir="ltr">© {new Date().getFullYear()} Faromid Group</div>
    </Container>
  </footer>;
}
