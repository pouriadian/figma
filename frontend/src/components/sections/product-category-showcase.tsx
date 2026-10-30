import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpLeft} from 'lucide-react';
import type {ProductCategory} from '@/lib/api';
import {Container} from '@/components/ui/brand-ui';

const visualCategories=[
  {name:'طرح چوب',latin:'WOOD',image:null},
  {name:'طرح سنگ',latin:'STONE',image:'/assets/products-page/IMG_3342.PNG'},
  {name:'طرح کتان',latin:'LINEN',image:'/assets/products-page/IMG_3344.PNG'},
  {name:'طرح بتن',latin:'CONCRETE',image:null},
  {name:'طرح چرم',latin:'LEATHER',image:'/assets/products-page/IMG_3345.PNG'},
  {name:'یونی کالر',latin:'UNI COLOR',image:null},
  {name:'مات و آنتی فینگر',latin:'MATTE / ANTI-FINGER',image:null},
  {name:'فانتزی',latin:'FANTASY',image:null},
  {name:'طرح متال',latin:'METAL',image:null},
];

export function ProductCategoryShowcase({categories}:{categories:ProductCategory[]}){
  const categoryHref=categories[0]?`/products?by=collection&category=${encodeURIComponent(categories[0].slug)}`:'/products';
  return <section className="bg-[#fbfaf8] py-8 sm:py-10" dir="rtl">
    <Container>
      <div className="mb-6 flex items-center justify-between gap-5 sm:mb-8"><div className="flex items-center gap-3"><span className="h-px w-8 bg-[#c52d3d]"/><span className="text-[9px] font-semibold tracking-[.3em] text-[#777a75]" dir="ltr">MATERIAL COLLECTION</span></div><div className="text-right"><h2 className="m-0 text-xl font-extrabold tracking-[-.03em] text-[#222522] sm:text-2xl">دسته‌بندی محصولات</h2><p className="mb-0 mt-1 text-[10px] leading-5 text-[#858a82]">طرح مورد نظر خود را انتخاب کنید</p></div></div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-7 lg:gap-x-6">
        {visualCategories.map(item=><Link href={categoryHref} key={item.latin} className="group block h-full overflow-hidden rounded-[16px] border border-[#e8e9e5] bg-white shadow-[0_5px_24px_rgba(27,31,27,.045)] transition-[box-shadow,border-color,transform] duration-300 hover:-translate-y-1 hover:border-[#c7cdc6] hover:shadow-[0_17px_36px_rgba(27,31,27,.11)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c52d3d] sm:rounded-[21px]"><div className="relative aspect-[1.08] overflow-hidden bg-[#eeeae4]">{item.image?<Image src={item.image} alt={item.name} fill sizes="(max-width:640px) 48vw, (max-width:1024px) 31vw, 30vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"/>:<div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#ecebe7,#f7f6f2)] px-4 text-center"><span className="text-[10px] leading-6 text-[#a2a49d]">تصویر این دسته<br/>به‌زودی اضافه می‌شود</span></div>}<span className="absolute bottom-2 left-2 grid h-7 w-7 place-items-center text-[#30332f] transition group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:text-[#c52d3d]"><ArrowUpLeft size={19}/></span></div><div className="flex min-h-[62px] items-center justify-between gap-2 px-3 py-2 text-right sm:min-h-[76px] sm:px-5 sm:py-4"><div><h3 className="m-0 text-xs font-semibold text-[#262c28] sm:text-[16px]">{item.name}</h3><span className="mt-1 block text-[8px] tracking-[.24em] text-[#7f8580] sm:mt-2 sm:text-[10px]" dir="ltr">{item.latin}</span></div><ArrowUpLeft size={17} className="shrink-0 text-[#747b75] transition-transform duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1"/></div></Link>)}
      </div>
    </Container>
  </section>;
}
