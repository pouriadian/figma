'use client';

import {useEffect, useMemo, useState, type CSSProperties} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type {DesignNode, Paint} from '@/lib/types';
import {asPath} from '@/lib/constants';
import {brand} from '@/lib/media';
import {ContactMapEmbed} from './contact-map';
import {MobilePage} from './mobile-page';
import {X} from 'lucide-react';

export type PageSlug = 'home'|'products'|'about'|'careers'|'gallery'|'dealership'|'contact'|'exhibitions';

function visible(p: Paint) {return p.visible!==false;}
function firstColor(fills?: Paint[]) {
  return fills?.filter(visible).findLast(p=>p.type==='SOLID')?.color || '#151515';
}
function paintCss(fills:Paint[]|undefined):CSSProperties {
  if (!fills?.length) return {};
  const p=fills.filter(visible);
  const image=p.findLast(p=>p.type==='IMAGE' && p.url);
  const solid=p.findLast(p=>p.type==='SOLID');
  const gradient=p.findLast(p=>p.type.startsWith('GRADIENT') && p.stops?.length);
  const style:CSSProperties={};
  if(solid?.color) style.backgroundColor=solid.color;
  if(image?.url){
    style.backgroundImage=`url('${image.url}')`;
    style.backgroundSize=image.mode==='FIT'?'contain':image.mode==='TILE'?'auto':'cover';
    style.backgroundRepeat=image.mode==='TILE'?'repeat':'no-repeat';
    style.backgroundPosition='center';
  }
  if(gradient?.stops?.length){
    const stops=gradient.stops.map(s=>`${s.color} ${Math.round(s.position*100)}%`).join(', ');
    const grad=gradient.type==='GRADIENT_RADIAL'?`radial-gradient(circle, ${stops})`:`linear-gradient(105deg, ${stops})`;
    style.backgroundImage=image?.url?`${grad}, url('${image.url}')`:grad;
  }
  return style;
}

const HERO_STRIPES_SRC = brand.heroStripes;

function FigmaNode({node}: {node:DesignNode}) {
  const isText=node.type==='TEXT';
  const isVector=node.type==='VECTOR';
  const vectorGradient=isVector?node.fills?.filter(visible).findLast(p=>p.type.startsWith('GRADIENT')&&p.stops?.length):undefined;
  const gradientId=`figma-gradient-${node.id.replace(/[^a-zA-Z0-9]/g,'-')}`;
  const style:CSSProperties={
    position:'absolute', left:node.x, top:node.y,
    width:node.w, height:node.h,
    boxSizing:'border-box',
    transformOrigin:'top left',
  };
  if(node.opacity!==undefined) style.opacity=node.opacity;
  if (node.id === '240:143') {
    return (
      <div style={style} data-figma-node={node.id}>
        <Image src={HERO_STRIPES_SRC} alt="" aria-hidden width={node.w} height={node.h} unoptimized style={{display:'block',width:'100%',height:'100%',objectFit:'contain'}} />
      </div>
    );
  }
  if (node.id === '226:168') {
    return (
      <div style={style} data-figma-node={node.id}>
        <Image src={brand.homeHistoryPanels} alt="" aria-hidden width={node.w} height={node.h} unoptimized style={{display:'block',width:'100%',height:'100%',objectFit:'contain'}} />
      </div>
    );
  }
  if (node.id === '571:53') {
    return (
      <div style={style} data-figma-node={node.id}>
        <ContactMapEmbed className="contact-map-embed" />
      </div>
    );
  }
  if(node.id==='243:147') style.filter='blur(12px) brightness(.65)';
  if(node.matrix) style.transform=`matrix(${node.matrix.join(',')},0,0)`;
  if(node.radius) style.borderRadius=node.radius;
  if(node.type==='ELLIPSE') style.borderRadius='50%';
  if(node.overflow) style.overflow=node.overflow as CSSProperties['overflow'];
  if (node.effects?.length) style.boxShadow=node.effects.map(e=>`${e.type==='INNER_SHADOW'?'inset ':''}${e.x}px ${e.y}px ${e.r}px ${e.spread}px ${e.color}`).join(', ');
  if(isText){
    style.color=firstColor(node.fills);
    style.fontSize=node.fontSize||20;
    style.fontWeight=node.fontWeight||400;
    style.textAlign=node.align||'right';
    style.fontFamily='var(--font-vazirmatn), var(--font-inter), Tahoma, Arial, sans-serif';
    style.whiteSpace=!(node.text||'').includes('\n') && node.h <= (node.fontSize||20)*2.3 ? 'nowrap' : 'pre-wrap';
    style.wordBreak='normal';
    style.lineHeight=node.lineHeight?.value&&node.lineHeight.value>0&&node.lineHeight.value<8&&node.lineHeight.units==='PIXELS'?`${node.lineHeight.value}px`:1.35;
    style.direction=node.rtl || /[\u0600-\u06FF]/.test(node.text||'')?'rtl':'ltr';
    if(node.vAlign==='center'){style.display='flex';style.alignItems='center';}
    if(node.vAlign==='bottom'){style.display='flex';style.alignItems='end';}
    if(node.letterSpacing && Math.abs(node.letterSpacing)<15)style.letterSpacing=node.letterSpacing;
  }else if(!isVector){
    Object.assign(style,paintCss(node.fills));
    if(node.strokeWeight&&node.strokes?.length){
      style.border=`${node.strokeWeight}px solid ${firstColor(node.strokes)}`;
    }
  }
  return <div style={style} data-figma-node={node.id}>
    {isText && node.text}
    {isVector && node.paths?.length ? <svg aria-hidden="true" width="100%" height="100%" viewBox={`0 0 ${Math.max(1,node.w)} ${Math.max(1,node.h)}`} preserveAspectRatio="none" style={{display:'block',overflow:'visible'}}>
      {vectorGradient?.stops?.length && <defs><linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">{vectorGradient.stops.map((stop,i)=><stop key={i} offset={`${stop.position*100}%`} stopColor={stop.color}/>)}</linearGradient></defs>}
      {node.paths.map((path,i)=><path key={i} d={path.d} fill={vectorGradient?`url(#${gradientId})`:(path.color||'none')} fillRule={path.winding==='EVENODD'?'evenodd':'nonzero'}/>)}
    </svg>:null}
    {node.children?.map(child=><FigmaNode key={child.id} node={child}/>)}
  </div>;
}

type Hotspot={x:number;y:number;w:number;h:number;href?:string;kind:'link'|'image'|'action';image?:string;label:string};

function getHotspots(root:DesignNode,slug:PageSlug):Hotspot[]{
  const spots:Hotspot[]=[];
  function walk(node:DesignNode,x:number,y:number){
    const absX=x+node.x,absY=y+node.y;
    if(node.type==='TEXT'&&node.text){
      const text=node.text.trim();
      const href=asPath(text);
      if(href && absY>35 && absY<190){
        spots.push({x:absX-8,y:absY-10,w:node.w+18,h:Math.max(node.h+16,40),href,kind:'link',label:text});
      }
      if(text==='بیشتر' && slug==='home') {
        spots.push({x:absX-18,y:absY-16,w:node.w+36,h:node.h+32,href:absY<2650?'/products':'/gallery',kind:'link',label:`مشاهده ${absY<2650?'محصولات':'گالری'}`});
      }
      if((text==='ارسال رزومه'&&slug==='careers') || (text==='فرم اخذ نمایندگی'&&slug==='dealership')){
        const sub=slug==='careers'?'درخواست همکاری':'درخواست اخذ نمایندگی';
        spots.push({x:absX-16,y:absY-16,w:node.w+32,h:node.h+32,kind:'action',label:sub,href:`mailto:info@faromid.com?subject=${encodeURIComponent(sub)}`});
      }
    }
    if(node.type==='ROUNDED_RECTANGLE' && node.fills?.some(p=>p.type==='IMAGE'&&p.url)){
      const img=node.fills.find(p=>p.type==='IMAGE'&&p.url)?.url;
      if(img && (slug==='gallery'||slug==='exhibitions')){
        // Only images of meaningful size, never decorative thumbnails.
        if(node.w>180&&node.h>180)spots.push({x:absX,y:absY,w:node.w,h:node.h,image:img,kind:'image',label:node.name||'نمایش تصویر'});
      }
      if(img && ((slug==='home'&&absY>700&&absY<2000)||(slug==='products'&&absY>700&&absY<3450)) && node.w>160 && node.h>180){
        const nth=spots.filter(s=>s.kind==='link' && s.href?.startsWith('/products/product-')).length;
        spots.push({x:absX,y:absY,w:node.w,h:node.h,kind:'link',href:`/products/product-${(nth%12)+1}`,label:'مشاهده جزئیات محصول'});
      }
    }
    node.children?.forEach(c=>walk(c,absX,absY));
  }
  root.children?.forEach(c=>walk(c,0,0));
  return spots;
}

export function FigmaPage({slug,design}:{slug:PageSlug;design:DesignNode}){
  const [lightbox,setLightbox]=useState<string|null>(null);
  const hotspots=useMemo(()=>getHotspots(design,slug),[design,slug]);
  const figmaSize = {
    '--figma-w': `${design.w}px`,
    '--figma-h': `${design.h}px`,
  } as CSSProperties;
  useEffect(()=>{
    if(!lightbox)return;
    const key=(ev:KeyboardEvent)=>{if(ev.key==='Escape')setLightbox(null);};
    window.addEventListener('keydown',key);
    return()=>window.removeEventListener('keydown',key);
  },[lightbox]);
  return <>
    <div className="desktop-site">
      <div className="figma-viewport" style={figmaSize}>
        <div className="figma-artboard" style={{...paintCss(design.fills),width:design.w,height:design.h}}>
          {design.children?.map(n=><FigmaNode key={n.id} node={n}/>)}
          <Link href="/" className="figma-hotspot" aria-label="صفحه اصلی فرامید" style={{left:90,top:60,width:300,height:100}}/>
          {hotspots.map((spot,i)=>spot.kind==='image'?<button key={i} type="button" className="figma-hotspot image-spot" aria-label={`بزرگ‌نمایی ${spot.label}`} onClick={()=>spot.image&&setLightbox(spot.image)} style={{left:spot.x,top:spot.y,width:spot.w,height:spot.h}}/>:<a key={i} href={spot.href} className="figma-hotspot" aria-label={spot.label} style={{left:spot.x,top:spot.y,width:spot.w,height:spot.h}}/>)}
        </div>
      </div>
    </div>
    <div className="mobile-site"><MobilePage slug={slug} onOpenImage={setLightbox}/></div>
    {lightbox && <div className="lightbox" role="dialog" aria-modal="true" aria-label="نمایش تصویر" onClick={()=>setLightbox(null)}>
      <button className="lightbox-close" aria-label="بستن" onClick={()=>setLightbox(null)}><X size={24}/></button>
      <Image src={lightbox} alt="تصویر گالری فرامید" width={1400} height={1100} style={{objectFit:'contain',maxHeight:'85vh',maxWidth:'92vw',width:'auto',height:'auto'}} unoptimized/>
    </div>}
  </>;
}
