'use client';

import {useEffect,useState,type ReactNode} from 'react';
import {PageLoader} from '@/components/ui/page-loader';

/** Keep the branded loader visible for two seconds on the home page only. */
export function HomeLoadingGate({children}:{children:ReactNode}) {
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const timer=window.setTimeout(()=>{
      setLoading(false);
      document.body.classList.add('home-intro-ready');
      document.body.style.overflow=previousOverflow;
    },2000);

    return ()=>{
      window.clearTimeout(timer);
      document.body.classList.remove('home-intro-ready');
      document.body.style.overflow=previousOverflow;
    };
  },[]);

  return <>
    {loading&&<PageLoader/>}
    <div aria-hidden={loading||undefined} className={loading?'pointer-events-none select-none':''}>{children}</div>
  </>;
}
