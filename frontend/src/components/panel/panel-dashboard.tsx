'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowUpLeft,BarChart3,CalendarDays,ClipboardList,Eye,FileText,Package,RefreshCw,TrendingUp,Users,BriefcaseBusiness} from 'lucide-react';
import {panelFetch,persian,persianDate,type DashboardData} from '@/lib/panel-api';
import {EmptyData,InquiryDonut,Sparkline,TopProductChart,TrafficChart} from './panel-charts';

const MAP_STATUS:Record<string,string>={new:'جدید',in_progress:'در حال بررسی',awaiting_reply:'منتظر پاسخ',closed:'پاسخ داده شده',rejected:'رد شده'};
const MAP_KIND:Record<string,string>={contact:'تماس با ما',collaboration:'همکاری',dealership:'اخذ نمایندگی',product_info:'اطلاعات محصول',quote:'استعلام قیمت'};
const PAGE_LABELS:Record<string,string>={'/':'صفحه اصلی','/products':'محصولات','/about':'درباره فرامید','/contact':'تماس با ما','/dealership':'نمایندگان','/gallery':'گالری'};
export function PanelDashboard(){
 const [days,setDays]=useState<7|30|90>(30),[data,setData]=useState<DashboardData|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;setLoading(true);setError('');panelFetch<DashboardData>(`dashboard/?days=${days}`).then(d=>{if(active)setData(d)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[days]);
 const figures=useMemo(()=>{
  const trend=data?.trend||[];
  return [
   {name:'بازدید سایت',value:data?.metrics.visits,description:`در ${persian(days)} روز گذشته`,icon:Eye,color:'violet',spark:trend.map(t=>t.views)},
   {name:'نمایندگان فعال',value:data?.metrics.representatives,description:'نمایندگان دارای همکاری فعال',icon:Users,color:'green',spark:[]},
   {name:'درخواست‌های جدید',value:data?.metrics.new_inquiries,description:'در انتظار بررسی',icon:ClipboardList,color:'rose',spark:[]},
   {name:'محصولات فعال',value:data?.metrics.products,description:'محصولات منتشرشده',icon:Package,color:'blue',spark:[]},
  ];
 },[data,days]);
 return <div className="fm-dashboard">
  <div className="fm-dashboard-tabs"><nav aria-label="بخش‌های داشبورد" className="fm-tabs"><span className="fm-tab is-active">داشبورد</span><a className="fm-tab" href="#traffic-report">آمار</a><a className="fm-tab" href="#business-report">تحلیل</a><Link className="fm-tab" href="/panel/pages">محتوا</Link></nav><label className="fm-select-wrapper"><CalendarDays size={17}/><span className="fm-sr-only">بازه زمانی نمودار</span><select value={days} onChange={e=>setDays(Number(e.target.value) as 7|30|90)}><option value={7}>۷ روز گذشته</option><option value={30}>۳۰ روز گذشته</option><option value={90}>۹۰ روز گذشته</option></select></label></div>
  {error&&<div className="fm-alert fm-alert-error" role="alert">{error}<button onClick={()=>setDays(7)}>تلاش مجدد</button></div>}
  <div className="fm-kpis">{figures.map(f=>{const Icon=f.icon;return <div className={`fm-kpi fm-kpi-${f.color}`} key={f.name}><div className="fm-kpi-top"><h2>{f.name}</h2><span className="fm-kpi-icon"><Icon size={23}/></span></div><div className="fm-kpi-value">{loading?'…':persian(f.value)}</div><div className="fm-kpi-footer"><span>{f.description}</span>{f.spark.length>0&&<Sparkline data={f.spark}/>}</div></div>})}</div>
  <section id="traffic-report" className="fm-panel-card fm-big-chart-card"><div className="fm-card-head"><div><div className="fm-card-heading"><BarChart3 size={20}/><h2>روند بازدید سایت در {persian(days)} روز اخیر</h2></div><p>تعداد رویدادهای واقعی بازدید صفحات وب‌سایت</p></div><span className="fm-card-amount">{persian(data?.metrics.visits)} بازدید</span></div><div className="fm-chart-legends"><span><i className="fm-dot fm-dot-purple"/>بازدید صفحه</span><span><i className="fm-dot fm-dot-soft"/>بازدید محصول</span></div>{data?.trend.length?<TrafficChart trend={data.trend}/>:<EmptyData text={loading?'در حال دریافت اطلاعات نمودار...':'هنوز داده بازدیدی در بازه انتخاب‌شده ثبت نشده است.'}/>}</section>
  <div id="business-report" className="fm-dashboard-bottom">
   <section className="fm-panel-card fm-product-rank"><div className="fm-card-head"><div><div className="fm-card-heading"><TrendingUp size={20}/><h2>محصولات پربازدید</h2></div><p>نمودار مقایسه‌ای بازدید هر محصول در {persian(days)} روز</p></div><Link href="/panel/products" aria-label="مدیریت محصولات" className="fm-card-icon-link"><ArrowUpLeft size={19}/></Link></div><TopProductChart products={data?.product_series||[]}/></section>
   <section className="fm-panel-card fm-recent-requests"><div className="fm-card-head"><div><div className="fm-card-heading"><ClipboardList size={20}/><h2>درخواست‌های اخیر</h2></div><p>آخرین درخواست‌های ثبت‌شده در سایت</p></div><Link href="/panel/inquiries" aria-label="مدیریت درخواست‌ها" className="fm-card-icon-link"><ArrowUpLeft size={19}/></Link></div><div className="fm-requests-scroll"><table className="fm-table fm-dashboard-table"><thead><tr><th>نام</th><th>نوع درخواست</th><th>وضعیت</th><th>تاریخ</th></tr></thead><tbody>{(data?.recent_inquiries||[]).map(item=><tr key={item.id}><td>{item.full_name}</td><td>{MAP_KIND[item.kind]||item.kind}</td><td><span className={`fm-status-pill fm-status-${item.status}`}>{MAP_STATUS[item.status]||item.status}</span></td><td>{persianDate(item.created_at)}</td></tr>)}</tbody></table>{!data?.recent_inquiries.length&&<EmptyData text="درخواست جدیدی ثبت نشده است."/>}</div><Link href="/panel/inquiries" className="fm-card-footer-link">مشاهده همه درخواست‌ها <ArrowLeft size={17}/></Link></section>
   <div className="fm-mini-column"><section className="fm-panel-card fm-donut-card"><div className="fm-card-head"><div><div className="fm-card-heading"><ClipboardList size={19}/><h2>وضعیت درخواست‌ها</h2></div><p>وضعیت درخواست‌ها در بازه انتخاب‌شده</p></div></div><InquiryDonut items={data?.inquiry_status||[]}/></section><section className="fm-panel-card fm-popular-pages"><div className="fm-card-head"><div><div className="fm-card-heading"><FileText size={19}/><h2>صفحات پربازدید</h2></div><p>بیشترین بازدیدهای ثبت‌شده</p></div></div>{(data?.popular_pages||[]).length?<div className="fm-page-popular-list">{(data?.popular_pages||[]).map((p,i)=><div className="fm-page-popular" key={p.path}><span>{persian(i+1)}.</span><strong>{PAGE_LABELS[p.path]||p.path}</strong><span>{persian(p.views)}</span></div>)}</div>:<EmptyData text="آمار بازدید صفحات موجود نیست."/>}</section></div>
  </div>
  <div className="fm-footer-note"><BriefcaseBusiness size={14}/>آمار از دیتابیس Django خوانده می‌شود و داده نمایشی در گزارش‌ها استفاده نمی‌شود.</div>
 </div>
}
