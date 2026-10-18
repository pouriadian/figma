import Image from 'next/image';
import {Container} from '@/components/ui/brand-ui';

/** Compact photo banner; uses the original unmodified per-page image. */
export function PageIntro({title,image,subtitle,compact=false}: {title:string;image:string;subtitle?:string;compact?:boolean}) {
  return <section className={`relative isolate flex items-center overflow-hidden bg-[#1b1d1b] text-white ${compact?'min-h-[260px] sm:min-h-[320px]':'min-h-[310px] sm:min-h-[390px] lg:min-h-[450px]'}`}>
    <Image src={image} fill priority alt={title} sizes="100vw" className="-z-10 object-cover object-center" />
    <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(13,17,14,.47),rgba(13,17,14,.78))]" />
    <Container className="relative py-14">
      {subtitle && <span className="mb-4 block text-xs tracking-[.17em] text-white/75 [direction:ltr]">{subtitle}</span>}
      <h1 className="m-0 max-w-[780px] text-[clamp(2rem,4.6vw,4.3rem)] leading-[1.55] font-semibold text-white">{title}</h1>
    </Container>
  </section>;
}
