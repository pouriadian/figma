'use client';
import {useEffect,useState} from 'react';
import {Building2,CheckCircle2,Clock3,TrendingUp,Users} from 'lucide-react';
import {panelFetch,persian} from '@/lib/panel-api';

type Stats={total:number;active:number;pending:number;public:number;sales_reported:number;last_month_sales_total:string|null;rated:number;average_score:number|null};
export function RepresentativeSummary(){
 const [stats,setStats]=useState<Stats|null>(null);
 useEffect(()=>{panelFetch<Stats>('representatives/summary/').then(setStats).catch(()=>setStats(null))},[]);
 if(!stats)return null;
 const cards=[
  {label:'کل رکوردها',value:persian(stats.total),note:'فهرست داخلی',icon:Users},
  {label:'نمایندگان فعال',value:persian(stats.active),note:'وضعیت همکاری فعال',icon:CheckCircle2},
  {label:'در انتظار بررسی',value:persian(stats.pending),note:'از جمله ورودی‌های اکسل',icon:Clock3},
  {label:'نمایش در سایت',value:persian(stats.public),note:'عمومی‌شده با تأیید',icon:Building2},
  {label:'فروش ماه گذشته',value:stats.last_month_sales_total===null?'ثبت نشده':persian(stats.last_month_sales_total),note:`${persian(stats.sales_reported)} نماینده دارای اطلاعات (ریال)`,icon:TrendingUp},
  {label:'میانگین امتیاز',value:stats.average_score===null?'ثبت نشده':persian(stats.average_score)+' / ۱۰۰',note:`بر اساس ${persian(stats.rated)} امتیاز ثبت‌شده`,icon:TrendingUp},
 ];
 return <section aria-label="آمار نمایندگان" className="fm-rep-stats">{cards.map(item=>{const Icon=item.icon;return <article key={item.label} className="fm-rep-stat"><span><Icon size={19}/>{item.label}</span><strong>{item.value}</strong><small>{item.note}</small></article>})}</section>;
}
