import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {MobileHeader} from '@/components/mobile-header';
import {MobileFooter} from '@/components/mobile-footer';
import {ArrowRight, Mail} from 'lucide-react';
import {productTexture} from '@/lib/media';

export function generateStaticParams(){return Array.from({length:12},(_,i)=>({slug:`product-${i+1}`}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const n=Number(slug.replace('product-',''));
  return {title:`CLEAN TOUCH – ${7184+n}`,description:`اطلاعات و مشخصات MDF کلین تاچ فرامید با کد ${7184+n}`};
}
export default async function ProductDetail({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const num=Number(slug.replace('product-',''));
  if(!/^product-([1-9]|1[0-2])$/.test(slug)||!Number.isInteger(num))notFound();
  const number=7184+num;
  return <div className="m-site product-detail-page" dir="rtl"><MobileHeader/>
    <main className="product-detail-main"><Link href="/products" className="product-back"><ArrowRight size={17}/> بازگشت به محصولات</Link>
      <div className="product-detail-layout"><div className="product-detail-image"><Image alt={`طرح MDF فرامید CLEAN TOUCH با کد ${number}`} src={productTexture(((num-1)%8)+1)} fill sizes="(max-width:900px) 100vw, 45vw" style={{objectFit:'contain'}} priority/></div>
      <div className="product-detail-content"><span className="eyebrow">FAROMID GROUP / MDF</span><h1>کلین تاچ | CLEAN TOUCH</h1><p>کد محصول: <b>{number}</b></p><div className="product-specs"><div><span>مدل</span><strong>CLEAN TOUCH</strong></div><div><span>کد</span><strong>{number}</strong></div><div><span>ابعاد</span><strong>۱۲۱ × ۲۲۸</strong></div><div><span>نوع</span><strong>MDF دکوراتیو</strong></div></div>
       <p className="product-footnote">تصاویر نمونه ممکن است از نظر نور و رنگ در نمایشگرهای مختلف متفاوت باشند. برای اطلاعات فنی یا ثبت درخواست، با دفتر فروش تماس بگیرید.</p>
       <a className="m-button" href={`mailto:info@faromid.com?subject=${encodeURIComponent('استعلام محصول '+number)}`}><Mail size={17}/> استعلام محصول</a>
      </div></div>
    </main><MobileFooter/>
  </div>;
}
