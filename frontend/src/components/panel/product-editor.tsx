'use client';

import {useCallback,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowRight, ImagePlus, Plus, Save, Trash2} from 'lucide-react';
import {mediaUrl,panelFetch,getResults,type Page} from '@/lib/panel-api';

type Category={id:number;name:string};
type Media={id:number;title:string;original_path:string;url:string};
type Gallery={id:number;url:string;caption:string};
type SpecRow={id:number;key:string;value:string};
type Product={
 id?:number; name:string;slug:string;sku:string;model:string;dimensions:string;
 description:string;technical_specs:Record<string,unknown>;category:number;
 status:string;cover_asset:string;image:string;catalog_url:string;featured:boolean;
 sort_order:number;seo_title:string;seo_description:string;images:Gallery[];
};
const EMPTY:Product={name:'',slug:'',sku:'',model:'',dimensions:'',description:'',technical_specs:{},category:0,status:'draft',cover_asset:'',image:'',catalog_url:'',featured:false,sort_order:0,seo_title:'',seo_description:'',images:[]};
let nextRow=0;
function readableSpecs(data:Record<string,unknown>):SpecRow[]{
 return Object.entries(data).filter(([,v])=>['string','number','boolean'].includes(typeof v))
   .map(([key,value])=>({id:++nextRow,key,value:String(value)}));
}
function productSlug(sku:string){return sku.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/gi,'-').replace(/^-+|-+$/g,'');}

export function ProductEditor({id,embedded=false,onSaved,onCancel}:{id:string;embedded?:boolean;onSaved?:()=>void;onCancel?:()=>void}){
 const router=useRouter();
 const newItem=id==='new';
 const [item,setItem]=useState<Product>(EMPTY);
 const [categories,setCategories]=useState<Category[]>([]);
 const [media,setMedia]=useState<Media[]>([]);
 const [specRows,setSpecRows]=useState<SpecRow[]>([]);
 const [image,setImage]=useState<File|null>(null);
 const [catalog,setCatalog]=useState<File|null>(null);
 const [gallery,setGallery]=useState<File|null>(null);
 const [galleryCaption,setGalleryCaption]=useState('');
 const [loading,setLoading]=useState(!newItem);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');

 const refresh=useCallback(async()=>{
   if(newItem)return;
   const data=await panelFetch<Product>(`products/${id}/`);
   setItem(data);
   setSpecRows(readableSpecs(data.technical_specs||{}));
 },[id,newItem]);
 useEffect(()=>{
   let alive=true;
   panelFetch<Page<Category>>('categories/?page_size=100').then(d=>{if(alive)setCategories(getResults(d))}).catch(()=>{});
   panelFetch<Page<Media>>('media/?page_size=100').then(d=>{if(alive)setMedia(getResults(d))}).catch(()=>{});
   if(!newItem){refresh().catch(e=>{if(alive)setError(e instanceof Error?e.message:'خطا در دریافت محصول')}).finally(()=>{if(alive)setLoading(false)});}
   return()=>{alive=false};
 },[newItem,refresh]);
 const change=(key:keyof Product,value:unknown)=>setItem(v=>({...v,[key]:value}));
 const setSpec=(rowId:number,field:'key'|'value',value:string)=>setSpecRows(list=>list.map(r=>r.id===rowId?{...r,[field]:value}:r));

 async function save(e:React.FormEvent){
   e.preventDefault();setSaving(true);setError('');setMessage('');
   try{
     if(!item.name.trim()||!item.sku.trim()||!item.category)throw Error('نام، کد و دسته‌بندی محصول را کامل کنید.');
     const slug=item.slug.trim()||productSlug(item.sku);
     if(!slug)throw Error('برای محصول یک کد معتبر وارد کنید.');
     // Keep advanced/complex existing attributes intact rather than deleting them.
     const specs:Record<string,unknown>={};
     for(const [key,value] of Object.entries(item.technical_specs||{})){
       if(value!==null && typeof value==='object')specs[key]=value;
     }
     for(const row of specRows){
       const key=row.key.trim();if(!key)continue;
       const original=item.technical_specs?.[key];
       specs[key]=original!==undefined&&String(original)===row.value?original:row.value;
     }
     const data=new FormData();
     for(const key of ['name','sku','model','dimensions','description','cover_asset','status','seo_title','seo_description'] as const){data.set(key,String(item[key]||''));}
     data.set('slug',slug);
     data.set('category',String(item.category));
     data.set('featured',String(item.featured));
     data.set('sort_order',String(item.sort_order));
     data.set('technical_specs',JSON.stringify(specs));
     if(image)data.set('cover_image',image);
     if(catalog)data.set('catalog_pdf',catalog);
     const saved=await panelFetch<Product>(`products/${newItem?'':`${id}/`}`,newItem?'POST':'PATCH',data);
     setItem(saved);setImage(null);setCatalog(null);setSpecRows(readableSpecs(saved.technical_specs||{}));
     setMessage('محصول با موفقیت ذخیره شد.');
     if(onSaved){onSaved();return;}
     if(newItem)router.replace(`/panel/products/${saved.id}`);
   }catch(err){setError(err instanceof Error?err.message:'ذخیره ناموفق بود');}
   finally{setSaving(false)}
 }
 async function addGallery(){
   if(!gallery||!item.id)return;
   setError('');
   try{
     const data=new FormData();data.set('product',String(item.id));data.set('image',gallery);data.set('caption',galleryCaption);
     await panelFetch('product-images/','POST',data);
     await refresh();setGallery(null);setGalleryCaption('');setMessage('تصویر جدید اضافه شد.');
   }catch(e){setError(e instanceof Error?e.message:'آپلود انجام نشد')}
 }
 async function deleteGallery(imageId:number){
   if(!window.confirm('این تصویر حذف شود؟'))return;
   try{await panelFetch(`product-images/${imageId}/`,'DELETE');await refresh()}
   catch(e){setError(e instanceof Error?e.message:'حذف انجام نشد')}
 }
 return <div className={`fm-data-page ${embedded?'fm-embedded-product':''}`}>
   {!embedded&&<div className="fm-page-actions"><div><Link href="/panel/products" className="fm-backlink"><ArrowRight size={16}/>بازگشت به محصولات</Link><h2>{newItem?'افزودن محصول':`ویرایش ${item.name}`}</h2><p>فرم ساده محصول؛ مشخصات پیشرفته فقط در صورت نیاز نمایش داده می‌شوند.</p></div></div>}
   {error&&<div className="fm-alert fm-alert-error" role="alert">{error}</div>}
   {message&&<div className="fm-alert fm-alert-success" role="status">{message}</div>}
   {loading?<div className="fm-panel-card fm-empty-data">در حال دریافت اطلاعات محصول...</div>:<>
   <form id="fm-product-edit-form" onSubmit={save} className="fm-product-edit-layout">
     <section className="fm-panel-card fm-form-card">
       <h3>اطلاعات اصلی محصول</h3>
       <div className="fm-form-grid">
         <label className="fm-field"><span>نام محصول *</span><input required value={item.name} onChange={e=>change('name',e.target.value)}/></label>
         <label className="fm-field"><span>کد محصول *</span><input required dir="ltr" value={item.sku} onChange={e=>change('sku',e.target.value)} placeholder="7185"/></label>
         <label className="fm-field"><span>دسته‌بندی *</span><select value={item.category||''} required onChange={e=>change('category',Number(e.target.value))}><option value="">انتخاب دسته‌بندی</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
         <label className="fm-field"><span>مدل</span><input value={item.model||''} onChange={e=>change('model',e.target.value)}/></label>
         <label className="fm-field"><span>ابعاد</span><input value={item.dimensions||''} onChange={e=>change('dimensions',e.target.value)}/></label>
         <label className="fm-field"><span>وضعیت انتشار</span><select value={item.status} onChange={e=>change('status',e.target.value)}><option value="draft">پیش‌نویس</option><option value="published">منتشرشده</option><option value="archived">بایگانی</option></select></label>
         <label className="fm-field fm-span-two"><span>توضیحات محصول</span><textarea rows={4} value={item.description||''} onChange={e=>change('description',e.target.value)}/></label>
       </div>
       <div className="fm-field fm-span-two"><span>مشخصات فنی (ساده)</span><small>هر مشخصه را با عنوان و مقدار آن اضافه کنید؛ نیازی به JSON نیست.</small>
         <div className="fm-specs-list">
           {specRows.map(row=><div className="fm-spec-row" key={row.id}>
             <input aria-label="نام مشخصه" placeholder="مثلاً ضخامت" value={row.key} onChange={e=>setSpec(row.id,'key',e.target.value)}/>
             <input aria-label="مقدار مشخصه" placeholder="مثلاً ۱۶ میلی‌متر" value={row.value} onChange={e=>setSpec(row.id,'value',e.target.value)}/>
             <button type="button" className="fm-spec-remove" title="حذف مشخصه" onClick={()=>setSpecRows(v=>v.filter(r=>r.id!==row.id))}><Trash2 size={15}/></button>
           </div>)}
           <button type="button" className="fm-btn fm-btn-soft" onClick={()=>setSpecRows(v=>[...v,{id:++nextRow,key:'',value:''}])}><Plus size={16}/>افزودن مشخصه</button>
         </div>
       </div>
       <details className="fm-fieldset-advanced"><summary>تنظیمات پیشرفته (اختیاری)</summary>
         <div className="fm-form-grid">
           <label className="fm-field"><span>نشانی صفحه (URL)</span><input dir="ltr" value={item.slug} onChange={e=>change('slug',e.target.value)} placeholder="از کد محصول ساخته می‌شود"/></label>
           <label className="fm-field"><span>ترتیب نمایش</span><input type="number" min={0} value={item.sort_order} onChange={e=>change('sort_order',Number(e.target.value))}/></label>
           <label className="fm-field"><span>عنوان سئو</span><input value={item.seo_title||''} onChange={e=>change('seo_title',e.target.value)}/></label>
           <label className="fm-field fm-span-two"><span>توضیح سئو</span><textarea rows={3} value={item.seo_description||''} onChange={e=>change('seo_description',e.target.value)}/></label>
           <label className="fm-field fm-span-two"><span>مسیر فایل اصلی سایت</span><input dir="ltr" value={item.cover_asset||''} onChange={e=>change('cover_asset',e.target.value)} placeholder="/assets/products/..."/><small>اگر تصویر جدید انتخاب نمی‌کنید، تصویر فعلی حفظ می‌شود.</small></label>
         </div>
       </details>
     </section>
     <aside className="fm-product-edit-side">
       <section className="fm-panel-card fm-form-card">
         <h3>تصویر و کاتالوگ</h3>
         {mediaUrl(item.image)&&<img className="fm-product-big-preview" src={mediaUrl(item.image)} alt={item.name||'تصویر محصول'}/>}
         <label className="fm-field"><span>آپلود تصویر محصول</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setImage(e.target.files?.[0]||null)}/></label>
         {image&&<small>تصویر انتخاب شده: {image.name}</small>}
         <label className="fm-field"><span>یا انتخاب تصویر اصلی سایت</span><select value={item.cover_asset||''} onChange={e=>change('cover_asset',e.target.value)}><option value="">بدون تغییر / تصویر آپلودشده</option>{media.filter(m=>m.original_path?.startsWith('/assets/')).map(m=><option key={m.id} value={m.original_path}>{m.title}</option>)}{item.cover_asset&&!media.some(m=>m.original_path===item.cover_asset)&&<option value={item.cover_asset}>تصویر فعلی</option>}</select></label>
         <label className="fm-field"><span>کاتالوگ PDF</span><input type="file" accept="application/pdf" onChange={e=>setCatalog(e.target.files?.[0]||null)}/></label>
         {item.catalog_url&&<a href={item.catalog_url} target="_blank" rel="noreferrer" className="fm-text-purple">مشاهده کاتالوگ فعلی</a>}
       </section>
       <section className="fm-panel-card fm-form-card"><h3>نمایش محصول</h3><label className="fm-field-check"><input type="checkbox" checked={item.featured} onChange={e=>change('featured',e.target.checked)}/>نمایش به عنوان محصول ویژه</label></section>
     </aside>
   </form>
   {!newItem&&item.id&&<section className="fm-panel-card fm-gallery-area"><div className="fm-card-head"><div><h2>گالری تصاویر</h2><p>تصاویر بیشتر برای صفحه این محصول</p></div></div><div className="fm-media-grid">{(item.images||[]).map(im=><div className="fm-media-tile" key={im.id}><img alt={im.caption||item.name} src={mediaUrl(im.url)}/><div className="fm-media-tile-info">{im.caption||'بدون عنوان'}<button type="button" title="حذف تصویر" onClick={()=>deleteGallery(im.id)}><Trash2 size={15}/></button></div></div>)}</div><div className="fm-gallery-upload"><input type="file" accept="image/jpeg,image/png,image/webp" aria-label="افزودن عکس" onChange={e=>setGallery(e.target.files?.[0]||null)}/><input placeholder="توضیح عکس" value={galleryCaption} onChange={e=>setGalleryCaption(e.target.value)}/><button type="button" className="fm-btn fm-btn-soft" onClick={addGallery} disabled={!gallery}><ImagePlus size={17}/> افزودن عکس</button></div></section>}
   <div className="fm-product-modal-save">
     {embedded&&<button type="button" className="fm-btn" onClick={onCancel}>انصراف</button>}
     <button type="submit" form="fm-product-edit-form" className="fm-btn fm-btn-primary" disabled={saving}><Save size={16}/>{saving?'در حال ذخیره...':'ذخیره محصول'}</button>
   </div></>}
 </div>;
}
