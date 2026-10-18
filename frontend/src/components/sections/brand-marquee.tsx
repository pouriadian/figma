import type {CMSSection} from '@/lib/site-pages';

export const DEFAULT_MARQUEE_ITEMS = [
  'MATERIAL DESIGN',
  'CLEAN TOUCH',
  'SURFACE INNOVATION',
  'INTERIOR SPACES',
  'FAROMID',
];

/** Plain text, one phrase per line. Published CMS content is HTML-sanitized server-side. */
export function parseMarqueeItems(body?:string):string[] {
  const items=(body||'')
    .replace(/<br\s*\/?\s*>/gi,'\n')
    .replace(/<\/(?:p|div|li)>/gi,'\n')
    .replace(/<[^>]*>/g,'')
    .split(/\r?\n|\|/)
    .map(value=>value.trim().replace(/\s+/g,' '))
    .filter(Boolean)
    .slice(0,15);
  return items.length?items:DEFAULT_MARQUEE_ITEMS;
}

/** CSS-only marquee: duplicated for seamless looping; noninteractive duplicate is aria-hidden. */
export function BrandMarquee({content}:{content?:CMSSection}){
  const phrases=parseMarqueeItems(content?.body);
  const items=<>{phrases.map((phrase,i)=><span className="fm-marquee-item" key={`${i}-${phrase}`}><span aria-hidden="true" className="fm-marquee-dot"/>{phrase}</span>)}</>;
  return <section className="fm-brand-marquee" dir="ltr" aria-label="مفاهیم برند فرامید">
    <div className="fm-marquee-track">
      <div className="fm-marquee-unit">{items}</div>
      <div className="fm-marquee-unit" aria-hidden="true">{items}</div>
    </div>
  </section>;
}
