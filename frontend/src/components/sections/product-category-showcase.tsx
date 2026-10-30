import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpLeft} from 'lucide-react';
import type {ProductCategory} from '@/lib/api';
import {Container} from '@/components/ui/brand-ui';

const swatches=['from-[#d8c7b4] via-[#eee6dc] to-[#bca58f]','from-[#d9ddd6] via-[#f1f1ed] to-[#bfc5bd]','from-[#c7b39f] via-[#e2d7ca] to-[#a99582]','from-[#bbbdb7] via-[#e5e5df] to-[#a7aaa2]'];
const categoryImages:Record<string,string>={
  stone:'/assets/products-page/IMG_3342.PNG',
  linen:'/assets/products-page/IMG_3344.PNG',
  leather:'/assets/products-page/IMG_3345.PNG',
};

export function ProductCategoryShowcase({categories}:{categories:ProductCategory[]}){
  return <section className="bg-[#fbfaf8] py-8 sm:py-10" dir="rtl">
    <Container>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5 sm:mb-8">
        <div className="text-right"><h2 className="m-0 text-xl font-extrabold tracking-[-.03em] text-[#222522] sm:text-2xl">دسته‌بندی محصولات</h2><p className="mb-0 mt-1 text-[10px] leading-5 text-[#858a82]">طرح مورد نظر خود را انتخاب کنید</p></div>
        <div dir="ltr" className="flex items-center gap-3"><span className="h-[3px] w-9 rounded-full bg-[#c52d3d]"/><span className="text-[9px] font-semibold tracking-[.3em] text-[#777a75]">MATERIAL COLLECTION</span></div>
      </div>
      {categories.length?<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-5">
        {categories.map((category,index)=><Link href={`/products?by=collection&category=${encodeURIComponent(category.slug)}`} key={category.id} className="group block h-full overflow-hidden rounded-[16px] border border-[#e8e9e5] bg-white shadow-[0_5px_24px_rgba(27,31,27,.045)] transition-[box-shadow,border-color,transform] duration-300 hover:-translate-y-1 hover:border-[#c7cdc6] hover:shadow-[0_17px_36px_rgba(27,31,27,.11)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c52d3d] sm:rounded-[21px]">
          <div aria-hidden="true" className={`relative aspect-[1.3] w-full overflow-hidden bg-gradient-to-br ${swatches[index%swatches.length]} sm:aspect-[.98] lg:aspect-[.89]`}>{categoryImages[category.slug]?<Image src={categoryImages[category.slug]} alt="" fill sizes="(max-width:640px) 46vw, (max-width:1024px) 30vw, 320px" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"/>:<><span className="absolute inset-0 opacity-[.18]" style={{backgroundImage:'repeating-linear-gradient(112deg,transparent 0 11px,rgba(80,65,50,.16) 12px,transparent 14px 26px)'}}/><span className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_20%,rgba(255,255,255,.45),transparent_60%)]"/><span className="absolute bottom-3 right-3 rounded-full border border-white/50 bg-white/50 px-2.5 py-1 text-[9px] text-[#56574f] backdrop-blur-sm">تصویر به‌زودی</span></>}</div>
          <div className="flex min-h-[62px] items-center justify-between gap-2 px-3 py-2 text-right sm:min-h-[76px] sm:px-5 sm:py-4"><div className="min-w-0"><h3 className="m-0 truncate text-xs font-semibold text-[#262c28] sm:text-[16px]">{category.name}</h3><span className="mt-1 block text-[8px] tracking-[.16em] text-[#7f8580] sm:mt-2 sm:text-[10px]" dir="ltr">{category.slug.replaceAll('-',' ').toUpperCase()}</span></div><ArrowUpLeft size={17} className="shrink-0 text-[#747b75] transition-transform duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1"/></div>
        </Link>)}
      </div>:<div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-[#d9ddd7] bg-white p-8 text-center text-sm text-[#747b75]">هنوز دسته‌بندی محصولی ثبت نشده است.</div>}
    </Container>
  </section>;
}
