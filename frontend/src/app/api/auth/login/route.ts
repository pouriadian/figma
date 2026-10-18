import {NextRequest,NextResponse} from 'next/server';
import {signedProxyHeaders} from '@/lib/proxy-headers';

export async function POST(request:NextRequest){
 const origin=request.headers.get('origin');
 if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({detail:'Forbidden origin'},{status:403});
 let data:{email?:string;password?:string};
 try{data=await request.json();}catch{return NextResponse.json({detail:'Invalid JSON'},{status:400});}
 if(!data.email||!data.password)return NextResponse.json({detail:'ایمیل و رمز عبور لازم است.'},{status:400});
 const base=process.env.API_INTERNAL_URL||'http://127.0.0.1:8000';
 try{
  const backend=await fetch(`${base}/api/v1/auth/token/`,{method:'POST',headers:{'content-type':'application/json',...signedProxyHeaders(request)},body:JSON.stringify({email:data.email,password:data.password}),cache:'no-store',signal:AbortSignal.timeout(6000)});
  if(!backend.ok)return NextResponse.json({detail:'اطلاعات ورود اشتباه است یا حساب فعال نیست.'},{status:backend.status});
  const tokens=await backend.json() as {access:string;refresh:string};
  // Only linked active representatives are allowed into the dealer portal.
  const profile=await fetch(`${base}/api/v1/portal/me/`,{headers:{Authorization:`Bearer ${tokens.access}`},cache:'no-store'});
  if(!profile.ok)return NextResponse.json({detail:'دسترسی پنل تنها برای نمایندگان فعال است.'},{status:403});
  const res=NextResponse.json({ok:true});
  const secure=process.env.NODE_ENV==='production';
  res.cookies.set('fm_access',tokens.access,{httpOnly:true,secure,sameSite:'lax',path:'/',maxAge:1800});
  res.cookies.set('fm_refresh',tokens.refresh,{httpOnly:true,secure,sameSite:'lax',path:'/',maxAge:604800});
  return res;
 }catch{return NextResponse.json({detail:'ارتباط با سرور برقرار نشد.'},{status:503});}
}
