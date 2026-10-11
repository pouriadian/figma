'use client';
import type {ReactNode} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {ArrowUpLeft, Mail, MapPin, Phone} from 'lucide-react';
import {asset, productTexture} from '@/lib/assets';
import {brand} from '@/lib/media';
import {MobileHeader} from './mobile-header';
import {MobileFooter} from './mobile-footer';
import {ContactForm} from './contact-form';
import {ContactMapEmbed} from './contact-map';
import type {PageSlug} from './figma-page';

function Photo({src,alt,priority=false,className=''}:{src:string;alt:string;priority?:boolean;className?:string}){
 return <div className={'m-photo '+className}><Image src={src} alt={alt} fill sizes="(max-width: 600px) 100vw, 700px" style={{objectFit:'cover'}} priority={priority}/></div>;
}
function SectionHeading({children}:{children:ReactNode}){return <h2 className="m-section-heading">{children}</h2>}
const samples=['سمپل آنتی فینگر','سمپل کیفی','سمپل هایگلاس','سمپل اولترا'];
const valueItems=[['✧','نوآوری','Innovation'],['◎','مسئولیت اجتماعی','Social Responsibility'],['⌁','اعتماد','Trust'],['♙','مشتری‌مداری','Customer Centricity'],['♧','خلاقیت','Creativity'],['✧','کیفیت','Quality'],['✎','برنامه‌ریزی استراتژیک','Strategic Planning']];
const galleryTitles=['G2LAB | Monalia Hotel','Studio Arketo | Ristorante ExMahalo','دکوراسیون داخلی مدرن','پروژه‌های معماری فرامید','اجرای دکوراسیون','طراحی فضای زندگی'];
const eventTitles=['تصاویر نمایشگاه اول','تصاویر نمایشگاه دوم','تصاویر نمایشگاه سوم','تصاویر نمایشگاه چهارم'];

function ProductGrid({limit=12}:{limit?:number}){
 const products=Array.from({length:limit},(_,i)=>({image:productTexture((i%8)+1), code:7185+i}));
 return <div className="m-product-grid">
  {products.map((p,i)=><Link href={`/products/product-${i+1}`} className="m-product-card" key={i}>
    <div className="m-product-media"><Image src={p.image} alt={`طرح بافت MDF مدل CLEAN TOUCH - ${p.code}`} fill sizes="(max-width:500px) 45vw, 30vw" style={{objectFit:'cover'}}/></div>
    <div className="m-product-caption"><span>مدل: CLEAN TOUCH</span><span>کد: {p.code}</span><span>ابعاد: ۱۲۱ × ۲۲۸</span></div>
  </Link>)}
 </div>;
}

function Home(){
 return <>
  <section className="m-home-hero">
    <div className="m-home-hero-photo"><Image src={asset.hero} alt="محصولات Faromid و سمپل متریال" fill sizes="100vw" priority style={{objectFit:'cover'}}/></div>
    <div className="m-home-hero-overlay"><Image src={brand.heroStripes} width={236} height={180} alt="" aria-hidden priority/><p>فرامید تولیدکننده ام‌دی‌اف ملامینه، سینکرونایز، فوق‌برجسته و سوپرمات</p><Link href="/products" className="m-line-link">مشاهده محصولات <ArrowUpLeft size={18}/></Link></div>
  </section>
  <section className="m-surface m-section"><SectionHeading>محصولات</SectionHeading><ProductGrid limit={4}/><Link href="/products" className="m-button m-button-center">بیشتر <ArrowUpLeft size={16}/></Link></section>
  <section className="m-values" style={{backgroundImage:`linear-gradient(120deg,rgba(10,15,23,.87),rgba(17,20,25,.85)), url('${asset.interiors[1]}')`}}><SectionHeading>ارزش‌های سازمانی</SectionHeading><div className="m-values-grid">{valueItems.map(([icon,title,en])=><div key={en} className="m-value"><span>{icon}</span><strong>{title}</strong><small>{en}</small></div>)}</div></section>
  <section className="m-surface m-section"><SectionHeading>گالری تصاویر</SectionHeading><div className="m-gallery-grid">{asset.interiors.slice(0,5).map((url,i)=><Link href="/gallery" className={i===0?'wide':''} key={url}><Photo src={url} alt={galleryTitles[i]}/></Link>)}</div><Link href="/gallery" className="m-button m-button-center">بیشتر <ArrowUpLeft size={16}/></Link></section>
  <section className="m-history"><Image src={brand.homeHistoryPanels} alt="" aria-hidden width={520} height={220} className="m-history-panels"/><p>Since 1975 the Caspany family has pursued its entrepreneurial path of tradition and innovation with passion and enthusiasm.</p></section>
  <section className="m-surface m-section"><SectionHeading>سمپل‌ها</SectionHeading><div className="m-samples">{asset.samples.map((url,i)=><Link href="/products" key={url}><Photo src={url} alt={samples[i]}/><h3>{samples[i]}</h3></Link>)}</div></section>
 </>;
}
function Products(){return <>
  <div className="m-banner"><Photo src={asset.intro} alt="فضای داخلی آشپزخانه با متریال آنتی فینگر" priority/><div><p>Faromid Collection</p><h1>ANTI FINGER</h1></div></div>
  <section className="m-surface m-section"><SectionHeading>محصولات آنتی فینگر</SectionHeading><ProductGrid/></section>
 </>}
function About(){return <>
  <div className="m-banner about-banner"><Photo src={asset.aboutHero} alt="متریال و محصولات گروه فرامید" priority/><div><p>FAROMID GROUP</p><h1>Since 1995</h1></div></div>
  <section className="m-section m-about" dir="rtl"><SectionHeading>درباره فرامید</SectionHeading><p>گروه تولیدی فرامید فعالیت خود را در زمینه صنعت چوب و مبلمان از سال ۱۳۳۲ توسط آقای محمد فروز آغاز نمود. این مجموعه با تکیه بر تجربه، نوآوری و کیفیت، توسعه محصولات و ارائه متریال متنوع برای معماری و طراحی داخلی را دنبال می‌کند.</p><Photo src={asset.about} alt="شوروم و نمونه محصولات فرامید"/></section>
 </>}
function Gallery({onOpen}:{onOpen:(src:string)=>void}){return <>
  <section className="m-section m-surface"><h1 className="m-page-title">پروژه‌ها</h1><div className="m-editorial-grid">{asset.interiors.map((src,i)=><button key={src} type="button" onClick={()=>onOpen(src)}><Photo src={src} alt={galleryTitles[i]}/><h3>{galleryTitles[i]}</h3><span>مشاهده تصویر <ArrowUpLeft size={14}/></span></button>)}</div><SectionHeading>محصولات جدید</SectionHeading><ProductGrid limit={4}/></section>
 </>}
function Exhibitions({onOpen}:{onOpen:(src:string)=>void}){return <>
  <section className="m-section m-surface"><h1 className="m-page-title">نمایشگاه‌ها</h1><div className="m-editorial-grid">{asset.exhibitions.map((src,i)=><button key={src} type="button" onClick={()=>onOpen(src)}><Photo src={src} alt={eventTitles[i]}/><h3>{eventTitles[i]}</h3><span>نمایش عکس <ArrowUpLeft size={14}/></span></button>)}</div><SectionHeading>محصولات جدید</SectionHeading><ProductGrid limit={4}/></section>
 </>}
function Careers(){return <>
  <div className="m-banner short-banner"><Photo src={asset.careers} alt="همکاری و ارتباط با گروه فرامید" priority/><div><h1>همکاری با ما</h1></div></div>
  <section className="m-section m-about"><p>فلسفه کاری در فرامید مبتنی بر احترام و اخلاق حرفه‌ای می‌باشد که منجر به ایجاد محیط کاری دوستانه بر اساس معیارهای بین‌المللی و توأم با پیشرفت و یادگیری مستمر است.</p><SectionHeading>ارسال رزومه</SectionHeading><p>برای ارسال رزومه، زمینه تخصصی و راه ارتباطی خود را بنویسید و در برنامه ایمیل فایل رزومه را ضمیمه کنید.</p><ContactForm type="careers"/></section>
 </>}
function Dealership(){return <>
  <div className="m-banner short-banner"><Photo src={asset.dealership} alt="فرصت نمایندگی فرامید" priority/><div><h1>اخذ نمایندگی</h1></div></div>
  <section className="m-section m-about"><p>برای همکاری تجاری و اطلاع از شرایط اخذ نمایندگی محصولات فرامید، درخواست خود را به همراه نام شهر و اطلاعات تماس ارسال کنید.</p><SectionHeading>فرم اخذ نمایندگی</SectionHeading><ContactForm type="dealership"/></section>
 </>}
function Contact(){return <>
  <section className="m-contact-intro"><h1 className="m-page-title">تماس با ما</h1><p>برای دریافت اطلاعات محصولات، شرایط همکاری و مشاوره با ما در تماس باشید.</p><div className="m-contact-links"><a href="tel:+982178328000"><Phone size={18}/> 02178328000</a><a href="mailto:info@faromid.com"><Mail size={18}/> info@faromid.com</a><p><MapPin size={18}/> آدرس کارخانه: کیلومتر ۲۰ جاده خاوران، روبروی فرون‌آباد اول، کوچه صاحب‌الزمان</p></div></section>
  <div className="m-map"><ContactMapEmbed className="m-map-embed"/></div>
  <section className="m-section m-about"><SectionHeading>ارسال پیام</SectionHeading><ContactForm/></section>
 </>}
function Textures(){return <><section className="m-section m-surface"><h1 className="m-page-title">بافت و تکسچر محصولات</h1><p className="m-section-caption">مجموعه‌ای از بافت‌های طبیعی، مدرن و مینیمال محصولات فرامید</p><ProductGrid/></section></>}

export function MobilePage({slug,onOpenImage}:{slug:PageSlug;onOpenImage:(src:string)=>void}) {
 return <div className="m-site" dir="rtl"><MobileHeader/><main>
  {slug==='home'?<Home/>:slug==='products'?<Products/>:slug==='about'?<About/>:slug==='careers'?<Careers/>:slug==='gallery'?<Gallery onOpen={onOpenImage}/>:slug==='exhibitions'?<Exhibitions onOpen={onOpenImage}/>:slug==='dealership'?<Dealership/>:<Contact/>}
  </main><MobileFooter/></div>;
}
export function MobileTextures(){return <div className="m-site" dir="rtl"><MobileHeader/><main><Textures/></main><MobileFooter/></div>}
