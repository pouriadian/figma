import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {join,relative,dirname} from 'node:path';
const root=process.cwd(),src=join(root,'src'),fail=[];
const source=[];
function walk(p){for(const f of readdirSync(p,{withFileTypes:true})){const full=join(p,f.name);if(f.isDirectory())walk(full);else if(/\.(ts|tsx|js|jsx)$/.test(f.name))source.push(full);}}
walk(src);
for(const p of source){const content=readFileSync(p,'utf8');
 const re=/\b(?:from\s*|import\s*\(|import\s*)["']([^"']+)["']/g;
 for(const match of content.matchAll(re)){
  const mod=match[1];if(!mod.startsWith('@/')&&!mod.startsWith('./')&&!mod.startsWith('../'))continue;
  const target=mod.startsWith('@/')?join(src,mod.slice(2)):join(dirname(p),mod);
  if(![target,target+'.tsx',target+'.ts',target+'.jsx',target+'.js',join(target,'index.tsx'),join(target,'index.ts')].some(existsSync))fail.push(`${relative(root,p)} imports missing ${mod}`);
 }
 const a=/["'`]((?:\/assets\/)[^"'`\s)]+\.(?:svg|png|webp))["'`]/g;
 for(const m of content.matchAll(a)){if(!m[1].includes('${')&&!existsSync(join(root,'public',m[1])))fail.push(`${relative(root,p)} references missing ${m[1]}`);}
}
const assets=readFileSync(join(src,'lib','assets.ts'),'utf8');
for(const match of assets.matchAll(/mediaWebp\(['"]([\da-f]{40})['"]\s*,\s*['"]([^'" ]+)['"]\)/g)){
 const url=join(root,'public','assets',match[2],match[1]+'.webp');if(!existsSync(url))fail.push(`Missing asset referenced in asset registry: ${url}`);
}
for(let i=1;i<=8;i++){if(!existsSync(join(root,'public','assets','products','textures',`texture-${i}.webp`)))fail.push(`Missing product texture ${i}`);}
for(const name of ['vgpu','shape-waves','FigmaPage','DesktopArtboardProductCarousel','left-[647px]']){
 if(source.some(p=>readFileSync(p,'utf8').toLowerCase().includes(name.toLowerCase())))fail.push(`Legacy renderer or effect marker found in src: ${name}`);
}
if(fail.length){console.error(fail.join('\n'));process.exitCode=1;}
else console.log(`PASS: ${source.length} TS/TSX source files, imports and original media references validated; no ShapeWaves/old artboard renderer.`);
