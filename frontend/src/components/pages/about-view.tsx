import Image from 'next/image';
import {SiteShell} from '@/components/layout/site-shell';
import {PageIntro} from '@/components/sections/page-intro';
import {Container} from '@/components/ui/brand-ui';
import {asset} from '@/lib/assets';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';

const aboutParagraphs=[
  'ریشهٔ فرامید در صنعت چوب و مبلمان ایران به سال ۱۳۳۲ و فعالیت آقای محمد فروز فقیه بازمی‌گردد. این مسیر در سال ۱۳۸۳ با راه‌اندازی سالن تولید فرامید ادامه پیدا کرد.',
  'احترام به مشتری، کیفیت محصول و تحویل به‌موقع، اصول کار ما هستند. از سال ۱۳۹۳ نیز با راه‌اندازی خطوط مدرن تولید MDF ملامینه، نوآوری در طرح و بافت را گسترش داده‌ایم.',
  'امروز فرامید با ظرفیت تولید بیش از ۵۰ هزار ورق در ماه، ورق‌های دو رو سینکرونایز، فوق‌برجسته و سوپرمات تولید می‌کند و توسعهٔ بازارهای منطقه‌ای و بین‌المللی را دنبال می‌کند.',
];

export async function AboutView(){const page=await getSitePage('about');const hero=getSection(page,'hero');const intro=getSection(page,'intro');return <SiteShell>
  <PageIntro title={hero?.title||"درباره فرامید"} subtitle={hero?.subtitle||"FAROMID GROUP"} description="روایتی از تجربه، نوآوری و تولید در صنعت چوب و مبلمان ایران." image={hero?.image||asset.aboutHero}/>
  <section className="bg-[#f5f5f1] py-12 sm:py-20"><Container>
    <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-14">
      <div className="relative min-h-[280px] overflow-hidden rounded-[24px] bg-[#ddd] sm:min-h-[420px]"><Image src={intro?.image||asset.about} alt="شوروم و نمونه محصولات فرامید" fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover"/></div>
      <div dir="rtl"><h2 className="mb-6 mt-0 text-xl font-semibold leading-[1.5] text-[#292d2a] sm:text-2xl">{intro?.title||"درباره فرامید"}</h2><div className="max-w-2xl space-y-4 text-[14px] leading-[2.2] text-[#596058] sm:text-[15px]">{aboutParagraphs.map((paragraph,index)=><p className="m-0" key={index}>{paragraph}</p>)}</div></div>
    </div>
  </Container></section>
{page?.sections.filter(s=>s.enabled!==false&&!['hero','intro'].includes(s.key)).map(s=><CMSExtraBlock key={s.key} section={s}/>)}
</SiteShell>}
