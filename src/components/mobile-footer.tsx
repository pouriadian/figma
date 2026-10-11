import Image from 'next/image';
import Link from 'next/link';
import {links} from '@/lib/constants';
import {brand} from '@/lib/media';
export function MobileFooter(){
 return <footer className="m-footer" dir="rtl">
   <div className="m-footer-brand"><Image src={brand.logo} width={200} height={60} alt="Faromid Group"/><p>تولیدکننده MDF ملامینه، سینکرونایز، فوق برجسته و سوپرمات آنتی فینگر</p></div>
   <div className="m-footer-links"><h3>پیوندها</h3>{links.map(l=><Link key={l.href} href={l.href}>{l.label}</Link>)}</div>
   <div className="m-footer-contact"><h3>تماس با ما</h3><p>آدرس کارخانه: کیلومتر ۲۰ جاده خاوران، روبروی فرون‌آباد اول، کوچه صاحب‌الزمان</p><p>دفتر مرکزی و شوروم: تهران، اقدسیه، ساختمان نگین</p><a href="tel:+982178328000" dir="ltr">021 7832 8000</a><a href="mailto:info@faromid.com">info@faromid.com</a></div>
   <div className="m-footer-bottom">© {new Date().getFullYear()} Faromid Group</div>
 </footer>;
}
