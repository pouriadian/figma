import {SiteShell} from '@/components/layout/site-shell';
import {DealerLogin} from '@/components/portal/dealer-login';
export const metadata={title:'ورود نمایندگان | فرامید',robots:{index:false,follow:false}};
export default function Page(){return <SiteShell><section className="min-h-[75vh] bg-[#f4f5f2] px-4 py-16 sm:py-24"><DealerLogin/></section></SiteShell>}
