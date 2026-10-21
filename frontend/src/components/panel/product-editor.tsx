'use client';

import {useCallback,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowRight, Check, ChevronLeft, ChevronRight, FolderPlus, ImagePlus, Plus, Save, Trash2} from 'lucide-react';
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
function newCategorySlug(value:string){return value.trim().toLocaleLowerCase('fa').replace(/[^a-z0-9\u0600-\u06ff]+/g,'-').replace(/^-+|-+$/g,'');}

type ProductEditorProps={id:string;embedded?:boolean;initialCategory?:string;canAddCategory?:boolean;onSaved?:(category?:string)=>void;onCancel?:()=>void};

export function ProductEditor(props:ProductEditorProps){
 return props.id==='new'?<NewProductWizard embedded={props.embedded} initialCategory={props.initialCategory} canAddCategory={props.canAddCategory} onSaved={props.onSaved} onCancel={props.onCancel}/>:<ProductEditorCore {...props}/>;
}

function ProductEditorCore({id,embedded=false,onSaved,onCancel}:ProductEditorProps){
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

const PRODUCT_STEPS=[
 {title:'اطلاعات پایه',hint:'نام، کد و دسته‌بندی'},
 {title:'تصویر',hint:'تصویر اصلی محصول'},
 {title:'جزئیات',hint:'توضیحات و کاتالوگ'},
 {title:'بازبینی',hint:'وضعیت و ذخیره'},
];

function NewProductWizard({embedded=false,initialCategory='',canAddCategory=false,onSaved,onCancel}:{embedded?:boolean;initialCategory?:string;canAddCategory?:boolean;onSaved?:(category?:string)=>void;onCancel?:()=>void}){
 const router=useRouter();
 const [step,setStep]=useState(1),[categories,setCategories]=useState<Category[]>([]),[media,setMedia]=useState<Media[]>([]);
 const [name,setName]=useState(''),[sku,setSku]=useState(''),[model,setModel]=useState(''),[dimensions,setDimensions]=useState(''),[category,setCategory]=useState(initialCategory);
 const [showCategoryForm,setShowCategoryForm]=useState(false),[newCategoryName,setNewCategoryName]=useState(''),[categorySaving,setCategorySaving]=useState(false);
 const [coverAsset,setCoverAsset]=useState(''),[image,setImage]=useState<File|null>(null),[description,setDescription]=useState(''),[catalog,setCatalog]=useState<File|null>(null);
 const [status,setStatus]=useState('draft'),[featured,setFeatured]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let alive=true;const loadOptions=()=>{void Promise.all([panelFetch<Page<Category>>('categories/?page_size=100'),panelFetch<Page<Media>>('media/?page_size=100')]).then(([cats,assets])=>{if(alive){setCategories(getResults(cats));setMedia(getResults(assets))}}).catch(()=>{if(alive)setError('دریافت دسته‌بندی‌ها ناموفق بود.')} )};loadOptions();window.addEventListener('focus',loadOptions);return()=>{alive=false;window.removeEventListener('focus',loadOptions)}},[]);
 function next(){setError('');if(step===1){if(!name.trim()||!sku.trim()||!category){setError('نام، کد محصول و دسته‌بندی را کامل کنید.');return}}setStep(v=>Math.min(4,v+1))}
 async function addCategory(event:React.FormEvent){event.preventDefault();const value=newCategoryName.trim(),slug=newCategorySlug(value);if(!value||!slug)return;setCategorySaving(true);setError('');try{const saved=await panelFetch<Category>('categories/','POST',{name:value,slug,order:categories.length});setCategories(items=>[...items,saved]);setCategory(String(saved.id));setNewCategoryName('');setShowCategoryForm(false)}catch(err){setError(err instanceof Error?err.message:'ساخت دسته‌بندی ناموفق بود.')}finally{setCategorySaving(false)}}
 async function save(){setError('');if(!name.trim()||!sku.trim()||!category){setStep(1);setError('نام، کد محصول و دسته‌بندی را کامل کنید.');return}if(status==='published'&&!image&&!coverAsset){setStep(2);setError('برای انتشار محصول، تصویر اصلی انتخاب کنید.');return}setSaving(true);try{const data=new FormData();data.set('name',name.trim());data.set('sku',sku.trim());data.set('slug',productSlug(sku));data.set('model',model.trim());data.set('dimensions',dimensions.trim());data.set('category',category);data.set('description',description.trim());data.set('status',status);data.set('featured',String(featured));data.set('sort_order','0');data.set('technical_specs','{}');data.set('cover_asset',coverAsset);if(image)data.set('cover_image',image);if(catalog)data.set('catalog_pdf',catalog);const saved=await panelFetch<Product>('products/','POST',data);if(onSaved){onSaved(category);return}router.replace(`/panel/products/${saved.id}`)}catch(err){setError(err instanceof Error?err.message:'ایجاد محصول انجام نشد.')}finally{setSaving(false)}}
 const selectedCategory=categories.find(item=>String(item.id)===category);
 return <div className={`fm-data-page fm-product-wizard ${embedded?'fm-embedded-product':''}`}>
  {!embedded&&<div className="fm-page-actions"><div><h2>افزودن محصول</h2><p>در چهار مرحله محصول را ثبت و در دسته‌بندی مناسب نمایش دهید.</p></div></div>}
  <nav className="fm-product-stepper" aria-label="مراحل افزودن محصول">{PRODUCT_STEPS.map((item,index)=>{const number=index+1,active=step===number,done=step>number;return <button type="button" key={item.title} aria-current={active?'step':undefined} disabled={number>step} onClick={()=>setStep(number)} className={active?'is-active':done?'is-done':''}><span className="fm-product-step-number">{done?<Check size={14}/>:number}</span><span className="fm-product-step-copy"><strong>{item.title}</strong><small>{item.hint}</small></span></button>})}</nav>
  {error&&<div className="fm-alert fm-alert-error" role="alert">{error}</div>}
  <section className="fm-panel-card fm-product-wizard-card">
   {step===1&&<div className="fm-product-wizard-step"><div className="fm-wizard-heading"><span>مرحله ۱ از ۴</span><h3>اطلاعات پایه محصول</h3><p>این موارد برای دسته‌بندی و پیدا شدن محصول در سایت ضروری هستند.</p></div><div className="fm-form-grid"><label className="fm-field"><span>نام محصول *</span><input autoFocus required value={name} onChange={e=>setName(e.target.value)} placeholder="مثلاً کلین تاچ سفید"/></label><label className="fm-field"><span>کد محصول *</span><input required dir="ltr" value={sku} onChange={e=>setSku(e.target.value)} placeholder="مثلاً 7185"/></label><label className="fm-field fm-category-field"><span>دسته‌بندی *</span><select required value={category} onChange={e=>setCategory(e.target.value)}><option value="">انتخاب دسته‌بندی</option>{categories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>{!categories.length&&<small>هنوز دسته‌ای ساخته نشده است.</small>}</label>{canAddCategory&&<div className="fm-category-create-hint"><button type="button" onClick={()=>setShowCategoryForm(value=>!value)}><FolderPlus size={15}/>{showCategoryForm?'بستن':'ساخت دسته جدید'}</button></div>}{showCategoryForm&&canAddCategory&&<form className="fm-inline-category-create" onSubmit={addCategory}><label className="fm-field"><span>نام دسته جدید</span><input autoFocus required value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)} placeholder="مثلاً کلین تاچ"/></label><button type="submit" className="fm-btn fm-btn-soft" disabled={categorySaving||!newCategoryName.trim()}><Plus size={14}/>{categorySaving?'در حال ذخیره':'افزودن دسته'}</button></form>}<label className="fm-field"><span>مدل <small>اختیاری</small></span><input value={model} onChange={e=>setModel(e.target.value)} placeholder="مدل محصول"/></label><label className="fm-field"><span>ابعاد <small>اختیاری</small></span><input value={dimensions} onChange={e=>setDimensions(e.target.value)} placeholder="مثلاً ۲۸۰ × ۱۲۲ سانتی‌متر"/></label></div></div>}
   {step===2&&<div className="fm-product-wizard-step"><div className="fm-wizard-heading"><span>مرحله ۲ از ۴</span><h3>تصویر اصلی محصول</h3><p>تصویر باکیفیت کمک می‌کند محصول در صفحه دسته‌بندی بهتر دیده شود. برای پیش‌نویس، افزودن تصویر اختیاری است.</p></div><div className="fm-product-image-step"><label className="fm-field"><span>بارگذاری تصویر جدید</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{setImage(e.target.files?.[0]||null);if(e.target.files?.[0])setCoverAsset('')}}/></label><label className="fm-field"><span>یا انتخاب تصویر از کتابخانه</span><select value={coverAsset} onChange={e=>{setCoverAsset(e.target.value);if(e.target.value)setImage(null)}}><option value="">بدون تصویر انتخاب‌شده</option>{media.filter(item=>item.original_path?.startsWith('/assets/')).map(item=><option key={item.id} value={item.original_path}>{item.title}</option>)}</select></label><div className="fm-product-image-preview">{image?<div className="fm-image-file-state"><ImagePlus size={22}/><strong>{image.name}</strong><small>تصویر جدید برای آپلود آماده است</small></div>:coverAsset?<img src={mediaUrl(coverAsset)} alt={`پیش‌نمایش ${name||'محصول'}`}/>:<div className="fm-image-empty-state"><ImagePlus size={25}/><strong>پیش‌نمایش تصویر</strong><small>تصویر محصول اینجا نمایش داده می‌شود.</small></div>}</div></div></div>}
   {step===3&&<div className="fm-product-wizard-step"><div className="fm-wizard-heading"><span>مرحله ۳ از ۴</span><h3>جزئیات محصول</h3><p>توضیحات و کاتالوگ را در صورت نیاز اضافه کنید. می‌توانید این بخش را خالی بگذارید.</p></div><label className="fm-field"><span>توضیحات</span><textarea rows={5} value={description} onChange={e=>setDescription(e.target.value)} placeholder="ویژگی‌ها و کاربرد محصول را بنویسید..."/></label><label className="fm-field"><span>کاتالوگ PDF <small>اختیاری</small></span><input type="file" accept="application/pdf" onChange={e=>setCatalog(e.target.files?.[0]||null)}/></label>{catalog&&<p className="fm-field-hint">فایل انتخاب‌شده: {catalog.name}</p>}</div>}
   {step===4&&<div className="fm-product-wizard-step"><div className="fm-wizard-heading"><span>مرحله ۴ از ۴</span><h3>بازبینی و ثبت</h3><p>اطلاعات را بررسی کنید و مشخص کنید محصول پیش‌نویس بماند یا منتشر شود.</p></div><div className="fm-product-review"><div><span>نام محصول</span><strong>{name||'—'}</strong></div><div><span>کد محصول</span><strong dir="ltr">{sku||'—'}</strong></div><div><span>دسته‌بندی</span><strong>{selectedCategory?.name||'—'}</strong></div><div><span>تصویر</span><strong>{image?.name||coverAsset||'انتخاب نشده'}</strong></div></div><div className="fm-form-grid fm-product-publish-settings"><label className="fm-field"><span>وضعیت نمایش</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="draft">ذخیره به‌صورت پیش‌نویس</option><option value="published">انتشار در سایت</option></select><small>برای انتشار عمومی، تصویر اصلی لازم است.</small></label><label className="fm-field-check"><input type="checkbox" checked={featured} onChange={e=>setFeatured(e.target.checked)}/>نمایش به‌عنوان محصول ویژه</label></div></div>}
   <div className="fm-product-wizard-actions">{step>1?<button type="button" className="fm-btn fm-btn-soft" onClick={()=>{setError('');setStep(v=>v-1)}}><ChevronRight size={16}/>مرحله قبل</button>:<span/>}{embedded&&<button type="button" className="fm-btn" onClick={onCancel}>انصراف</button>}{step<4?<button type="button" className="fm-btn fm-btn-primary" onClick={next}>ادامه<ChevronLeft size={16}/></button>:<button type="button" className="fm-btn fm-btn-primary" disabled={saving} onClick={()=>void save()}><Save size={15}/>{saving?'در حال ثبت...':'ثبت محصول'}</button>}</div>
  </section>
 </div>;
}
