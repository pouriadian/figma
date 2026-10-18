import {NextRequest,NextResponse} from 'next/server';
import {signedProxyHeaders} from '@/lib/proxy-headers';
export async function GET(_request:NextRequest,{params}:{params:Promise<{code:string}>}){
 const {code}=await params;
 if(!/^FM-[0-9A-F]{18}$/i.test(code))return NextResponse.json({detail:'Invalid tracking code'},{status:400});
 try{
  const base=process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000';
  const res=await fetch(`${base}/api/v1/track/${encodeURIComponent(code)}/`,{headers:signedProxyHeaders(_request),cache:'no-store',signal:AbortSignal.timeout(5000)});
  return new NextResponse(await res.text(),{status:res.status,headers:{'content-type':'application/json','cache-control':'no-store'}});
 }catch{return NextResponse.json({detail:'Service unavailable'},{status:503});}
}
