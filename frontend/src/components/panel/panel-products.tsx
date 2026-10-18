'use client';
import {useCallback,useEffect,useState} from 'react';
import {BarChart3, Package, Pencil, Plus, Search, TrendingUp, X} from 'lucide-react';
import {getResults,mediaUrl,panelFetch,persian,type DashboardData,type Page} from '@/lib/panel-api';
import {TopProductChart,EmptyData} from './panel-charts';
import {ProductEditor} from './product-editor';

type Product={id:number;name:string;sku:string;category_name:string;image:string;status:string;view_count:number;featured:boolean};
export function PanelProducts(){
 const [list,setList]=useState<Product[]>([]),[search,setSearch]=useState(''),[page,setPage]=useState(1),[count,setCount]=useState(0);
 const [chart,setChart]=useState<DashboardData|null>(null),[days,setDays]=useState(30),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [editing,setEditing]=useState<string|null>(null);
 const load=useCallback(async()=>{
  setLoading(true);try{
   const res=await panelFetch<Page<Product>>(`products/?page=${page}&search=${encodeURIComponent(search)}`);
   setList(getResults(res));setCount(res.count||0);setError('');
  }catch(e){setError(e instanceof Error?e.message:'عدم دریافت محصولات')}finally{setLoading(false)}
 },[page,search]);
 const loadChart=useCallback(async()=>{try{setChart(await panelFetch<DashboardData>(`dashboard/?days=${days}`))}catch{setChart(null)}},[days]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{void loadChart()},[loadChart]);
 useEffect(()=>{
  if(editing===null)return;
  const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setEditing(null)};
  document.addEventListener('keydown',esc);document.body.style.overflow='hidden';
  return()=>{document.removeEventListener('keydown',esc);document.body.style.overflow=''};
 },[editing]);
 return <div className="fm-data-page">
  <div className="fm-page-actions"><div><h2>مدیریت محصولات</h2><p>افزودن و ویرایش محصولات با فرم ساده و بدون JSON</p></div><button type="button" className="fm-btn fm-btn-primary" onClick={()=>setEditing('new')}><Plus size={17}/>افزودن محصول</button></div>
  {error&&<div className="fm-alert fm-alert-error" role="alert">{error}</div>}
  <section className="fm-panel-card fm-product-analytics">
   <div className="fm-card-head"><div><div className="fm-card-heading"><TrendingUp size={20}/><h2>محصولات پربازدید</h2></div><p>رویدادهای ثبت‌شده بازدید محصولات در بازه انتخاب‌شده</p></div><select className="fm-compact-select" aria-label="بازه آمار" value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>۷ روز</option><option value={30}>۳۰ روز</option><option value={90}>۹۰ روز</option></select></div>
   <TopProductChart products={chart?.product_series||[]}/>
  </section>
  <section className="fm-panel-card fm-table-panel">
   <div className="fm-table-toolbar"><div className="fm-search-box"><Search size={17}/><input value={search} onChange={e=>{setPage(1);setSearch(e.target.value)}} placeholder="جستجوی محصول یا کد محصول..." aria-label="جستجوی محصول"/></div><span className="fm-table-counter"><Package size={16}/>{persian(count)} محصول</span></div>
   <div className="fm-table-scroll"><table className="fm-table fm-full-table"><thead><tr><th>محصول</th><th>کد محصول</th><th>دسته‌بندی</th><th>وضعیت</th><th>بازدیدهای ثبت‌شده (کل)</th><th>عملیات</th></tr></thead><tbody>
    {list.map(p=><tr key={p.id}><td><div className="fm-product-cell">{mediaUrl(p.image)?<img src={mediaUrl(p.image)} alt=""/>:<span className="fm-img-fallback"><Package size={19}/></span>}<strong>{p.name}</strong></div></td><td>{p.sku}</td><td>{p.category_name}</td><td><span className={`fm-status-pill fm-status-${p.status}`}>{p.status==='published'?'منتشرشده':p.status==='draft'?'پیش‌نویس':'بایگانی'}</span></td><td>{persian(p.view_count)}</td><td><button type="button" className="fm-btn fm-btn-sm fm-btn-soft" onClick={()=>setEditing(String(p.id))}><Pencil size={15}/>ویرایش</button></td></tr>)}
   </tbody></table>{!list.length&&<EmptyData text={loading?'در حال بارگذاری...':'محصولی یافت نشد.'}/>}</div>
   <div className="fm-pagination"><span>صفحه {persian(page)} از {persian(Math.max(1,Math.ceil(count/24)))}</span><div><button disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)}>قبلی</button><button disabled={page*24>=count||loading} onClick={()=>setPage(p=>p+1)}>بعدی</button></div></div>
  </section>
  {editing!==null&&<div className="fm-modal-layer fm-modal-product-layer" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setEditing(null)}}>
   <section className="fm-editor-modal fm-modal-product" role="dialog" aria-modal="true" aria-labelledby="fm-product-modal-title">
    <header><div><strong id="fm-product-modal-title">{editing==='new'?'افزودن محصول جدید':'ویرایش محصول'}</strong><p>نام، دسته‌بندی، تصویر و مشخصات محصول را وارد کنید.</p></div><button type="button" aria-label="بستن پنجره" onClick={()=>setEditing(null)}><X size={20}/></button></header>
    <div className="fm-editor-fields"><p className="fm-product-dialog-info">فقط فیلدهای اصلی در دسترس هستند. تنظیمات فنی به‌صورت عنوان و مقدار ثبت می‌شوند.</p><ProductEditor id={editing} embedded onCancel={()=>setEditing(null)} onSaved={()=>{setEditing(null);void load();void loadChart()}}/></div>
   </section>
  </div>}
 </div>;
}
