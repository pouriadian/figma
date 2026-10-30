'use client';

import {useMemo, useState} from 'react';
import dynamic from 'next/dynamic';
import {Building2, ChevronDown, MapPin, MapPinned, Search, Users} from 'lucide-react';
import type {PublicRepresentative} from '@/lib/public-representatives';
import {canonicalProvinceName, IRAN_PROVINCES, type IranProvinceName} from '@/lib/iran-provinces';
import {IRAN_MAP_KEYS, mapKeyFromProvince, provinceFromMapKey} from '@/lib/iran-map-keys';
import styles from './iran-representatives-map.module.css';

const VectorIranMap=dynamic(()=>import('react-iran-map').then(module=>module.IranMap),{ssr:false,loading:()=> <div className={styles.mapSkeleton} role="status">در حال نمایش نقشه…</div>});
type Props={items:PublicRepresentative[];dataAvailable:boolean;selectedProvince:string;onProvinceChange:(province:string)=>void};
const numberFa=new Intl.NumberFormat('fa-IR');

export function IranRepresentativesMap({items,dataAvailable,selectedProvince,onProvinceChange}:Props){
 const [selected,setSelected]=useState(selectedProvince);
 const [hoveredProvince,setHoveredProvince]=useState<IranProvinceName|null>(null);
 const [query,setQuery]=useState('');
 const counts=useMemo(()=>{
  const output=Object.fromEntries(IRAN_PROVINCES.map(name=>[name,0])) as Record<IranProvinceName,number>;
  for(const representative of items){const province=canonicalProvinceName(representative.province);if(province)output[province]+=1;}
  return output;
 },[items]);
 const cities=useMemo(()=>new Set(items.map(item=>item.city?.trim()).filter(Boolean)).size,[items]);
 const regions=useMemo(()=>IRAN_PROVINCES.filter(name=>!query.trim()||name.toLocaleLowerCase('fa-IR').includes(query.trim().toLocaleLowerCase('fa-IR'))),[query]);
 const selectedName=canonicalProvinceName(selected);
 const selectedKey=selectedName?mapKeyFromProvince(selectedName):undefined;
 const detailName=hoveredProvince||selectedName;
 const selectedCount=detailName?counts[detailName]:items.length;
 const mapData=useMemo(()=>Object.fromEntries(IRAN_MAP_KEYS.map(([key,province])=>[key,dataAvailable?counts[province]:0])),[counts,dataAvailable]);
 function chooseProvince(value:string){setSelected(value);onProvinceChange(value)}
 function handleProvinceClick(value:string){const name=provinceFromMapKey(value);if(name)chooseProvince(selectedName===name?'':name)}
 return <section className={styles.section} aria-label="نقشه نمایندگان فرامید">
  <div className={styles.headingRow}><div><span className={styles.eyebrow}>FAROMID NETWORK</span><h1>نمایندگان فرامید</h1><p>شبکهٔ نمایندگان فعال فرامید در سراسر کشور</p></div><div className={styles.kpis}>
    <div className={styles.kpi}><span><Users size={18}/></span><strong>{dataAvailable?numberFa.format(items.length):'—'}</strong><small>تعداد نمایندگان</small></div>
    <div className={styles.kpi}><span><MapPinned size={18}/></span><strong>{dataAvailable?numberFa.format(IRAN_PROVINCES.filter(name=>counts[name]>0).length):'—'}</strong><small>استان‌های تحت پوشش</small></div>
    <div className={styles.kpi}><span><Building2 size={18}/></span><strong>{dataAvailable?numberFa.format(cities):'—'}</strong><small>شهرهای فعال</small></div>
  </div></div>
  <div className={styles.toolbar}><label className={styles.searchBox}><Search size={18}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="جستجوی استان…" aria-label="جستجوی استان"/></label><label className={styles.selectBox}><MapPin size={17}/><select value={selectedName??''} onChange={event=>chooseProvince(event.target.value)} aria-label="انتخاب استان"><option value="">همه استان‌ها</option>{regions.map(name=><option value={name} key={name}>{name}</option>)}</select><ChevronDown size={16}/></label></div>
  <div className={styles.dashboardGrid}><div className={styles.mapPanel}><div className={styles.mapControls} aria-hidden="true"><button type="button">+</button><button type="button">−</button></div><div className={styles.mapViewport} aria-label="نقشه تعاملی استان‌های ایران" onMouseOver={event=>{const province=canonicalProvinceName((event.target as Element).closest('path[data-name], polygon[data-name]')?.getAttribute('data-name')||'');setHoveredProvince(province||null)}} onMouseLeave={()=>setHoveredProvince(null)}><VectorIranMap key={selectedKey??'all-provinces'} data={mapData} colorRange="214, 135, 145" deactiveProvinceColor="#e4e9ec" selectedProvinceColor="#d8878f" defaultSelectedProvince={selectedKey} tooltipTitle="تعداد نمایندگان: " textColor="#41484d" width={1100} selectProvinceHandler={handleProvinceClick}/></div><div className={styles.mapLegend}><span><i className={styles.activeDot}/>استان دارای نماینده</span><span><i className={styles.inactiveDot}/>سایر استان‌ها</span></div></div>
   <aside className={styles.detailPanel}>{detailName?<><span className={styles.detailEyebrow}>{hoveredProvince?'پیش‌نمایش استان':'استان انتخاب‌شده'}</span><h2><MapPin size={22}/>{detailName}</h2><strong className={styles.detailNumber}>{dataAvailable?numberFa.format(selectedCount):'—'}</strong><p>نماینده فعال در این استان</p>{!hoveredProvince&&<button type="button" onClick={()=>chooseProvince('')} className={styles.clearButton}>نمایش کل کشور</button>}</>:<><span className={styles.detailEyebrow}>پوشش سراسری</span><h2><MapPinned size={22}/>نمایندگان فرامید</h2><strong className={styles.detailNumber}>{dataAvailable?numberFa.format(selectedCount):'—'}</strong><p>نماینده در شبکهٔ فرامید</p><div className={styles.detailHint}>با حرکت روی استان‌ها جزئیات آن‌ها را ببینید.</div></>}</aside>
  </div>
 </section>;
}
