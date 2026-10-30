'use client';
import Image from 'next/image';
import {useState} from 'react';
import {ImageOff} from 'lucide-react';
import {Skeleton} from './skeletons';
export function MediaImage({src,alt,sizes,className='object-cover',priority=false}:{src:string;alt:string;sizes:string;className?:string;priority?:boolean}){const [loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false);return <><Image fill src={src} alt={alt} sizes={sizes} priority={priority} onLoad={()=>setLoaded(true)} onError={()=>setFailed(true)} className={`${className} ${loaded&&!failed?'opacity-100':'opacity-0'}`}/>{!loaded&&!failed&&<Skeleton className="absolute inset-0 block rounded-none"/>}{failed&&<div role="img" aria-label={`${alt} (تصویر در دسترس نیست)`} className="absolute inset-0 grid place-items-center bg-[#eeede8] text-[#969c95]"><ImageOff size={24}/></div>}</>}
