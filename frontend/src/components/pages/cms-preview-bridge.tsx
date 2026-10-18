'use client';
import {useEffect} from 'react';

/** Active only when viewing the homepage in the panel's same-origin preview iframe. */
export function CMSPreviewBridge(){
 useEffect(()=>{
  const query=new URLSearchParams(window.location.search);
  if(query.get('cms_preview')!=='1' || window.parent===window)return;
  const valid=[...document.querySelectorAll<HTMLElement>('[data-cms-section]')];
  const find=(key:string)=>valid.find(el=>el.dataset.cmsSection===key);
  let selected:HTMLElement|null=null;
  const select=(key:string,scroll=true)=>{
   selected?.classList.remove('cms-preview-selected');
   selected=find(key)||null;
   selected?.classList.add('cms-preview-selected');
   if(scroll)selected?.scrollIntoView({behavior:'smooth',block:'center'});
  };
  const first=query.get('cms_focus');
  if(first)select(first,false);
  function hover(ev:MouseEvent){
   valid.forEach(el=>el.classList.remove('cms-preview-hover'));
   const target=ev.target instanceof Element?ev.target.closest<HTMLElement>('[data-cms-section]'):null;
   target?.classList.add('cms-preview-hover');
  }
  function choose(ev:MouseEvent){
   // Block all navigation in preview. Only section selection goes to the panel.
   ev.preventDefault(); ev.stopPropagation();
   const target=ev.target instanceof Element?ev.target.closest<HTMLElement>('[data-cms-section]'):null;
   if(!target)return;
   const key=target.dataset.cmsSection||'';
   select(key,false);
   window.parent.postMessage({type:'faromid:select-section',key},window.location.origin);
  }
  function message(ev:MessageEvent){
   if(ev.source!==window.parent || ev.origin!==window.location.origin)return;
   const payload=ev.data as {type?:string;key?:string}|null;
   if(payload?.type==='faromid:focus-section'&&typeof payload.key==='string')select(payload.key);
  }
  document.addEventListener('mouseover',hover,true);
  document.addEventListener('click',choose,true);
  window.addEventListener('message',message);
  return()=>{
   valid.forEach(el=>el.classList.remove('cms-preview-hover','cms-preview-selected'));
   document.removeEventListener('mouseover',hover,true);
   document.removeEventListener('click',choose,true);
   window.removeEventListener('message',message);
  };
 },[]);
 return null;
}
