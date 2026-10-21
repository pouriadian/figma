'use client';
export type AdminMe={id:number;name:string;email:string;role:string;modules:Record<string,boolean>;actions:{cms_edit:boolean;products_edit:boolean;products_add?:boolean;products_delete?:boolean;category_add?:boolean;media_add:boolean;media_delete?:boolean;users_add:boolean;sms_manage?:boolean;sms_approve?:boolean;sms_send?:boolean;sales_import_approve?:boolean;reward_approve?:boolean;reward_activate?:boolean}};
export type Page<T>={count:number;next:string|null;previous:string|null;results:T[]};
export type TrendPoint={date:string;views:number;products:number};
export type DashboardData={days:number;period_start:string;period_end:string;metrics:{visits:number|null;representatives:number|null;new_inquiries:number|null;products:number|null;recruitment:number|null};trend:TrendPoint[];popular_pages:{path:string;views:number}[];popular_products:{product_id:number;product__name:string;product__slug:string;views:number}[];product_series:{product_id:number;name:string;views:number;data:number[]}[];inquiry_status:{status:string;count:number}[];recent_inquiries:{id:number;full_name:string;kind:string;status:string;created_at:string;tracking_code:string}[];inquiries_period_total:number|null};

export function apiUrl(path:string){return `/api/panel/manage/${path.replace(/^\/+/, '')}`}
export function mediaUrl(path?:string){
 if(!path)return '';
 if(path.startsWith('/assets/')||path.startsWith('/uploads/'))return path;
 return '';
}
export async function panelFetch<T=Record<string,unknown>>(path:string,method='GET',data?:Record<string,unknown>|FormData):Promise<T>{
 const headers:Record<string,string>={};
 const body=data instanceof FormData?data:data===undefined?undefined:JSON.stringify(data);
 if(data!==undefined && !(data instanceof FormData)) headers['content-type']='application/json';
 const res=await fetch(apiUrl(path),{method,body,headers,cache:'no-store',credentials:'same-origin'});
 let parsed:unknown;
 try{parsed=await res.json()}catch{parsed={detail:'پاسخ سرور قابل پردازش نیست.'}}
 if(!res.ok){
  const value=parsed as Record<string,unknown>;
  const details=value.detail;
  const fields=Object.entries(value).filter(([key])=>key!=='detail').map(([key,msg])=>`${key}: ${Array.isArray(msg)?msg.join('، '):String(msg)}`).join(' | ');
  throw new Error((typeof details==='string'?details:fields)||`خطای سرور (${res.status})`);
 }
 return parsed as T;
}
export function persian(n:number|string|null|undefined){return n===null||n===undefined?'—':Number(n).toLocaleString('fa-IR')}
export function persianDate(value?:string){if(!value)return '—';try{return new Intl.DateTimeFormat('fa-IR',{year:'numeric',month:'short',day:'numeric'}).format(new Date(value))}catch{return value}}
export function getResults<T>(data:Page<T>|T[]):T[]{return Array.isArray(data)?data:data.results||[]}
