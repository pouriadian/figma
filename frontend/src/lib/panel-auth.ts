/** Server-only Django admin BFF. Staff JWTs never reach client-side JavaScript. */
import 'server-only';
import {NextRequest, NextResponse} from 'next/server';

export const ADMIN_ACCESS = 'faromid_panel_access';
export const ADMIN_REFRESH = 'faromid_panel_refresh';
export const DJANGO = (process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const ACCESS_AGE = 30 * 60;
const REFRESH_AGE = 7 * 24 * 60 * 60;

export type AdminTokens = {access:string;refresh?:string};

export function setAdminCookies(response:NextResponse,tokens:AdminTokens) {
 const shared={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'};
 response.cookies.set(ADMIN_ACCESS,tokens.access,{...shared,maxAge:ACCESS_AGE});
 if(tokens.refresh)response.cookies.set(ADMIN_REFRESH,tokens.refresh,{...shared,maxAge:REFRESH_AGE});
}
export function clearAdminCookies(response:NextResponse) {
 response.cookies.set(ADMIN_ACCESS,'',{path:'/',maxAge:0});
 response.cookies.set(ADMIN_REFRESH,'',{path:'/',maxAge:0});
}
export function isSameOrigin(request: NextRequest): boolean {
 // Check the incoming Host header, not request.nextUrl.origin. In local dev
 // Next can normalize localhost to 127.0.0.1, which caused a false 403.
 const origin = request.headers.get('origin');
 const host = request.headers.get('host');
 if (!origin || !host) return false;
 try {
  const parsed = new URL(origin);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  if (parsed.username || parsed.password) return false;
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') return false;
  return parsed.host.toLowerCase() === host.toLowerCase();
 } catch {
  return false;
 }
}

export async function djangoRequest(path:string,access:string, options?:{method?:string;body?:BodyInit;contentType?:string}) {
 const headers:Record<string,string>={Authorization:`Bearer ${access}`,Accept:'application/json'};
 if(options?.contentType)headers['content-type']=options.contentType;
 return fetch(`${DJANGO}/api/v1/${path}`,{method:options?.method||'GET',headers,body:options?.body,cache:'no-store',signal:AbortSignal.timeout(18000)});
}
export async function authorized(request:NextRequest,path:string,options?:{method?:string;body?:BodyInit;contentType?:string}) {
 const access=request.cookies.get(ADMIN_ACCESS)?.value;
 const refresh=request.cookies.get(ADMIN_REFRESH)?.value;
 let response=access?await djangoRequest(path,access,options):undefined;
 let tokens:AdminTokens|undefined;
 if((!response || response.status===401) && refresh){
   const refreshed=await fetch(`${DJANGO}/api/v1/auth/refresh/`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({refresh}),cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(refreshed.ok){tokens=await refreshed.json() as AdminTokens; response=await djangoRequest(path,tokens.access,options);}
 }
 return {response,tokens};
}
export function jsonError(detail:string,status:number){return NextResponse.json({detail},{status,headers:{'cache-control':'no-store'}});}
