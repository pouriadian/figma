import {NextRequest,NextResponse} from 'next/server';
import {clearAdminCookies,isSameOrigin,jsonError} from '@/lib/panel-auth';
export async function POST(request:NextRequest){
 if(!isSameOrigin(request))return jsonError('درخواست نامعتبر است.',403);
 const response=NextResponse.json({ok:true},{headers:{'cache-control':'no-store'}});
 clearAdminCookies(response);
 return response;
}
