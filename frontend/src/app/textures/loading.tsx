import {Skeleton,TextureGridSkeleton} from '@/components/ui/skeletons';

export default function TexturesLoading(){
  return <main aria-label="در حال بارگذاری بافت‌ها" className="bg-[#f8f7f4] pb-16">
    <section className="border-b border-[#e7e5df] bg-white py-12 sm:py-16"><div className="mx-auto w-[90%] max-w-[1440px]"><Skeleton className="block h-11 w-64"/><Skeleton className="mt-4 block h-5 w-full max-w-xl"/></div></section>
    <div className="mx-auto w-[90%] max-w-[1440px] pt-8 sm:pt-12"><Skeleton className="mb-7 block h-14 rounded-2xl"/><TextureGridSkeleton count={3}/></div>
  </main>;
}
