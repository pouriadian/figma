import {SiteShell} from '@/components/layout/site-shell';
import {RequestTracker} from '@/components/request-tracker';
export const metadata={title:'پیگیری درخواست | فرامید'};
export default async function Page({searchParams}:{searchParams:Promise<{code?:string}>}){
 const {code}=await searchParams;
 return <SiteShell><section className="min-h-[60vh] bg-[#f5f5f1] px-5 py-20"><RequestTracker initialCode={code||''}/></section></SiteShell>;
}
