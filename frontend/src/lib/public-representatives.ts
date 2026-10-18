import 'server-only';

export type PublicRepresentative={id:number;company_name:string;province:string;city:string};
type Paged={count:number;results:PublicRepresentative[]};
export async function getPublicRepresentatives():Promise<Paged>{
 const base=(process.env.API_INTERNAL_URL||'http://127.0.0.1:8000').replace(/\/$/,'');
 try{
  let count=0;
  const results:PublicRepresentative[]=[];
  for(let page=1;page<=30;page++){
   const response=await fetch(`${base}/api/v1/representatives/?page_size=100&page=${page}`,{cache:'no-store',signal:AbortSignal.timeout(5000)});
   if(!response.ok)break;
   const value=await response.json() as Paged;
   if(!Array.isArray(value.results))break;
   count=value.count||0;
   results.push(...value.results);
   if(results.length>=count||value.results.length===0)break;
  }
  return {count,results};
 }catch{return {count:0,results:[]}}
}
