import type {ReactNode} from 'react';
import {SiteHeader} from './site-header';
import {SiteAnalytics} from '@/components/site-analytics';
import {SiteFooter} from './site-footer';

export function SiteShell({children,overlayHeader=false}:{children:ReactNode;overlayHeader?:boolean}){
 return <div className="relative min-h-screen overflow-x-clip bg-[#f7f6f2] text-[#202221]" dir="rtl">
   <a href="#main-content" className="sr-only z-[300] rounded-lg bg-white px-4 py-2 text-black focus:not-sr-only focus:fixed focus:top-2 focus:right-2">رفتن به محتوای اصلی</a>
   <SiteAnalytics/><SiteHeader/><main id="main-content" className={overlayHeader?"relative -mt-[90px] sm:-mt-[98px]":"relative"}>{children}</main><SiteFooter/>
 </div>;
}
