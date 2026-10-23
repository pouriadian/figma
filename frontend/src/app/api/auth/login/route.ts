import {NextRequest,NextResponse} from 'next/server';
import {signedProxyHeaders} from '@/lib/proxy-headers';
import {isSameOrigin} from '@/lib/panel-auth';

export async function POST(request:NextRequest){
 if(!isSameOrigin(request))return NextResponse.json({detail:'Forbidden origin'},{status:403,headers:{'cache-control':'no-store'}});
 let data:unknown;
 try{data=await request.json();}catch{return NextResponse.json({detail:'Invalid JSON'},{status:400,headers:{'cache-control':'no-store'}});}
 if(!data||typeof data!=='object'||Array.isArray(data))return NextResponse.json({detail:'Invalid request'},{status:400,headers:{'cache-control':'no-store'}});
 const fields=data as Record<string,unknown>;
 const email=typeof fields.email==='string'?fields.email.trim():'';
 const password=typeof fields.password==='string'?fields.password:'';
 if(!email||email.length>254||!password||password.length>1024)return NextResponse.json({detail:'ایمیل و رمز عبور لازم است.'},{status:400,headers:{'cache-control':'no-store'}});
 const base=process.env.API_INTERNAL_URL||'http://127.0.0.1:8000';
 try{
  const backend=await fetch(`${base}/api/v1/auth/token/`,{method:'POST',headers:{'content-type':'application/json',...signedProxyHeaders(request)},body:JSON.stringify({email,password}),cache:'no-store',signal:AbortSignal.timeout(6000)});
  if(!backend.ok)return NextResponse.json({detail:'اطلاعات ورود اشتباه است یا حساب فعال نیست.'},{status:backend.status,headers:{'cache-control':'no-store'}});
  const tokens=await backend.json() as {access:string;refresh:string};
  // Only linked active representatives are allowed into the dealer portal.
  const profile=await fetch(`${base}/api/v1/portal/me/`,{headers:{Authorization:`Bearer ${tokens.access}`},cache:'no-store'});
  if(!profile.ok)return NextResponse.json({detail:'دسترسی پنل تنها برای نمایندگان فعال است.'},{status:403,headers:{'cache-control':'no-store'}});
  const res=NextResponse.json({ok:true},{headers:{'cache-control':'no-store'}});
  const secure=process.env.NODE_ENV==='production';
  res.cookies.set('fm_access',tokens.access,{httpOnly:true,secure,sameSite:'lax',path:'/',maxAge:1800});
  res.cookies.set('fm_refresh',tokens.refresh,{httpOnly:true,secure,sameSite:'lax',path:'/',maxAge:604800});
  return res;
 }catch{return NextResponse.json({detail:'ارتباط با سرور برقرار نشد.'},{status:503,headers:{'cache-control':'no-store'}});}
}
