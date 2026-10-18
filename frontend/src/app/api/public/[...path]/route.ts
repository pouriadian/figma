import {NextRequest,NextResponse} from 'next/server';
import {signedProxyHeaders} from '@/lib/proxy-headers';

const ALLOWED = new Set(['inquiries','applications','analytics']);
function allowedOrigin(request:NextRequest) {
  // Next.js may normalize request.nextUrl.origin to 127.0.0.1 even when
  // the browser is visiting localhost. Compare the actual HTTP Host instead.
  const origin=request.headers.get('origin');
  if (!origin) return true; // Preserve the existing server-to-server behavior.
  const host=request.headers.get('host');
  if (!host) return false;
  try {
    const url=new URL(origin);
    if (url.username || url.password) return false;
    if (url.protocol!=='http:' && url.protocol!=='https:') return false;
    if (process.env.NODE_ENV==='production' && url.protocol!=='https:') return false;
    return url.host.toLowerCase()===host.toLowerCase();
  } catch {return false;}
}
export async function POST(request:NextRequest, {params}:{params:Promise<{path:string[]}>}) {
  const {path}=await params;
  if(path.length!==1||!ALLOWED.has(path[0]))return NextResponse.json({detail:'Not found'},{status:404});
  if(!allowedOrigin(request))return NextResponse.json({detail:'Origin rejected'},{status:403});
  const isMultipart=request.headers.get('content-type')?.startsWith('multipart/form-data');
  const body=await request.arrayBuffer();
  if(body.byteLength>6*1024*1024)return NextResponse.json({detail:'Request too large'},{status:413});
  try {
    const backend=(process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000').replace(/\/$/,'');
    const res=await fetch(`${backend}/api/v1/${path[0]}/`,{
      method:'POST',headers:{'content-type':request.headers.get('content-type')||'application/json',...signedProxyHeaders(request)},
      body, cache:'no-store', signal:AbortSignal.timeout(14000),
    });
    const text=await res.text();
    return new NextResponse(text||null,{status:res.status, headers:{'content-type':res.headers.get('content-type')||'application/json','cache-control':'no-store'}});
  } catch {return NextResponse.json({detail:'سرویس در دسترس نیست؛ لطفاً مجدداً تلاش کنید.'},{status:503});}
}
