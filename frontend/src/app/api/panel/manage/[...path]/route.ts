import {NextRequest,NextResponse} from 'next/server';
import {authorized,isSameOrigin,jsonError,setAdminCookies,clearAdminCookies} from '@/lib/panel-auth';
const ALLOWED=new Set(['dashboard','pages','sections','section-images','media','products','product-images','categories','content','representatives','inquiries','applications','announcements','deliveries','users']);
const MUTATING=new Set(['POST','PATCH','PUT','DELETE']);

async function handler(request:NextRequest,context:{params:Promise<{path:string[]}>}){
 const {path}=await context.params;
 if(!path.length||!ALLOWED.has(path[0])||path.some(x=>!/^[-a-zA-Z0-9_]+$/.test(x)))return jsonError('مسیر نامعتبر است.',404);
 if(MUTATING.has(request.method)&&!isSameOrigin(request))return jsonError('درخواست از دامنه دیگری مجاز نیست.',403);
 const type=request.headers.get('content-type')||'';
 if(MUTATING.has(request.method)&&type&&!type.startsWith('application/json')&&!type.startsWith('multipart/form-data'))return jsonError('فرمت فایل پشتیبانی نمی‌شود.',415);
 let body:BodyInit|undefined;
 if(MUTATING.has(request.method)){
  const data=await request.arrayBuffer();
  if(data.byteLength>16*1024*1024)return jsonError('حجم درخواست بیش از حد مجاز است.',413);
  body=data;
 }
 const query=request.nextUrl.search;
 try{
  const {response,tokens}=await authorized(request,`manage/${path.join('/')}/${query}`,{method:request.method,body,contentType:type||undefined});
  if(!response){const out=jsonError('ابتدا وارد پنل شوید.',401);clearAdminCookies(out);return out;}
  const isBinary=response.headers.get('content-type')?.includes('application/pdf')||response.headers.get('content-disposition')?.includes('attachment');
  const headers=new Headers({'cache-control':'private, no-store','x-content-type-options':'nosniff'});
  headers.set('content-type',response.headers.get('content-type')||'application/json');
  if(isBinary){const disposition=response.headers.get('content-disposition');if(disposition)headers.set('content-disposition',disposition);}
  const out=new NextResponse(await response.arrayBuffer(),{status:response.status,headers});
  if(tokens)setAdminCookies(out,tokens);
  if(response.status===401)clearAdminCookies(out);
  return out;
 }catch{return jsonError('سرور Backend در دسترس نیست.',503);}
}
export {handler as GET,handler as POST,handler as PATCH,handler as PUT,handler as DELETE};
