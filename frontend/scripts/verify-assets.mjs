import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';

const dir=join(process.cwd(),'public','assets');
const expected=JSON.parse(readFileSync(new URL('./original-assets-sha256.json',import.meta.url),'utf8'));
const found={};
function visit(folder){for(const d of readdirSync(folder,{withFileTypes:true})){
  const filename=join(folder,d.name);
  if(d.isDirectory())visit(filename);
  else {const key=relative(dir,filename).replaceAll('\\','/');found[key]=createHash('sha256').update(readFileSync(filename)).digest('hex');}
}}
if(!existsSync(dir)){console.error('Missing public/assets');process.exit(1);}
visit(dir);
const errors=[...Object.entries(expected).filter(([file,hash])=>found[file]!==hash).map(([file])=>`Changed or missing: ${file}`),...Object.keys(found).filter(file=>!(file in expected)&&file!=='home/home-organizational-values.png').map(file=>`Unexpected extra asset: ${file}`)];
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`PASS: ${Object.keys(expected).length} original assets match their SHA256 hashes; the single new organizational-values image is allowed.`);
