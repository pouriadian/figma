'use client';
import {useState} from 'react';
import {FileSpreadsheet,UploadCloud,X,CheckCircle2} from 'lucide-react';
import {panelFetch,persian} from '@/lib/panel-api';

type Summary={valid:number;duplicated:number;invalid:number;existing:number;created:number};
type Result={applied:boolean;detail:string;summary:Summary};

export function RepresentativeImport({onImported}:{onImported:()=>void}){
 const [open,setOpen]=useState(false);
 const [file,setFile]=useState<File|null>(null);
 const [preview,setPreview]=useState<Summary|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [done,setDone]=useState('');
 function close(){setOpen(false);setFile(null);setPreview(null);setError('')}
 async function submit(apply:boolean){
  if(!file)return;
  setBusy(true);setError('');
  try{
   const form=new FormData();form.set('file',file);form.set('apply',String(apply));
   const data=await panelFetch<Result>('representatives/import-excel/','POST',form);
   setPreview(data.summary);
   if(apply){setDone(`${persian(data.summary.created)} مورد جدید در وضعیت «در انتظار بررسی» اضافه شد.`);close();onImported();}
  }catch(e){setError(e instanceof Error?e.message:'فایل قابل پردازش نیست')}
  finally{setBusy(false)}
 }
 return <><div className="fm-panel-card fm-rep-import-strip"><div><strong><FileSpreadsheet size={18}/> وارد کردن نمایندگان از اکسل</strong><p>فهرست مشتریان را ابتدا بررسی کنید. هیچ مخاطبی بدون تأیید شما در سایت نمایش داده نمی‌شود.</p></div><button type="button" className="fm-btn fm-btn-soft" onClick={()=>{setDone('');setOpen(true)}}><UploadCloud size={17}/>وارد کردن اکسل</button></div>
 {done&&<div role="status" className="fm-alert fm-alert-success">{done}</div>}
 {open&&<div className="fm-modal-layer" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)close()}}><section role="dialog" aria-modal="true" aria-label="ورود اکسل نمایندگان" className="fm-editor-modal"><header><div><strong>وارد کردن فایل اکسل</strong><p>ستون‌های «نام مشتری» و «تلفن» خوانده می‌شوند؛ رکوردها فعلاً نماینده رسمی نیستند.</p></div><button type="button" onClick={close} aria-label="بستن"><X size={19}/></button></header>
 <div className="fm-editor-fields"><label className="fm-field"><span>فایل اکسل</span><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e=>{setFile(e.target.files?.[0]||null);setPreview(null);setError('')}}/></label>
 {error&&<div className="fm-alert fm-alert-error" role="alert">{error}</div>}
 {preview&&<div className="fm-import-review"><h3><CheckCircle2 size={18}/>نتیجه بررسی فایل</h3><div><span>رکوردهای معتبر: <b>{persian(preview.valid)}</b></span><span>تکراری در فایل: <b>{persian(preview.duplicated)}</b></span><span>شماره یا نام نامعتبر: <b>{persian(preview.invalid)}</b></span><span>از قبل ثبت‌شده: <b>{persian(preview.existing)}</b></span></div><p>با تأیید نهایی، فقط موارد جدید و معتبر به‌صورت «در انتظار تأیید» ثبت می‌شوند.</p></div>}
 </div><footer><button type="button" className="fm-btn" disabled={busy} onClick={close}>انصراف</button><button className="fm-btn fm-btn-soft" type="button" disabled={!file||busy} onClick={()=>submit(false)}>{busy?'در حال بررسی...':'۱. بررسی فایل'}</button><button className="fm-btn fm-btn-primary" type="button" disabled={!file||!preview||busy} onClick={()=>submit(true)}>۲. ثبت در انتظار تأیید</button></footer></section></div>}
 </>;
}
