'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDownUp,ChevronLeft,ChevronRight,Search,SlidersHorizontal,X} from 'lucide-react';
import type {ProductApiItem,ProductCategory} from '@/lib/api';
import {ProductCard} from '@/components/ui/product-card';

type FilterKey='color'|'material'|'texture'|'application';
type BrowseMode='texture'|'effect'|'collection';
type Sort='code-asc'|'code-desc'|'name-asc';
const PAGE_SIZE=8;
const features:Record<FilterKey,{label:string;aliases:string[]}>= {
  color:{label:'رنگ',aliases:['رنگ','color','colour']},
  material:{label:'جنس / متریال',aliases:['جنس','متریال','material','type']},
  texture:{label:'بافت',aliases:['بافت','texture','finish']},
  application:{label:'کاربری',aliases:['کاربری','کاربرد','application','usage']},
};
const browseModes:{key:BrowseMode;label:string;en:string}[]=[
  {key:'texture',label:'بافت',en:'BY TEXTURE'},
  {key:'effect',label:'جلوه',en:'BY EFFECT'},
  {key:'collection',label:'کالکشن',en:'BY COLLECTION'},
];
const browseAliases:Record<Exclude<BrowseMode,'collection'>,string[]>={
  texture:['بافت','texture','finish','surface'],
  effect:['جلوه','اثر','effect','visual effect'],
};
const featureKeys=Object.keys(features) as FilterKey[];
const clean=(value:unknown)=>typeof value==='string'?value.trim():typeof value==='number'?String(value):'';
function specValue(product:ProductApiItem,aliases:string[]){
  const specs=product.technical_specs||{};
  const match=Object.entries(specs).find(([field,value])=>aliases.some(alias=>alias.toLowerCase()===field.trim().toLowerCase())&&!!clean(value));
  return match?clean(match[1]):'';
}
function attr(product:ProductApiItem,key:FilterKey){return specValue(product,features[key].aliases)}
function restore(key:string){return typeof window==='undefined'?'':new URLSearchParams(window.location.search).get(key)||''}
function glassButton(active=false){return `inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-xs font-medium backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] disabled:pointer-events-none disabled:opacity-40 ${active?'border-[#292d2a]/75 bg-[#292d2a]/85 text-white shadow-[0_8px_24px_rgba(32,38,33,.18)]':'border-white/70 bg-white/65 text-[#454b46] shadow-[0_4px_16px_rgba(34,40,35,.07)] hover:bg-white/90'}`}

/** Filter-first catalog: texture/effect options are derived from real product specs, never invented. */
export function ProductCollection({products,categories}:{products:ProductApiItem[];categories:ProductCategory[]}){
  const [query,setQuery]=useState('');
  const [mode,setMode]=useState<BrowseMode>('collection');
  const [category,setCategory]=useState('');
  const [facet,setFacet]=useState('');
  const [sort,setSort]=useState<Sort>('code-asc');
  const [page,setPage]=useState(1);
  const [featureSelection,setFeatureSelection]=useState<Record<FilterKey,string>>({color:'',material:'',texture:'',application:''});
  const [initialized,setInitialized]=useState(false);
  const previousPage=useRef<number|null>(null);

  const browseOptions=useMemo(()=>({
    collection:categories.map(item=>({value:item.slug,label:item.name})),
    texture:[...new Set(products.map(product=>specValue(product,browseAliases.texture)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fa')).map(value=>({value,label:value})),
    effect:[...new Set(products.map(product=>specValue(product,browseAliases.effect)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fa')).map(value=>({value,label:value})),
  }),[products,categories]);

  useEffect(()=>{
    const apply=()=>{
      setQuery(restore('search'));
      const restoredMode=restore('by');
      const nextMode=browseModes.some(item=>item.key===restoredMode)?restoredMode as BrowseMode:'collection';
      setMode(nextMode);
      setCategory(restore('category')||categories[0]?.slug||'');
      setFacet(restore(nextMode==='texture'?'browse_texture':nextMode==='effect'?'browse_effect':'collection'));
      const s=restore('sort');setSort(s==='code-desc'||s==='name-asc'?s:'code-asc');
      setPage(Math.max(1,Number(restore('page'))||1));
      setFeatureSelection({color:restore('color'),material:restore('material'),texture:restore('texture'),application:restore('application')});
      setInitialized(true);
    };
    apply();window.addEventListener('popstate',apply);return()=>window.removeEventListener('popstate',apply);
  },[categories]);

  useEffect(()=>{
    if(!initialized)return;
    const url=new URL(window.location.href);
    const values:Record<string,string>={search:query.trim(),by:mode,category:mode==='collection'?category:'',browse_texture:mode==='texture'?facet:'',browse_effect:mode==='effect'?facet:'',sort:sort==='code-asc'?'':sort,page:page>1?String(page):'',...featureSelection};
    Object.entries(values).forEach(([key,value])=>value?url.searchParams.set(key,value):url.searchParams.delete(key));
    if(url.href!==window.location.href)window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
  },[initialized,query,mode,category,facet,sort,page,featureSelection]);

  const availableFeatures=useMemo(()=>featureKeys.map(key=>({
    key,label:features[key].label,values:[...new Set(products.map(product=>attr(product,key)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fa')),
  })).filter(feature=>feature.values.length>0),[products]);
  const visible=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase('fa');
    const filtered=products.filter(product=>{
      const matchingBrowse=mode==='collection'
        ? product.category_slug===category
        : !facet||specValue(product,browseAliases[mode])===facet;
      const searchable=[product.code,product.name,product.model,product.dimensions,product.category_name].map(value=>String(value||'').toLocaleLowerCase('fa'));
      return matchingBrowse&&(!needle||searchable.some(value=>value.includes(needle)))&&
        featureKeys.every(key=>!featureSelection[key]||attr(product,key)===featureSelection[key]);
    });
    return filtered.sort((a,b)=>{
      if(sort==='name-asc')return (a.name||'').localeCompare(b.name||'','fa');
      const comparison=String(a.code).localeCompare(String(b.code),'en',{numeric:true});
      return sort==='code-desc'?-comparison:comparison;
    });
  },[products,mode,category,facet,query,sort,featureSelection]);

  const pageCount=Math.max(1,Math.ceil(visible.length/PAGE_SIZE));
  const currentPage=Math.min(page,pageCount);
  const paginated=visible.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
  useEffect(()=>{
    if(!initialized)return;
    if(previousPage.current===null){previousPage.current=currentPage;return;}
    if(previousPage.current!==currentPage){
      previousPage.current=currentPage;
      document.getElementById('product-results')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    }
  },[currentPage,initialized]);
  const hasFilters=!!query||sort!=='code-asc'||featureKeys.some(key=>featureSelection[key]);
  const options=browseOptions[mode];
  function clear(){setQuery('');setSort('code-asc');setFeatureSelection({color:'',material:'',texture:'',application:''});setPage(1)}
  function chooseMode(nextMode:BrowseMode){
    setMode(nextMode);setFacet('');setPage(1);
    if(nextMode==='collection')setCategory(categories[0]?.slug||'');
  }
  function chooseValue(value:string){if(mode==='collection')setCategory(value);else setFacet(value);setPage(1)}

  return <div dir="rtl" className="fm-product-explorer">
    <div className="mb-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="m-0 text-[clamp(1.45rem,2.5vw,2.25rem)] font-semibold text-[#292d2a]">سطوح فرامید را کشف کنید</h2><p className="mb-0 mt-2 text-sm leading-7 text-[#727a73]">بر اساس حس لمسی، جلوهٔ بصری یا کالکشن جست‌وجو کنید.</p></div>
        <span className="rounded-full border border-[#e7e8e3] bg-white/70 px-4 py-2 text-xs text-[#737a74]" aria-live="polite">{visible.length.toLocaleString('fa-IR')} محصول در این انتخاب</span>
      </div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="نوع دسته‌بندی محصولات">
        {browseModes.map(item=><button type="button" aria-pressed={mode===item.key} key={item.key} onClick={()=>chooseMode(item.key)} className={glassButton(mode===item.key)}><span>{item.label}</span><span dir="ltr" className={`text-[9px] tracking-[.12em] ${mode===item.key?'text-white/60':'text-[#8b918b]'}`}>{item.en}</span></button>)}
      </div>
      {options.length>0?<div className="flex snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]" role="group" aria-label={`گزینه‌های دسته‌بندی ${browseModes.find(item=>item.key===mode)?.label}`}>
        {options.map(item=>{const active=mode==='collection'?category===item.value:facet===item.value;return <button type="button" key={item.value} aria-pressed={active} onClick={()=>chooseValue(item.value)} className={`fm-category-tab ${active?'is-active':''}`}>{item.label}</button>})}
      </div>:<p className="m-0 rounded-2xl border border-dashed border-[#d9ddd7] bg-white/45 px-5 py-4 text-xs leading-6 text-[#747c75]">برای این روش دسته‌بندی هنوز مشخصه‌ای در اطلاعات محصولات ثبت نشده است. می‌توانید کالکشن موجود را انتخاب کنید.</p>}
    </div>

    <div className="mb-7 rounded-[24px] border border-white/75 bg-white/55 p-4 shadow-[0_12px_38px_rgba(42,48,42,.055)] backdrop-blur-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><h3 className="m-0 inline-flex items-center gap-2 text-sm font-semibold text-[#353b36]"><SlidersHorizontal size={17} className="text-[#b82a38]"/> جست‌وجو و فیلتر</h3>{hasFilters&&<button onClick={clear} type="button" className={glassButton(false)}><X size={14}/> پاک کردن فیلترها</button>}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <label className="fm-product-search"><span className="sr-only">جستجوی محصول</span><Search size={17} className="pointer-events-none text-[#858a84]"/><input type="search" value={query} onChange={event=>{setQuery(event.target.value);setPage(1)}} placeholder="نام، مدل یا کد محصول..."/></label>
        <label className="fm-filter-select"><span className="sr-only">مرتب‌سازی</span><ArrowDownUp size={16} className="text-[#858a84]"/><select aria-label="مرتب‌سازی محصولات" value={sort} onChange={event=>{setSort(event.target.value as Sort);setPage(1)}}><option value="code-asc">کد: صعودی</option><option value="code-desc">کد: نزولی</option><option value="name-asc">نام: الفبایی</option></select></label>
        {availableFeatures.length>0&&<details className="fm-product-advanced-filters"><summary>فیلترهای بیشتر <span>{availableFeatures.length.toLocaleString('fa-IR')}</span></summary><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{availableFeatures.map(feature=><label key={feature.key} className="fm-filter-select"><span className="sr-only">{feature.label}</span><select aria-label={feature.label} value={featureSelection[feature.key]} onChange={event=>{setFeatureSelection(current=>({...current,[feature.key]:event.target.value}));setPage(1)}}><option value="">{feature.label}: همه</option>{feature.values.map(value=><option value={value} key={value}>{value}</option>)}</select></label>)}</div></details>}
      </div>
    </div>

    <div id="product-results" className="mb-5 flex scroll-mt-28 flex-wrap items-center justify-between gap-3"><h3 className="m-0 text-lg font-semibold text-[#262a27]">{mode==='collection'?categories.find(item=>item.slug===category)?.name||'کالکشن‌ها':`${browseModes.find(item=>item.key===mode)?.label}‌های موجود`}</h3><span aria-live="polite" className="rounded-full border border-white/75 bg-white/65 px-4 py-2 text-xs text-[#59605b] backdrop-blur-lg">{visible.length.toLocaleString('fa-IR')} نتیجه</span></div>
    {paginated.length>0?<div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">{paginated.map(product=><ProductCard key={product.id} product={product}/>)}</div>:
      <div className="grid min-h-52 place-items-center rounded-[24px] border border-dashed border-[#d9ddd7] bg-white/60 p-8 text-center backdrop-blur-lg"><div><p className="text-sm font-semibold text-[#454a46]">{options.length?'محصولی با این فیلترها پیدا نشد.':'هنوز محصولی برای این دسته‌بندی ثبت نشده است.'}</p><p className="mt-2 text-xs leading-6 text-[#818582]">دسته‌بندی یا فیلترها را تغییر دهید.</p><button type="button" className={`mt-4 ${glassButton(false)}`} onClick={()=>chooseMode('collection')}>دیدن کالکشن‌های موجود</button></div></div>}
    {visible.length>PAGE_SIZE&&<nav aria-label="صفحه‌بندی محصولات" className="mt-8 flex flex-col items-center justify-center gap-4 border-t border-[#e5e7e1] pt-5">
      <span className="text-center text-xs text-[#747b75]">صفحه {currentPage.toLocaleString('fa-IR')} از {pageCount.toLocaleString('fa-IR')}</span>
      <div className="flex flex-wrap items-center gap-2" dir="ltr">
        <button type="button" aria-label="صفحهٔ قبلی" disabled={currentPage<=1} onClick={()=>setPage(currentPage-1)} className={glassButton()}><ChevronLeft size={16}/><span className="sr-only sm:not-sr-only">قبلی</span></button>
        {Array.from({length:pageCount},(_,index)=>index+1).map(pageNumber=><button type="button" key={pageNumber} aria-label={`صفحه ${pageNumber}`} aria-current={currentPage===pageNumber?'page':undefined} onClick={()=>setPage(pageNumber)} className={`${glassButton(currentPage===pageNumber)} min-w-11`}>{pageNumber.toLocaleString('fa-IR')}</button>)}
        <button type="button" aria-label="صفحهٔ بعدی" disabled={currentPage>=pageCount} onClick={()=>setPage(currentPage+1)} className={glassButton()}><span className="sr-only sm:not-sr-only">بعدی</span><ChevronRight size={16}/></button>
      </div>
    </nav>}
  </div>;
}
