'use client';
import {useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Menu, X} from 'lucide-react';
import {links} from '@/lib/constants';
import {brand} from '@/lib/media';

export function MobileHeader(){
  const [open,setOpen]=useState(false);
  const current=usePathname();
  return <header className="m-header">
    <Link href="/" aria-label="صفحه اصلی فرامید" onClick={()=>setOpen(false)}>
      <Image src={brand.logo} width={166} height={48} alt="Faromid Group" priority/>
    </Link>
    <button className="m-menu-toggle" type="button" aria-label={open?'بستن منو':'باز کردن منو'} aria-expanded={open} onClick={()=>setOpen(s=>!s)}>{open?<X/>:<Menu/>}</button>
    {open&& <nav className="m-navigation" aria-label="منوی اصلی">
      {links.map(item=><Link className={current===item.href?'is-active':''} key={item.href} href={item.href} onClick={()=>setOpen(false)}>{item.label}</Link>)}
    </nav>}
  </header>;
}
