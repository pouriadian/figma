/**
 * Anonymous analytics, counted once per page/product in a 30-minute browser tab
 * window. No fingerprint, user ID or IP is persisted in our own database.
 * Browser sessionStorage is used solely to avoid duplicate POSTs (e.g. React
 * StrictMode, re-renders and metadata/API fetches).
 * Counts are page-view events, not unique visitors.
 */
const WINDOW_MS=30*60*1000;
const PREFIX='faromid:view:';
const inFlight=new Set<string>();

export async function recordView(key:string,payload:{kind:'page_view'|'product_view';path:string;product?:number}):Promise<void>{
  if(typeof window==='undefined')return;
  const storageKey=PREFIX+key;
  if(inFlight.has(key))return;
  try {
    const last=Number(window.sessionStorage.getItem(storageKey)||'0');
    if(last && Date.now()-last<WINDOW_MS)return;
  } catch { /* Private browser modes can block sessionStorage. */ }
  inFlight.add(key);
  try {
    const res=await fetch('/api/public/analytics',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify(payload),keepalive:true,credentials:'same-origin',
    });
    if(res.ok){try{window.sessionStorage.setItem(storageKey,String(Date.now()))}catch{}}
  } catch { /* A failed analytics request must never affect the storefront. */ }
  finally {inFlight.delete(key);}
}
