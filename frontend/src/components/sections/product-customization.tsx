import {ArrowUpLeft,Blend,Layers3} from 'lucide-react';
import Link from 'next/link';
import {Container} from '@/components/ui/brand-ui';

export function ProductCustomization(){
  return <section aria-labelledby="product-customization-title" className="relative isolate overflow-hidden bg-[#222825] py-14 text-white sm:py-20">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background:radial-gradient(circle_at_15%_20%,rgba(192,44,57,.34),transparent_35%),radial-gradient(circle_at_88%_80%,rgba(205,176,116,.16),transparent_30%)]"/>
    <Container>
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)] lg:gap-16">
        <div>
          <span dir="ltr" className="mb-4 block text-[10px] font-semibold tracking-[.24em] text-white/50">FAROMID CUSTOM SURFACES</span>
          <h2 id="product-customization-title" className="m-0 max-w-2xl text-[clamp(1.7rem,3vw,3rem)] font-semibold leading-[1.35]">رنگ دلخواه شما، با بافت انتخابی شما</h2>
          <p className="mb-0 mt-5 max-w-2xl text-sm leading-8 text-white/70 sm:text-base">فرامید به‌عنوان تولیدکننده ورق‌های MDF، امکان ترکیب رنگ و بافت از کدهای مختلف محصولات خود را فراهم کرده است. شما می‌توانید رنگ یک کد را با بافت کدی دیگر انتخاب کنید تا محصولی متناسب با طرح و نیاز پروژه‌تان تولید شود.</p>
          <Link href="/contact" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#252b27] transition hover:-translate-y-0.5 hover:bg-[#f5e9e7]">مشاوره برای انتخاب ترکیب <ArrowUpLeft size={17}/></Link>
        </div>
        <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4">
          <div className="flex min-h-44 flex-col rounded-[22px] border border-white/15 bg-white/[.07] p-5 backdrop-blur-sm sm:min-h-48"><Blend size={22} className="mb-6 shrink-0 text-[#e1b9a8]"/><strong className="block text-sm">ترکیب آزاد رنگ</strong><span className="mt-2 block text-xs leading-6 text-white/55">انتخاب رنگ از کدهای واقعی محصولات</span></div>
          <div className="flex min-h-44 flex-col rounded-[22px] border border-white/15 bg-white/[.07] p-5 backdrop-blur-sm sm:min-h-48"><Layers3 size={22} className="mb-6 shrink-0 text-[#e1b9a8]"/><strong className="block text-sm">بافت متناسب پروژه</strong><span className="mt-2 block text-xs leading-6 text-white/55">هماهنگی حس بصری و لمسی سطح</span></div>
        </div>
      </div>
    </Container>
  </section>;
}
