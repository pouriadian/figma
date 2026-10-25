'use client';
import {useMemo,useState} from 'react';
import {MapPin,Search,Store} from 'lucide-react';
import type {PublicRepresentative} from '@/lib/public-representatives';
import {canonicalProvinceName} from '@/lib/iran-provinces';
import {IranRepresentativesMap} from './iran-representatives-map';

export function RepresentativeDirectory({items,dataAvailable=true}:{items:PublicRepresentative[];dataAvailable?:boolean}){
 const [search,setSearch]=useState('');
 const [province,setProvince]=useState('');
 const [shown,setShown]=useState(24);
 const regions=useMemo(()=>[...new Set(items.map(x=>canonicalProvinceName(x.province) ?? x.province).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fa')),[items]);
 const filtered=useMemo(()=>items.filter(item=>(!province||canonicalProvinceName(item.province)===province||item.province===province)&&[item.company_name,item.city,item.province].join(' ').toLocaleLowerCase('fa-IR').includes(search.toLocaleLowerCase('fa-IR').trim())),[items,search,province]);
 return <>
  <IranRepresentativesMap items={items} dataAvailable={dataAvailable} selectedProvince={province} onProvinceChange={next=>{setProvince(next);setShown(24)}} />
  <div id="representatives-directory-heading" className="scroll-mt-24 mb-3 mt-10 text-lg font-bold text-[#252926]">فهرست نمایندگان</div>
  <div className="mb-7 grid gap-3 rounded-2xl border border-[#e3e4e2] bg-white p-4 sm:grid-cols-[1fr_230px]"><label className="flex items-center gap-3 rounded-xl border border-[#dedfdf] px-4 py-3 text-[#787e78]"><Search size={19}/><input value={search} onChange={e=>{setSearch(e.target.value);setShown(24)}} className="w-full bg-transparent text-sm text-[#242b25] outline-none" placeholder="جستجوی نام نماینده یا شهر" aria-label="جستجوی نمایندگان" /></label><label className="flex items-center gap-2 rounded-xl border border-[#dedfdf] px-3"><span className="text-xs text-[#7e847c]">استان</span><select className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" value={province} onChange={e=>{setProvince(e.target.value);setShown(24)}}><option value="">همه استان‌ها</option>{regions.map(x=><option key={x} value={x}>{x}</option>)}</select></label></div>
  <p className="mb-5 text-sm text-[#687169]">{filtered.length.toLocaleString('fa-IR')} نماینده یافت شد</p>
  {filtered.length?<><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.slice(0,shown).map(rep=><article key={rep.id} className="rounded-[20px] border border-[#e5e7e3] bg-white p-6 shadow-sm"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f6eeee] text-[#b33445]"><Store size={23}/></div><h2 className="text-[17px] font-bold text-[#252926]">{rep.company_name}</h2><p className="mt-3 flex items-center gap-2 text-[13px] text-[#6e7670]"><MapPin size={16}/>{[rep.province,rep.city].filter(Boolean).join('، ')||'موقعیت هنوز ثبت نشده'}</p></article>)}</div>{shown<filtered.length&&<div className="mt-8 text-center"><button type="button" className="rounded-xl border border-[#bdc1bb] px-8 py-3 text-sm text-[#292d29] hover:bg-white" onClick={()=>setShown(n=>n+24)}>نمایش بیشتر</button></div>}</>:<div className="rounded-2xl border border-dashed border-[#ced1cd] bg-white px-6 py-14 text-center"><Store size={34} className="mx-auto mb-4 text-[#989d98]"/><p className="text-sm leading-8 text-[#858b85]">نماینده‌ای با این شرایط یافت نشد.</p></div>}
 </>;
}
