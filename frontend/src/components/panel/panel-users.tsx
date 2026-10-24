'use client';

import {useCallback,useEffect,useState} from 'react';
import {Building2,CheckCircle2,CirclePause,CirclePlay,Loader2,Pencil,Plus,ShieldCheck,UsersRound,X} from 'lucide-react';
import {panelFetch,type Page} from '@/lib/panel-api';
import {PanelTable} from './panel-table';

type Team={id:number;name:string;is_active:boolean};

export function PanelUsers(){
 const [teams,setTeams]=useState<Team[]>([]),[name,setName]=useState(''),[editing,setEditing]=useState<number|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [canManageTeams,setCanManageTeams]=useState(false);
 const load=useCallback(async()=>{setLoading(true);setError('');try{const data=await panelFetch<Page<Team>>('teams/?page_size=100');setTeams(data.results||[])}catch(e){setError(e instanceof Error?e.message:'دریافت تیم‌ها ناموفق بود.')}finally{setLoading(false)}},[]);
 useEffect(()=>{void load();fetch('/api/panel/session',{cache:'no-store'}).then(response=>response.json()).then(data=>setCanManageTeams(Boolean(data.actions?.users_manage))).catch(()=>setCanManageTeams(false))},[load]);
 async function saveTeam(event:React.FormEvent){event.preventDefault();if(!name.trim())return;setBusy(true);setError('');setNotice('');try{await panelFetch(`teams/${editing?`${editing}/`:''}`,editing?'PATCH':'POST',{name:name.trim()});setName('');setEditing(null);setNotice('تیم ذخیره شد.');await load();window.dispatchEvent(new Event('faromid:teams-updated'))}catch(e){setError(e instanceof Error?e.message:'ذخیره تیم ناموفق بود.')}finally{setBusy(false)}}
 async function toggleTeam(team:Team){setBusy(true);setError('');setNotice('');try{if(team.is_active){await panelFetch(`teams/${team.id}/`,'DELETE');setNotice('تیم غیرفعال شد؛ سابقه اعضا حفظ شده است.')}else{await panelFetch(`teams/${team.id}/`,'PATCH',{is_active:true});setNotice('تیم دوباره فعال شد.')}await load();window.dispatchEvent(new Event('faromid:teams-updated'))}catch(e){setError(e instanceof Error?e.message:'تغییر وضعیت تیم ناموفق بود.')}finally{setBusy(false)}}
 return <div className="mb-5 space-y-4" dir="rtl">
  {canManageTeams&&<>
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
   <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-700"><UsersRound size={19}/></span><div><h2 className="m-0 text-base font-bold text-slate-900">تیم‌های سازمانی</h2><p className="mb-0 mt-1 text-sm leading-6 text-slate-500">تیم‌ها برای دسته‌بندی کارکنان و ارسال پیام گروهی هستند؛ مجوز پنل را تغییر نمی‌دهند.</p></div></div><div className="fm-team-counts"><span className="fm-team-count-active"><i/>{teams.filter(team=>team.is_active).length} فعال</span><span className="fm-team-count-inactive"><i/>{teams.filter(team=>!team.is_active).length} غیرفعال</span></div></div>
   {(error||notice)&&<div className={`mt-4 rounded-xl p-3 text-sm ${error?'bg-rose-50 text-rose-800':'bg-emerald-50 text-emerald-800'}`} role={error?'alert':'status'}>{error||notice}</div>}
   <form onSubmit={saveTeam} className="fm-team-form"><label className="sr-only" htmlFor="staff-team-name">نام تیم</label><input id="staff-team-name" required maxLength={80} value={name} onChange={event=>setName(event.target.value)} placeholder="نام تیم؛ مثلاً فروش یا منابع انسانی"/><button type="submit" disabled={busy||!name.trim()}>{busy?<Loader2 size={16} className="animate-spin"/>:editing?<Pencil size={15}/>:<Plus size={16}/>}<span>{editing?'ذخیره تغییر':'افزودن تیم'}</span></button>{editing!==null&&<button type="button" className="fm-team-cancel" onClick={()=>{setEditing(null);setName('')}}><X size={15}/><span>انصراف</span></button>}</form>
   <div className="fm-team-grid">{loading?<div className="fm-team-empty" role="status"><Loader2 size={17} className="animate-spin"/>در حال بارگذاری تیم‌ها…</div>:teams.length?teams.map(team=><article key={team.id} className={`fm-team-card${team.is_active?' is-active':' is-inactive'}`}><div className="fm-team-card-main"><span className="fm-team-icon"><Building2 size={17}/></span><div className="fm-team-card-copy"><strong>{team.name}</strong><span className={`fm-team-status${team.is_active?' is-active':' is-inactive'}`}>{team.is_active?<CheckCircle2 size={13}/>:<CirclePause size={13}/>}<span>{team.is_active?'فعال':'غیرفعال'}</span></span></div></div><div className="fm-team-actions"><button type="button" disabled={busy} onClick={()=>{setEditing(team.id);setName(team.name);document.getElementById('staff-team-name')?.focus()}} aria-label={`ویرایش نام تیم ${team.name}`} title="ویرایش نام"><Pencil size={15}/></button><button type="button" disabled={busy} onClick={()=>void toggleTeam(team)} aria-label={team.is_active?`غیرفعال‌کردن تیم ${team.name}`:`فعال‌کردن تیم ${team.name}`} title={team.is_active?'غیرفعال‌کردن':'فعال‌کردن'} className={team.is_active?'fm-team-deactivate':'fm-team-activate'}>{team.is_active?<CirclePause size={16}/>:<CirclePlay size={16}/>}</button></div></article>):<div className="fm-team-empty"><Building2 size={19}/><span>هنوز تیمی ثبت نشده است.</span></div>}</div>
   <p className="mb-0 mt-4 flex items-center gap-2 text-xs leading-5 text-slate-500"><ShieldCheck size={14}/>مدیر کل را فقط سوپرادمین می‌تواند تعیین کند؛ سطح دسترسی کاربران هنگام ساخت یا ویرایش جداگانه انتخاب می‌شود.</p>
  </section>
  </>}
  <PanelTable module="users"/>
 </div>;
}
