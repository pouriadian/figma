'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {recordView} from '@/lib/analytics-client';

export function SiteAnalytics(){
 const path=usePathname();
 useEffect(()=>{
   if(!path || ['/panel','/admin','/api','/representative'].some(p=>path===p||path.startsWith(p+'/')))return;
   void recordView(`page:${path}`,{kind:'page_view',path:path.slice(0,250)});
 },[path]);
 return null;
}
