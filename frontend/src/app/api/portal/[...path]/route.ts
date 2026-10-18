import {NextRequest,NextResponse} from 'next/server';
const backend=(process.env.API_INTERNAL_URL||'http://127.0.0.1:8000').replace(/\/$/,'');
function valid(path:string[],method:string){
 if(path.length===1 && ['me','dashboard','inquiries','notifications'].includes(path[0]))return method==='GET'||(method==='POST'&&path[0]==='inquiries');
 if(path.length===3&&path[0]==='notifications'&&/^\d+$/.test(path[1])&&path[2]==='read')return method==='POST';
 return false;
}
async function handler(request:NextRequest,{params}:{params:Promise<{path:string[]}>}){
 const {path}=await params;const method=request.method;
 if(!valid(path,method))return NextResponse.json({detail:'Not found'},{status:404});
 if(method==='POST'&&request.headers.get('origin')&&request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({detail:'Forbidden'},{status:403});
 const access=request.cookies.get('fm_access')?.value;
 const refresh=request.cookies.get('fm_refresh')?.value;
 if(!access&&!refresh)return NextResponse.json({detail:'Login required'},{status:401});
 async function attempt(token:string){
  return fetch(`${backend}/api/v1/portal/${path.join('/')}/`,{
   method,headers:{Authorization:`Bearer ${token}`,'content-type':'application/json'},
   body:method==='POST'?await request.clone().text():undefined,cache:'no-store',signal:AbortSignal.timeout(10000),
  });
 }
 try{
  let token=access||'';let response=access?await attempt(access):null;
  let updatedRefresh:string|undefined;
  if((!response||response.status===401)&&refresh){
    const refresher=await fetch(`${backend}/api/v1/auth/refresh/`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({refresh}),cache:'no-store'});
    if(refresher.ok){const data=await refresher.json() as {access:string;refresh?:string};token=data.access;updatedRefresh=data.refresh;response=await attempt(token);}
  }
  if(!response)return NextResponse.json({detail:'Login required'},{status:401});
  const out=new NextResponse(await response.text(),{status:response.status,headers:{'content-type':'application/json','cache-control':'no-store'}});
  if(token&&token!==access)out.cookies.set('fm_access',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:1800});
  if(updatedRefresh)out.cookies.set('fm_refresh',updatedRefresh,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:604800});
  return out;
 }catch{return NextResponse.json({detail:'Service unavailable'},{status:503});}
}
export {handler as GET,handler as POST};
