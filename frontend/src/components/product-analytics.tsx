'use client';
import {useEffect} from 'react';
import {recordView} from '@/lib/analytics-client';

export function ProductAnalytics({id,path}:{id:number;path:string}){
 useEffect(()=>{void recordView(`product:${id}`,{kind:'product_view',product:id,path});},[id,path]);
 return null;
}
