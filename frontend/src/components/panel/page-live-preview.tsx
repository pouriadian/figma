'use client';
import {useEffect,useRef,useState} from 'react';
import {ExternalLink,Eye,MousePointerClick,RefreshCw} from 'lucide-react';

const publicPath:Record<string,string>={home:'/',products:'/products',about:'/about',contact:'/contact',gallery:'/gallery',dealership:'/dealership',exhibitions:'/exhibitions',textures:'/textures',careers:'/careers'};
export function PageLivePreview({pageKey,sections,selectedKey,onSelect,onFocus}:{pageKey:string;sections:{key:string;name:string}[];selectedKey:string;onSelect:(key:string)=>void;onFocus:(key:string)=>void}){
 const frame=useRef<HTMLIFrameElement>(null);
 const [revision,setRevision]=useState(0);
 const path=publicPath[pageKey]||`/${encodeURIComponent(pageKey)}`;
 const isInteractive=pageKey==='home';
 useEffect(()=>{
  function receive(event:MessageEvent){
   if(event.origin!==window.location.origin || event.source!==frame.current?.contentWindow)return;
   const data=event.data as {type?:unknown;key?:unknown}|null;
   if(!data || data.type!=='faromid:select-section'||typeof data.key!=='string')return;
   if(sections.some(section=>section.key===data.key))onSelect(data.key);
  }
  window.addEventListener('message',receive);
  return()=>window.removeEventListener('message',receive);
 },[sections,onSelect]);
 useEffect(()=>{
  if(isInteractive)frame.current?.contentWindow?.postMessage({type:'faromid:focus-section',key:selectedKey},window.location.origin);
 },[isInteractive,selectedKey,revision]);
 const url=path+(isInteractive?'?cms_preview=1':'');
 return <section className="fm-panel-card fm-page-live-card" aria-label="پیش‌نمایش صفحه سایت">
  <div className="fm-live-header"><div><h2><Eye size={20}/> پیش‌نمایش واقعی سایت</h2><p>{isInteractive?'موس را روی یک قسمت ببرید؛ با کلیک، ویرایش همان بخش باز می‌شود.':'نمای منتشرشده صفحه سایت؛ بخش دلخواه را از پایین برای ویرایش انتخاب کنید.'}</p></div><div className="fm-live-actions"><button className="fm-btn fm-btn-sm" type="button" onClick={()=>setRevision(n=>n+1)}><RefreshCw size={15}/>به‌روزرسانی</button><a className="fm-btn fm-btn-sm fm-btn-soft" href={path} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>مشاهده در سایت</a></div></div>
  <div className="fm-browser-preview"><div className="fm-browser-toolbar" dir="ltr"><span className="fm-browser-dots"><i/><i/><i/></span><span>{path}</span><span className="fm-browser-status">Live</span></div>
   <iframe key={`${pageKey}-${revision}`} ref={frame} title={`پیش نمایش ${pageKey}`} src={url} loading="lazy" onLoad={()=>{if(isInteractive)frame.current?.contentWindow?.postMessage({type:'faromid:focus-section',key:selectedKey},window.location.origin)}} />
  </div>
  {isInteractive&&<div className="fm-preview-section-pills"><MousePointerClick size={17}/><span>رفتن به بخش:</span>{sections.map(section=><button key={section.key} type="button" className={selectedKey===section.key?'is-selected':''} onClick={()=>{onFocus(section.key);frame.current?.contentWindow?.postMessage({type:'faromid:focus-section',key:section.key},window.location.origin)}}>{section.name}</button>)}</div>}
  <p className="fm-live-note">این نما محتوای <strong>منتشرشده</strong> را نشان می‌دهد؛ پیش‌نویسِ ذخیره‌نشده پس از انتشار در سایت دیده می‌شود.</p>
 </section>;
}
