import {NextRequest,NextResponse} from 'next/server';
import {authorized,setAdminCookies,clearAdminCookies,jsonError} from '@/lib/panel-auth';
export async function GET(request:NextRequest){
 try{
  const {response,tokens}=await authorized(request,'manage/me/');
  if(!response||!response.ok){const out=jsonError('برای ورود به پنل وارد حساب مدیریتی شوید.',401);clearAdminCookies(out);return out;}
  const out=NextResponse.json(await response.json(),{headers:{'cache-control':'no-store'}});
  if(tokens)setAdminCookies(out,tokens);
  return out;
 }catch{return jsonError('ارتباط با سرور برقرار نیست.',503);}
}
