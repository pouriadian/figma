'use client';

import {useEffect,useMemo,useState} from 'react';
import {ArrowDownUp,Search,SlidersHorizontal,X} from 'lucide-react';
import type {ProductApiItem,ProductCategory} from '@/lib/api';
import {ProductCard} from '@/components/ui/product-card';

type FilterKey='color'|'material'|'texture'|'application';
type Sort='code-asc'|'code-desc'|'name-asc';
const features:Record<FilterKey,{label:string;aliases:string[]}>= {
  color:{label:'رنگ',aliases:['رنگ','color','colour']},
  material:{label:'جنس / متریال',aliases:['جنس','متریال','material','type']},
  texture:{label:'بافت',aliases:['بافت','texture','finish']},
  application:{label:'کاربری',aliases:['کاربری','کاربرد','application','usage']},
};
const featureKeys=Object.keys(features) as FilterKey[];
const clean=(value:unknown)=>typeof value==='string'?value.trim():typeof value==='number'?String(value):'';
function attr(product:ProductApiItem,key:FilterKey){
  const specs=product.technical_specs||{};
  const match=Object.entries(specs).find(([field,value])=>features[key].aliases.some(alias=>alias.toLowerCase()===field.trim().toLowerCase())&&!!clean(value));
  return match?clean(match[1]):'';
}
function restore(key:string){return typeof window==='undefined'?'':new URLSearchParams(window.location.search).get(key)||''}

/** Category first; then searchable and shareable product filters. All options come from API data. */
export function ProductCollection({products,categories}:{products:ProductApiItem[];categories:ProductCategory[]}){
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('');
  const [sort,setSort]=useState<Sort>('code-asc');
  const [featureSelection,setFeatureSelection]=useState<Record<FilterKey,string>>({color:'',material:'',texture:'',application:''});
  const [initialized,setInitialized]=useState(false);
  useEffect(()=>{
    const apply=()=>{
      setQuery(restore('search'));
      setCategory(restore('category'));
      const s=restore('sort');setSort(s==='code-desc'||s==='name-asc'?s:'code-asc');
      setFeatureSelection({color:restore('color'),material:restore('material'),texture:restore('texture'),application:restore('application')});
      setInitialized(true);
    };
    apply();window.addEventListener('popstate',apply);return()=>window.removeEventListener('popstate',apply);
  },[]);
  useEffect(()=>{
    if(!initialized)return;
    const url=new URL(window.location.href);
    const values:Record<string,string>={search:query.trim(),category,sort:sort==='code-asc'?'':sort,...featureSelection};
    Object.entries(values).forEach(([key,value])=>value?url.searchParams.set(key,value):url.searchParams.delete(key));
    if(url.href!==window.location.href)window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
  },[initialized,query,category,sort,featureSelection]);

  const availableFeatures=useMemo(()=>featureKeys.map(key=>({
    key,label:features[key].label,values:[...new Set(products.map(product=>attr(product,key)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fa')),
  })).filter(feature=>feature.values.length>0),[products]);
  const visible=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase('fa');
    const filtered=products.filter(product=>{
      const matchingCategory=!category||product.category_slug===category;
      const searchable=[product.code,product.name,product.model,product.dimensions,product.category_name].map(value=>String(value||'').toLocaleLowerCase('fa'));
      return matchingCategory&&(!needle||searchable.some(value=>value.includes(needle)))&&
        featureKeys.every(key=>!featureSelection[key]||attr(product,key)===featureSelection[key]);
    });
    return filtered.sort((a,b)=>{
      if(sort==='name-asc')return (a.name||'').localeCompare(b.name||'','fa');
      const comparison=String(a.code).localeCompare(String(b.code),'en',{numeric:true});
      return sort==='code-desc'?-comparison:comparison;
    });
  },[products,category,query,sort,featureSelection]);
  const hasFilters=!!query||!!category||sort!=='code-asc'||featureKeys.some(key=>featureSelection[key]);
  function clear(){setQuery('');setCategory('');setSort('code-asc');setFeatureSelection({color:'',material:'',texture:'',application:''})}
  function chooseCategory(slug:string){setCategory(slug);setFeatureSelection({color:'',material:'',texture:'',application:''})}

  return <div dir="rtl" className="fm-product-explorer">
    <div className="mb-7 border-b border-[#eae8e5] pb-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="m-0 text-[15px] font-semibold text-[#292a29]">۱. انتخاب دسته‌بندی</h3><span className="text-xs text-[#888]">{categories.length} دسته‌بندی</span></div>
      <div className="flex snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]" role="group" aria-label="دسته‌بندی محصولات">
        <button type="button" aria-pressed={!category} onClick={()=>chooseCategory('')} className={`fm-category-tab ${!category?'is-active':''}`}>همه محصولات</button>
        {categories.map(item=><button type="button" key={item.id} aria-pressed={category===item.slug} onClick={()=>chooseCategory(item.slug)} className={`fm-category-tab ${category===item.slug?'is-active':''}`}>{item.name}</button>)}
      </div>
    </div>
    <div className="mb-8 rounded-2xl border border-[#e9e7e4] bg-[#fafaf9] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><h3 className="m-0 inline-flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal size={17} className="text-[#c12736]"/> ۲. جستجو و فیلتر</h3>{hasFilters&&<button onClick={clear} type="button" className="inline-flex items-center gap-1 text-xs text-[#b42030] hover:underline"><X size={15}/> پاک کردن فیلترها</button>}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <label className="fm-product-search"><span className="sr-only">جستجوی محصول</span><Search size={17} className="pointer-events-none text-[#858a84]"/><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="نام، مدل یا کد محصول..."/></label>
        {availableFeatures.map(feature=><label key={feature.key} className="fm-filter-select"><span className="sr-only">{feature.label}</span><select aria-label={feature.label} value={featureSelection[feature.key]} onChange={event=>setFeatureSelection(current=>({...current,[feature.key]:event.target.value}))}><option value="">{feature.label}: همه</option>{feature.values.map(value=><option value={value} key={value}>{value}</option>)}</select></label>)}
        <label className="fm-filter-select"><span className="sr-only">مرتب‌سازی</span><ArrowDownUp size={16} className="text-[#858a84]"/><select aria-label="مرتب‌سازی محصولات" value={sort} onChange={event=>setSort(event.target.value as Sort)}><option value="code-asc">کد: صعودی</option><option value="code-desc">کد: نزولی</option><option value="name-asc">نام: الفبایی</option></select></label>
      </div>
    </div>
    <div className="mb-5 flex items-center justify-between gap-2"><h3 className="m-0 text-lg font-semibold text-[#262a27]">محصولات {category&&categories.find(item=>item.slug===category)?.name}</h3><span aria-live="polite" className="rounded-full bg-[#f5f5f3] px-4 py-2 text-xs text-[#59605b]">{visible.length.toLocaleString('fa-IR')} محصول</span></div>
    {visible.length?<div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">{visible.map(product=><ProductCard key={product.id} product={product}/>)}</div>:
      <div className="grid min-h-52 place-items-center rounded-3xl border border-[#e5e5e2] bg-[#fafafa] p-8 text-center"><div><p className="text-sm font-semibold text-[#454a46]">محصولی با این شرایط یافت نشد.</p><p className="mt-2 text-xs text-[#818582]">دسته‌بندی یا فیلترها را تغییر دهید.</p><button type="button" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#202224] px-4 py-2.5 text-xs text-white hover:bg-[#3a3d3e]" onClick={clear}>نمایش همه محصولات</button></div></div>}
  </div>;
}
