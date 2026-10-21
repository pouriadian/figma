import Link from 'next/link';
import {ShieldCheck,Store} from 'lucide-react';
import {SiteShell} from '@/components/layout/site-shell';
import {Container} from '@/components/ui/brand-ui';
import {getPublicRepresentatives} from '@/lib/public-representatives';
import {RepresentativeDirectory} from './representative-directory';

export async function RepresentativesView(){
 const {results}=await getPublicRepresentatives();
 return <SiteShell><main className="min-h-[65vh] bg-[#f6f6f3] py-12 sm:py-20" dir="rtl">
  <Container><div className="mb-9 flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[#e2e5df] bg-white/80 p-4 shadow-[0_10px_30px_rgba(24,32,26,.05)] backdrop-blur-sm sm:p-5"><div className="max-w-2xl"><span dir="ltr" className="mb-3 block text-[10px] font-semibold tracking-[.24em] text-[#7b837c] sm:text-xs">FAROMID REPRESENTATIVES</span><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e6e7e3] px-3 py-1.5 text-xs text-[#505551]"><ShieldCheck size={15}/>فقط نمایندگان تأییدشده</div><h1 className="m-0 text-[clamp(22px,2.4vw,30px)] font-bold leading-snug text-[#222624]">نمایندگان فرامید</h1><p className="mb-0 mt-2 text-sm leading-7 text-[#69716b]">فهرست نمایندگانی که برای نمایش در وب‌سایت تأیید شده‌اند. اطلاعات شخصی و فروش داخلی اینجا منتشر نمی‌شود.</p></div><Link href="/dealership" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#1b1c1b] px-5 py-3 text-sm text-white transition-colors hover:bg-[#3b3e3c]">درخواست نمایندگی</Link></div>
   {results.length?<RepresentativeDirectory items={results}/>:<div className="rounded-2xl border border-dashed border-[#ced1cd] bg-white px-6 py-16 text-center"><Store size={34} className="mx-auto mb-4 text-[#989d98]"/><h2 className="mb-3 text-lg font-bold text-[#3b403c]">فهرست در حال تکمیل است</h2><p className="text-sm leading-8 text-[#858b85]">پس از تأیید نمایندگان توسط مدیریت، اسامی آن‌ها در این بخش نمایش داده می‌شود.</p></div>}

  </Container>
 </main></SiteShell>;
}
