import Image from 'next/image';
import {Container} from '@/components/ui/brand-ui';

/** Compact photo banner; uses the original unmodified per-page image. */
export function PageIntro({title,image,subtitle,description,subtitleDir='ltr',titleDir='rtl',compact=false,plain=false}: {title:string;image?:string;subtitle?:string;description?:string;subtitleDir?:'ltr'|'rtl';titleDir?:'ltr'|'rtl';compact?:boolean;plain?:boolean}) {
  return <section className={`relative isolate -mt-[68px] flex items-center overflow-hidden pt-[68px] sm:-mt-[76px] sm:pt-[76px] ${plain?'bg-[#f4f4f0] text-[#252a26]':`bg-[#343b36] text-white ${compact?'min-h-[300px] sm:min-h-[360px]':'min-h-[370px] sm:min-h-[440px] lg:min-h-[470px]'}`}`}>
    {image&&!plain&&<><Image src={image} fill priority alt={title} sizes="100vw" className="-z-10 object-cover object-center" /><div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(270deg,rgba(20,25,22,.5)_0%,rgba(20,25,22,.27)_52%,rgba(20,25,22,.08)_100%)]" /></>}
    <Container className={`relative ${plain&&compact?'py-7 sm:py-9':'py-12 sm:py-16'}`}>
      <div className={`w-fit max-w-full rounded-[26px] border p-5 shadow-[0_16px_48px_rgba(0,0,0,.08)] backdrop-blur-[2px] sm:p-7 ${plain?'border-[#e3e6df] bg-white/80':'border-white/20 bg-[#202522]/25'}`}>
        {subtitle && <span dir={subtitleDir} className={`mb-3 block text-[10px] font-semibold tracking-[.24em] sm:text-xs ${plain?'text-[#6d756d]':'text-white/80'}`}>{subtitle}</span>}
        <h1 dir={titleDir} className={`m-0 max-w-[min(72vw,640px)] ${compact?'text-[clamp(1.55rem,3vw,2.45rem)]':'text-[clamp(2rem,4vw,3.5rem)]'} leading-[1.25] font-semibold ${titleDir==='ltr'?'text-right tracking-[-.035em]':''} ${plain?'text-[#252a26]':'text-white'}`}>{title}</h1>
        {description&&<p dir="rtl" className={`mb-0 mt-3 max-w-xl text-sm leading-7 ${plain?'text-[#687169]':'text-white/90'} ${compact?'sm:text-sm':'sm:text-base'}`}>{description}</p>}
      </div>
    </Container>
  </section>;
}
