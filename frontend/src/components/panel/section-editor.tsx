'use client';

import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {CheckCircle2,Eye,FileText,Image as ImageIcon,ImagePlus,Package,Save,Trash2,UploadCloud} from 'lucide-react';
import {getResults,mediaUrl,panelFetch,type Page} from '@/lib/panel-api';
import {DEFAULT_MARQUEE_ITEMS,parseMarqueeItems} from '@/components/sections/brand-marquee';

type Media={id:number;title:string;url:string;alt_text:string};
type Product={id:number;name:string};
type Gallery={id:number;url:string;caption:string;alt_text:string;sort_order:number};
type Published={title?:string;subtitle?:string;body?:string;image?:string};
type ExampleCopy={title?:string;subtitle?:string;body?:string;image?:string};
type Section={
  id:number;page:number;page_name:string;key:string;name:string;kind:string;sort_order:number;
  draft_title:string;draft_subtitle:string;draft_body:string;draft_image_url:string;
  draft_asset:number|null;draft_image_alt:string;draft_link_label:string;draft_link_url:string;
  draft_products:number[];draft_enabled:boolean;is_published:boolean;image_url:string;
  images:Gallery[];published_at:string|null;published_snapshot?:Published;
};
const EMPTY:Section={id:0,page:0,page_name:'',key:'',name:'',kind:'text',sort_order:0,
  draft_title:'',draft_subtitle:'',draft_body:'',draft_image_url:'',draft_asset:null,
  draft_image_alt:'',draft_link_label:'',draft_link_url:'',draft_products:[],
  draft_enabled:true,is_published:false,image_url:'',images:[],published_at:null};
const INITIAL_COPY:Record<string,ExampleCopy>={
  hero:{title:'فرامید تولید کننده ام دی اف ملامینه، سینکرونایز، فوق برجسته و سوپرمات',image:'/assets/home/8b06ccdc303e9ae1063d16d0fc4224ee7d71279a.webp'},
  marquee:{body:DEFAULT_MARQUEE_ITEMS.join('\n')},
  about:{title:'Since 1975 the Caspany family has pursued its entrepreneurial path of tradition and innovation with passion and enthusiasm.',image:'/assets/home/history-panels.png'},
  values:{image:'/assets/home/home-organizational-values.png'},
  featured:{title:'محصولات'},gallery:{title:'گالری تصاویر'},samples:{title:'سمپل‌ها'},
};
function plain(value?:string){return (value||'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,' ').trim()}
function keyLabel(key:string){return ({hero:'بنر اصلی',marquee:'نوار متحرک برند',about:'معرفی شرکت',values:'ارزش‌های سازمانی',featured:'محصولات ویژه',gallery:'گالری',samples:'سمپل‌ها'} as Record<string,string>)[key]||key}

export function SectionEditor({pageKey,sectionId}:{pageKey:string;sectionId:string}){
  const [section,setSection]=useState<Section>(EMPTY);
  const [media,setMedia]=useState<Media[]>([]);
  const [products,setProducts]=useState<Product[]>([]);
  const [file,setFile]=useState<File|null>(null);
  const [gallery,setGallery]=useState<File|null>(null);
  const [galleryAsset,setGalleryAsset]=useState('');
  const [caption,setCaption]=useState('');
  const [previewObjectUrl,setPreviewObjectUrl]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [showPreview,setShowPreview]=useState(true);

  const load=useCallback(async()=>{
    try{
      const loaded=await panelFetch<Section>(`sections/${sectionId}/`);
      setSection(loaded);
      setError('');
      const [mediaResponse,productResponse]=await Promise.allSettled([
        panelFetch<Page<Media>>('media/?page_size=100'),
        panelFetch<Page<Product>>('products/?page_size=100'),
      ]);
      if(mediaResponse.status==='fulfilled')setMedia(getResults(mediaResponse.value));
      if(productResponse.status==='fulfilled')setProducts(getResults(productResponse.value));
    }catch(err){setError(err instanceof Error?err.message:'خطا در دریافت بخش')}
    finally{setLoading(false)}
  },[sectionId]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{
    if(!file){setPreviewObjectUrl('');return}
    const url=URL.createObjectURL(file);
    setPreviewObjectUrl(url);
    return()=>URL.revokeObjectURL(url);
  },[file]);

  const set=<K extends keyof Section>(key:K,value:Section[K])=>setSection(prev=>({...prev,[key]:value}));
  const original=section.published_snapshot||{};
  const defaults:ExampleCopy=pageKey==='home'?(INITIAL_COPY[section.key]||{}):{};
  const exampleTitle=original.title||defaults.title||'';
  const exampleSubtitle=original.subtitle||defaults.subtitle||'';
  const exampleBody=plain(original.body||defaults.body);
  const selectedMedia=media.find(item=>item.id===section.draft_asset);
  const picture=previewObjectUrl||mediaUrl(selectedMedia?.url)||mediaUrl(section.draft_image_url)||mediaUrl(original.image)||mediaUrl(defaults.image)||'';
  const heading=section.draft_title||exampleTitle;
  const subtitle=section.draft_subtitle||exampleSubtitle;
  const body=section.draft_body||exampleBody;
  const isMarquee=pageKey==='home'&&section.key==='marquee';
  const isValues=pageKey==='home'&&section.key==='values';
  const isIntro=pageKey==='home'&&section.key==='about';
  const isHero=pageKey==='home'&&section.key==='hero';
  const imageOnly=isValues;

  async function save(publish:boolean){
    setBusy(true);setError('');setMessage('');
    try{
      await panelFetch(`sections/${sectionId}/`,'PATCH',{
        name:section.name,kind:section.kind,sort_order:Number(section.sort_order),
        draft_title:section.draft_title,draft_subtitle:section.draft_subtitle,
        draft_body:section.draft_body,draft_image_alt:section.draft_image_alt,
        draft_link_label:section.draft_link_label,draft_link_url:section.draft_link_url,
        draft_asset:section.draft_asset,draft_products:section.draft_products,
        draft_enabled:section.draft_enabled,
      });
      if(file){const form=new FormData();form.set('draft_image',file);await panelFetch(`sections/${sectionId}/`,'PATCH',form)}
      if(publish)await panelFetch(`sections/${sectionId}/publish/`,'POST',{});
      setFile(null);
      setMessage(publish?'تغییرات منتشر شدند؛ صفحه سایت را برای مشاهده به‌روز کنید.':'پیش‌نویس ذخیره شد و هنوز روی سایت منتشر نشده است.');
      await load();
    }catch(err){setError(err instanceof Error?err.message:'خطا در ذخیره تغییرات')}
    finally{setBusy(false)}
  }
  async function unpublish(){
    if(!window.confirm('انتشار این بخش متوقف شود؟'))return;
    setBusy(true);
    try{await panelFetch(`sections/${sectionId}/unpublish/`,'POST',{});setMessage('انتشار متوقف شد.');await load()}
    catch(err){setError(err instanceof Error?err.message:'خطا در توقف انتشار')}
    finally{setBusy(false)}
  }
  async function addImage(){
    if(!gallery&&!galleryAsset)return;
    setBusy(true);setError('');
    try{
      const form=new FormData();form.set('section',sectionId);
      if(gallery)form.set('image',gallery);else form.set('library_asset',galleryAsset);
      form.set('caption',caption);
      await panelFetch('section-images/','POST',form);
      setGallery(null);setGalleryAsset('');setCaption('');
      setMessage('تصویر به پیش‌نویس اضافه شد؛ برای نمایش در سایت «انتشار» را بزنید.');
      await load();
    }catch(err){setError(err instanceof Error?err.message:'خطا در افزودن تصویر')}
    finally{setBusy(false)}
  }
  async function deleteImage(id:number){
    if(!window.confirm('این تصویر از پیش‌نویس گالری حذف شود؟'))return;
    try{await panelFetch(`section-images/${id}/`,'DELETE');setMessage('تصویر از پیش‌نویس حذف شد.');await load()}
    catch(err){setError(err instanceof Error?err.message:'حذف تصویر ناموفق بود')}
  }

  return <div className="fm-data-page fm-friendly-editor">
    <div className="fm-page-actions">
      <div><h2>ویرایش: {section.name||keyLabel(section.key)}</h2><p>ابتدا تغییر را ببینید، سپس پیش‌نویس را ذخیره یا منتشر کنید.</p></div>
      <button className="fm-btn fm-btn-soft" type="button" onClick={()=>setShowPreview(value=>!value)}>
        <Eye size={16}/>{showPreview?'بستن پیش‌نمایش':'نمایش پیش‌نمایش'}
      </button>
    </div>
    {error&&<div className="fm-alert fm-alert-error" role="alert">{error}</div>}
    {message&&<div className="fm-alert fm-alert-success" role="status">{message}</div>}
    {loading?<div className="fm-panel-card fm-empty-data">در حال دریافت بخش...</div>:<>
      <div className="fm-section-editor-grid">
        <section className="fm-panel-card fm-form-card">
          <h3><FileText size={19}/> {isMarquee?'عبارت‌های نوار متحرک':'ویرایش نوشته‌های سایت'}</h3>
          <p className="fm-edit-intro">متن کمرنگ فقط نمونه فعلی سایت است؛ برای جایگزینی، متن جدید خودتان را بنویسید.</p>
          <div className="fm-form-grid">
            {isMarquee?<label className="fm-field fm-span-two">
              <span>عبارت‌های نوار متحرک</span>
              <textarea rows={7} dir="ltr" value={section.draft_body} onChange={event=>set('draft_body',event.target.value)}
                placeholder={exampleBody||DEFAULT_MARQUEE_ITEMS.join('\n')}/>
              <small>هر عبارت را در یک خط جداگانه بنویسید. حداکثر ۱۵ عبارت نمایش داده می‌شود.</small>
            </label>:<>
              {!imageOnly&&<label className="fm-field fm-span-two">
                <span>{isHero?'عنوان اصلی بنر':isIntro?'عنوان انگلیسی بخش معرفی':'عنوان بخش'}</span>
                <input dir={isIntro?'ltr':'auto'} value={section.draft_title} onChange={event=>set('draft_title',event.target.value)}
                  placeholder={exampleTitle||'عنوانی که در سایت نمایش داده می‌شود'}/>
                <small>{isHero?'این عنوان روی تصویر اصلی صفحه نخست قرار می‌گیرد.':isIntro?'این نوشته در زیر تصویر بزرگ، وسط صفحه قرار می‌گیرد.':'این متن عنوان بخش در سایت است.'}</small>
                {exampleTitle&&<span className="fm-original-copy">متن فعلی: {exampleTitle}</span>}
              </label>}
              {!imageOnly&&<label className="fm-field fm-span-two">
                <span>{isHero?'توضیح کوتاه زیر عنوان':'زیرعنوان (اختیاری)'}</span>
                <input value={section.draft_subtitle} onChange={event=>set('draft_subtitle',event.target.value)}
                  placeholder={exampleSubtitle||'در صورت نیاز توضیح کوتاه وارد کنید'}/>
                <small>در صورت خالی ماندن، زیرعنوان اضافی نمایش داده نمی‌شود.</small>
              </label>}
              {!imageOnly&&<label className="fm-field fm-span-two">
                <span>{isIntro?'توضیحات زیر متن اصلی':'متن توضیحات (اختیاری)'}</span>
                <textarea rows={4} value={section.draft_body} onChange={event=>set('draft_body',event.target.value)}
                  placeholder={exampleBody||'توضیحی که بازدیدکنندگان سایت می‌بینند...'}/>
                <small>برای خوانایی بهتر، جملات کوتاه بنویسید. نیازی به نوشتن کد یا JSON نیست.</small>
              </label>}
            </>}
            {(!isMarquee&&!isValues)&&<details className="fm-fieldset-advanced fm-span-two">
              <summary>دکمه و لینک (اختیاری)</summary>
              <div className="fm-form-grid">
                <label className="fm-field"><span>متن دکمه</span><input value={section.draft_link_label} onChange={event=>set('draft_link_label',event.target.value)} placeholder="مثلاً مشاهده محصولات"/></label>
                <label className="fm-field"><span>آدرس مقصد</span><input dir="ltr" value={section.draft_link_url} onChange={event=>set('draft_link_url',event.target.value)} placeholder="/products"/></label>
              </div>
            </details>}
            <details className="fm-fieldset-advanced fm-span-two">
              <summary>تنظیمات پیشرفته بخش</summary>
              <div className="fm-form-grid">
                <label className="fm-field"><span>نام بخش در پنل</span><input value={section.name} onChange={event=>set('name',event.target.value)}/></label>
                <label className="fm-field"><span>ترتیب نمایش</span><input type="number" min="0" value={section.sort_order} onChange={event=>set('sort_order',Number(event.target.value))}/></label>
              </div>
            </details>
          </div>
        </section>
        <div className="fm-section-sidebar">
          {!isMarquee&&<section className="fm-panel-card fm-form-card">
            <h3><ImageIcon size={19}/> {isValues?'تصویر ارزش‌های سازمانی':'تصویر بخش'}</h3>
            {picture&&<img className="fm-image-preview" src={picture} alt="پیش‌نمایش تصویر در بخش"/>}
            <label className="fm-field"><span>انتخاب از کتابخانه</span>
              <select value={section.draft_asset||''} onChange={event=>{set('draft_asset',event.target.value?Number(event.target.value):null);setFile(null)}}>
                <option value="">تصویر فعلی یا تصویر پیش‌فرض</option>
                {media.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}
              </select>
            </label>
            <label className="fm-field"><span>یا بارگذاری عکس جدید</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{setFile(event.target.files?.[0]||null);if(event.target.files?.[0])set('draft_asset',null)}}/>
            </label>
            <label className="fm-field"><span>توضیح تصویر برای دسترس‌پذیری</span>
              <input value={section.draft_image_alt} onChange={event=>set('draft_image_alt',event.target.value)} placeholder="توضیح کوتاه تصویر"/>
            </label>
            <Link href="/panel/media" className="fm-text-purple">باز کردن کتابخانه تصاویر</Link>
          </section>}
          {section.kind==='products'&&<section className="fm-panel-card fm-form-card">
            <h3><Package size={19}/> انتخاب محصولات ویژه</h3>
            <div className="fm-products-pick-list">{products.map(product=><label key={product.id}>
              <input type="checkbox" checked={section.draft_products.includes(product.id)} onChange={event=>set('draft_products',event.target.checked?[...section.draft_products,product.id]:section.draft_products.filter(id=>id!==product.id))}/>{product.name}
            </label>)}</div>
          </section>}
          <section className="fm-panel-card fm-form-card">
            <h3>وضعیت بخش</h3>
            <label className="fm-field-check"><input type="checkbox" checked={section.draft_enabled} onChange={event=>set('draft_enabled',event.target.checked)}/> نمایش این بخش در سایت</label>
            <span className={`fm-status-pill ${section.is_published?'fm-status-published':'fm-status-draft'}`}>{section.is_published?'نسخه‌ای از این بخش منتشر شده است':'بخش هنوز منتشر نشده است'}</span>
          </section>
        </div>
      </div>
      {showPreview&&<section className="fm-panel-card fm-preview-card fm-friendly-preview" aria-label="پیش نمایش متن در سایت">
        <div className="fm-friendly-preview-heading"><Eye size={18}/><strong>پیش‌نمایش زنده نوشته و تصویر</strong><small>تغییرات هنگام تایپ نمایش داده می‌شوند؛ انتشار خودکار انجام نمی‌شود.</small></div>
        {isMarquee?<div className="fm-friendly-chips" dir="ltr">{parseMarqueeItems(body).map((item,index)=><span key={`${item}-${index}`}>{item}</span>)}</div>:<div className={`fm-friendly-preview-body ${isIntro?'fm-friendly-preview-intro':''}`}>
          {picture&&<img src={picture} alt="پیش‌نمایش تصویری" className="fm-preview-image"/>}
          {!imageOnly&&heading&&<h2 dir={isIntro?'ltr':'auto'}>{heading}</h2>}
          {!imageOnly&&subtitle&&<p>{subtitle}</p>}
          {!imageOnly&&!isIntro&&body&&<p>{plain(body)}</p>}
          {isIntro&&section.draft_body&&<p>{plain(section.draft_body)}</p>}
        </div>}
      </section>}
      {section.kind==='gallery'&&<section className="fm-panel-card fm-gallery-area">
        <h3>تصاویر گالری</h3>
        <div className="fm-media-grid">{section.images.map(item=><div className="fm-media-tile" key={item.id}>
          {mediaUrl(item.url)&&<img src={mediaUrl(item.url)} alt={item.alt_text||item.caption}/>}
          <div className="fm-media-tile-info"><span>{item.caption||'بدون شرح'}</span><button type="button" aria-label="حذف تصویر" onClick={()=>void deleteImage(item.id)}><Trash2 size={15}/></button></div>
        </div>)}</div>
        <div className="fm-gallery-upload">
          <label className="fm-field"><span>آپلود عکس</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{setGallery(event.target.files?.[0]||null);setGalleryAsset('')}}/></label>
          <label className="fm-field"><span>انتخاب از کتابخانه</span><select value={galleryAsset} onChange={event=>{setGalleryAsset(event.target.value);setGallery(null)}}><option value="">انتخاب تصویر</option>{media.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="fm-field"><span>شرح عکس</span><input value={caption} onChange={event=>setCaption(event.target.value)}/></label>
          <button type="button" className="fm-btn fm-btn-soft" disabled={busy||(!gallery&&!galleryAsset)} onClick={()=>void addImage()}><ImagePlus size={16}/> افزودن تصویر</button>
        </div>
      </section>}
      <div className="fm-publish-bar"><p><CheckCircle2 size={17}/> پیش‌نویس با انتشار عمومی تفاوت دارد.</p><div>
        {section.is_published&&<button type="button" className="fm-btn fm-btn-red" disabled={busy} onClick={()=>void unpublish()}>توقف انتشار</button>}
        <button type="button" className="fm-btn fm-btn-soft" disabled={busy} onClick={()=>void save(false)}><Save size={16}/> ذخیره پیش‌نویس</button>
        <button type="button" className="fm-btn fm-btn-primary" disabled={busy} onClick={()=>void save(true)}><UploadCloud size={17}/>{busy?'در حال ذخیره...':'ذخیره و انتشار'}</button>
      </div></div>
    </>}
  </div>;
}
