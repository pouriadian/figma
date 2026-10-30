const palettes:Record<string,string>={
  'natural-oak':'from-[#a9815e] via-[#d2b99b] to-[#806044]',
  'soft-matte':'from-[#b7b9b1] via-[#d7d8d1] to-[#999b93]',
  'linen-structure':'from-[#b9afa2] via-[#ded7cd] to-[#9d9286]',
};

export function TexturePreview({slug,className=''}:{slug:string;className?:string}){
  const wood=slug==='natural-oak';
  const linen=slug==='linen-structure';
  return <div aria-label="پیش‌نمایش تصویری نمونه؛ تصویر واقعی هنوز ثبت نشده است" role="img" className={`relative grid place-items-center overflow-hidden bg-gradient-to-br ${palettes[slug]||'from-[#d8d7d0] via-[#ecebe6] to-[#b9b9b2]'} ${className}`}>
    <span aria-hidden="true" className="absolute inset-0 opacity-[.2]" style={{backgroundImage:wood?'repeating-linear-gradient(172deg,transparent 0 8px,rgba(60,40,25,.34) 9px,transparent 11px 20px)':linen?'repeating-linear-gradient(0deg,transparent 0 5px,rgba(75,68,58,.25) 6px,transparent 7px 11px),repeating-linear-gradient(90deg,transparent 0 5px,rgba(255,255,255,.4) 6px,transparent 7px 11px)':'radial-gradient(ellipse at 30% 25%,rgba(255,255,255,.38),transparent 55%)'}}/>
    <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_15%,rgba(255,255,255,.38),transparent_55%)]"/>
    <span className="relative rounded-full border border-white/45 bg-white/50 px-3 py-1.5 text-[10px] font-medium text-[#3f403a] shadow-sm backdrop-blur-sm">پیش‌نمایش نمونه</span>
  </div>;
}
