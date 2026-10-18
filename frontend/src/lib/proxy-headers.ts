import 'server-only';
import {createHmac} from 'node:crypto';
import type {NextRequest} from 'next/server';

export function signedProxyHeaders(request:NextRequest):Record<string,string>{
 const secret=process.env.API_PROXY_SECRET;
 if(!secret)return {};
 // The hosting reverse proxy must overwrite untrusted forwarding headers.
 const ip=(request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').trim().slice(0,100);
 const ts=Math.floor(Date.now()/1000).toString();
 return {'x-faromid-client':ip,'x-faromid-timestamp':ts,
  'x-faromid-signature':createHmac('sha256',secret).update(`${ip}.${ts}`).digest('hex')};
}
