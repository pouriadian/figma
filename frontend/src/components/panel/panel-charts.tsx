'use client';
import {useMemo,useState} from 'react';
import {persian,type TrendPoint} from '@/lib/panel-api';

function chartPoints(vals:number[],w:number,h:number,max:number){
 return vals.map((v,i)=>`${(i/(Math.max(vals.length-1,1)))*w},${h-((v/Math.max(max,1))*h)}`).join(' ');
}
export function Sparkline({data,color='#a73b49'}:{data:number[];color?:string}){
 const values=data.length?data:[0,0];const max=Math.max(1,...values);
 return <svg className="fm-sparkline" viewBox="0 0 120 40" preserveAspectRatio="none" role="img" aria-label="نمودار تغییرات"><polyline points={chartPoints(values,118,32,max).split(' ').map(p=>{const [x,y]=p.split(',');return `${2+Number(x)},${4+Number(y)}`}).join(' ')} fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
export function TrafficChart({trend}:{trend:TrendPoint[]}){
 const [active,setActive]=useState<number|null>(null);
 const max=Math.max(1,...trend.map(x=>Math.max(x.views,x.products)))*1.12;
 const width=1020,height=250,padTop=12,padBottom=26,chartHeight=height-padTop-padBottom;
 const ticks=[0,.25,.5,.75,1];
 const count=trend.length;const step=width/Math.max(count,1);
 const poly=trend.map((t,i)=>`${i*step+step/2},${padTop+chartHeight-t.views/max*chartHeight}`).join(' ');
 const labels=trend.filter((_,i)=>i%Math.max(1,Math.ceil(count/10))===0);
 return <div className="fm-traffic-wrapper" dir="ltr">
  <div className="fm-chart-y-labels" dir="rtl">{[...ticks].reverse().map(t=><span key={t}>{persian(Math.round(max*t))}</span>)}</div>
  <div className="fm-traffic-plot"><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="نمودار بازدیدهای روزانه و بازدید محصولات" role="img">
    {ticks.map(t=><line key={t} x1={0} y1={padTop+chartHeight-t*chartHeight} x2={width} y2={padTop+chartHeight-t*chartHeight} stroke="#e7e9f3" strokeDasharray="5 5"/>)}
    {trend.map((v,i)=>{const x=i*step+step*.17;const y=padTop+chartHeight-(v.views/max*chartHeight);return <rect key={v.date} x={x} y={y} width={Math.max(1,step*.66)} height={padTop+chartHeight-y} rx={2} fill={active===i?'#dd9ea7':'#f4e6e9'} opacity={.9}/>})}
    <polyline points={poly} fill="none" stroke="#ab3948" strokeWidth={2.8} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/>
    {trend.map((v,i)=><circle key={`dot-${v.date}`} cx={i*step+step/2} cy={padTop+chartHeight-v.views/max*chartHeight} r={active===i?5.8:3.3} fill="#fff" stroke="#ab3948" strokeWidth={2.4} vectorEffect="non-scaling-stroke"><title>{`${v.date}: ${v.views} بازدید`}</title></circle>)}
    {trend.map((v,i)=><rect key={`touch-${v.date}`} x={i*step} y={0} width={step} height={height} fill="transparent" onMouseEnter={()=>setActive(i)} onMouseLeave={()=>setActive(null)} onFocus={()=>setActive(i)} tabIndex={0}><title>{`${v.date}: ${v.views} بازدید، ${v.products} بازدید محصول`}</title></rect>)}
  </svg><div className="fm-chart-xlabels" dir="ltr">{labels.map(p=><span key={p.date}>{new Date(p.date+'T12:00:00').toLocaleDateString('fa-IR',{month:'short',day:'numeric'})}</span>)}</div></div>
  {active!==null&&trend[active]&&<div className="fm-chart-tooltip" dir="rtl"><strong>{trend[active].date}</strong><span>{persian(trend[active].views)} بازدید سایت</span><span>{persian(trend[active].products)} بازدید محصول</span></div>}
 </div>
}
export function TopProductChart({products}:{products:{name:string;views:number;data:number[]}[]}){
 const max=Math.max(1,...products.map(p=>p.views));
 if(!products.length)return <EmptyData text="هنوز رویداد بازدید محصول در این بازه ثبت نشده است."/>;
 return <div className="fm-top-products-chart">{products.map((p,i)=><div className="fm-product-bar-row" key={`${p.name}-${i}`}><span className="fm-rank-index">{persian(i+1)}</span><div className="fm-product-bar-body"><div className="fm-product-bar-label"><span title={p.name}>{p.name}</span><strong>{persian(p.views)} بازدید</strong></div><div className="fm-product-bar-track"><div style={{width:`${Math.max(2,p.views/max*100)}%`}} className="fm-product-bar-fill"/></div></div><Sparkline data={p.data} color={['#b43a4b','#33363c','#777c85','#b9717b','#a8aeb6'][i%5]}/></div>)}</div>
}
const STATUS_COLORS:Record<string,string>={new:'#18b979',in_progress:'#a83442',awaiting_reply:'#4298f0',closed:'#52b7ae',rejected:'#f36772'};
const STATUS_LABELS:Record<string,string>={new:'جدید',in_progress:'در حال بررسی',awaiting_reply:'منتظر پاسخ',closed:'پاسخ داده شد',rejected:'رد شده'};
export function InquiryDonut({items}:{items:{status:string;count:number}[]}){
 const total=items.reduce((s,x)=>s+x.count,0);
 const gradient=useMemo(()=>{
  if(total===0)return 'conic-gradient(#edf0f6 0 100%)';
  let pos=0;return `conic-gradient(${items.map(item=>{const next=pos+item.count/total*100;const seg=`${STATUS_COLORS[item.status]||'#b7c0cf'} ${pos}% ${next}%`;pos=next;return seg}).join(',')})`;
 },[items,total]);
 return <div className="fm-donut-row"><div className="fm-donut" style={{background:gradient}} role="img" aria-label={`توزیع ${persian(total)} درخواست`}><div className="fm-donut-hole"><strong>{persian(total)}</strong><small>درخواست</small></div></div><div className="fm-donut-legend">{items.map(item=><div className="fm-legend-line" key={item.status}><span className="fm-legend-name"><i style={{background:STATUS_COLORS[item.status]||'#b7c0cf'}}/>{STATUS_LABELS[item.status]||item.status}</span><strong>{persian(item.count)}</strong></div>)}</div></div>
}
export function EmptyData({text}:{text:string}){return <div className="fm-empty-data"><span className="fm-empty-circle"/> {text}</div>}
