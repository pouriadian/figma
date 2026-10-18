import Image from 'next/image';
import Link from 'next/link';
import {Plus} from 'lucide-react';
import {asset} from '@/lib/assets';
import {brand} from '@/lib/media';
import type {CMSSection} from '@/lib/site-pages';

const HERO_TITLE = 'فرامید تولید کننده ام دی اف ملامینه، سینکرونایز، فوق برجسته و سوپرمات';
const SAMPLE_ONE = '/assets/home/7857b2da1dc5c35e23e03cfc29fb7f1b0f06a3c7.webp';
const SAMPLE_TWO = '/assets/home/dcaaec449abb88b95402833fffedb7d604de95b1.webp';

/**
 * The product highlight is a SINGLE link, not overlapping nested buttons.
 * Its placement follows the original 1728px Faromid home artboard.
 */
function HeroProductHighlight({mobile = false, href = "/products", label = "Melamine MDF"}: {mobile?: boolean;href?:string;label?:string}) {
  return (
    <Link
      href={href}
      aria-label="مشاهده محصولات فرامید - Melamine MDF"
      className={mobile
        ? 'group absolute bottom-[45%] right-[5%] z-20 h-[75px] w-[224px] max-w-[80vw] [direction:ltr]'
        : 'group absolute left-[61.1111%] top-[77.0%] z-20 h-[11.694%] w-[17.535%] [direction:ltr]'}
    >
      <div className="absolute left-0 top-0 h-[97%] w-[94.4%] rounded-[10px] bg-black/10 transition-colors duration-300 group-hover:bg-black/15" />
      <div className="absolute left-[5%] top-[15.9%] h-[53.3%] w-[16.8%] overflow-hidden bg-[#d4d0c9]">
        <Image src={SAMPLE_ONE} alt="" fill sizes="52px" className="object-cover" />
      </div>
      <div className="absolute left-[15.2%] top-[22.4%] h-[55.1%] w-[18.15%] overflow-hidden bg-[#c7c7c4]">
        <Image src={SAMPLE_TWO} alt="" fill sizes="58px" className="object-cover grayscale brightness-[.88]" />
      </div>
      <span className="absolute left-[36%] top-[30%] whitespace-nowrap text-[clamp(11px,1.22vw,20px)] font-semibold leading-tight text-[#575757] max-lg:text-[13px]">{label}</span>
      <span className="absolute left-[49%] top-[65%] whitespace-nowrap text-[clamp(9px,.93vw,16px)] font-semibold leading-tight text-white max-lg:text-[11px]">183*280</span>
      <span className="absolute left-[85.5%] top-[62%] grid aspect-square w-[13.2%] place-items-center rounded-full bg-[#ec1c24] text-white transition-transform duration-300 group-hover:scale-110">
        <Plus className="h-[57%] w-[57%]" strokeWidth={3.5}/>
      </span>
    </Link>
  );
}

/** The desktop geometry is proportionate to the source 1728 x 915 artboard. */
function DesktopHomeHero({content}: {content?:CMSSection}) {
  return (
    <div className="relative hidden aspect-[1728/915] w-full overflow-hidden bg-[#0d0d0d] lg:block">
      <div className="absolute top-0 left-[37.4421%] h-full w-[65.22%] overflow-hidden bg-[#d0d0d0]">
        <Image
          src={content?.image||asset.hero}
          alt={content?.image_alt||"بسته‌بندی مجموعه MDF ملامینه فرامید"}
          fill
          priority
          sizes="66vw"
          className="faromid-hero-photo object-cover object-center"
        />
      </div>
      <div className="absolute inset-y-0 left-0 w-[37.7%] bg-[#0d0d0d]" />
      <Image
        src={brand.heroStripes}
        alt=""
        aria-hidden="true"
        width={472}
        height={360}
        priority
        className="faromid-hero-stripes absolute top-[30.6%] left-[4.4%] h-auto w-[27.6%] select-none"
      />
      <h1
        className="absolute top-[80.6%] left-[6.25%] m-0 w-[23.5%] text-center text-[clamp(11px,1.12vw,19px)] leading-[1.9] font-bold text-white"
        dir="rtl"
      >
        {content?.title ? content.title : <><span className="block whitespace-nowrap">فرامید تولید کننده ام دی اف ملامینه،</span><span className="block whitespace-nowrap">سینکرونایز، فوق برجسته و سوپرمات</span></>}
      </h1>
      {content?.subtitle&&<p className="absolute top-[90.5%] left-[5%] m-0 w-[28%] text-center text-[clamp(9px,.85vw,15px)] leading-relaxed text-white/75" dir="rtl">{content.subtitle}</p>}
      {/* Fine red corner marks are part of the reference composition. */}
      <div aria-hidden="true" className="absolute top-[79.6%] left-[25%] h-[4.7%] w-[3%] border-t-[2px] border-r-[2px] border-[#ec1c24]" />
      <div aria-hidden="true" className="absolute bottom-[9.7%] left-[7.95%] h-[4.7%] w-[3%] border-b-[2px] border-l-[2px] border-[#ec1c24]" />
      <HeroProductHighlight href={content?.link_url||"/products"} label={content?.link_label||"Melamine MDF"}/>
    </div>
  );
}

/** A readable adaptation of exactly the same assets/content at phone/tablet sizes. */
function MobileHomeHero({content}: {content?:CMSSection}) {
  return (
    <div className="relative min-h-[700px] w-full overflow-hidden bg-[#0d0d0d] sm:min-h-[760px] lg:hidden">
      <div className="absolute inset-x-0 top-0 h-[57%] overflow-hidden bg-[#d0d0d0]">
        <Image
          src={content?.image||asset.hero}
          alt={content?.image_alt||"بسته‌بندی مجموعه MDF ملامینه فرامید"}
          fill
          priority
          sizes="100vw"
          className="faromid-hero-photo object-cover object-center"
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-[#0d0d0d]" />
      <HeroProductHighlight mobile href={content?.link_url||"/products"} label={content?.link_label||"Melamine MDF"}/>
      <Image
        src={brand.heroStripes}
        alt=""
        aria-hidden="true"
        width={472}
        height={360}
        priority
        className="faromid-hero-stripes absolute bottom-[140px] left-1/2 h-auto w-[min(60vw,285px)] -translate-x-1/2 select-none sm:bottom-[150px] sm:w-[300px]"
      />
      <div className="absolute right-[8%] bottom-[34px] left-[8%] mx-auto max-w-[460px]">
        <span aria-hidden="true" className="absolute -top-3 right-0 h-6 w-7 border-t-2 border-r-2 border-[#ec1c24]" />
        <h1 className="m-0 px-5 text-center text-[15px] leading-[2] font-bold text-white sm:text-lg" dir="rtl">{content?.title||HERO_TITLE}</h1>
        {content?.subtitle&&<p className="mt-2 text-center text-xs leading-6 text-white/75">{content.subtitle}</p>}
        <span aria-hidden="true" className="absolute -bottom-3 left-0 h-6 w-7 border-b-2 border-l-2 border-[#ec1c24]" />
      </div>
    </div>
  );
}

export function HomeHero({content}: {content?:CMSSection}) {
  return (
    <section className="relative isolate w-full overflow-hidden" aria-label="معرفی فرامید">
      <DesktopHomeHero content={content}/>
      <MobileHomeHero content={content}/>
    </section>
  );
}
