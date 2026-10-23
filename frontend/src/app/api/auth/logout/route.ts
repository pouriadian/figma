import {NextRequest,NextResponse} from 'next/server';
import {isSameOrigin} from '@/lib/panel-auth';
export async function POST(request:NextRequest){
 if(!isSameOrigin(request))return NextResponse.json({detail:'Forbidden'},{status:403,headers:{'cache-control':'no-store'}});
 const refresh=request.cookies.get('fm_refresh')?.value;
 if(refresh){
   try{const backend=process.env.API_INTERNAL_URL||'http://127.0.0.1:8000';
     await fetch(`${backend}/api/v1/auth/revoke/`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({refresh}),signal:AbortSignal.timeout(5000)});
   }catch{}
 }
 const res=NextResponse.json({ok:true},{headers:{'cache-control':'no-store'}});
 res.cookies.delete('fm_access');res.cookies.delete('fm_refresh');
 return res;
}
