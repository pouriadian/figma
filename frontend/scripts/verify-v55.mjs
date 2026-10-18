/* Dependency-free checks for the Faromid v5.5 feature wiring. */
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
const text=p=>readFileSync(join(root,p),'utf8');
const checks=[
  ['attached organizational-values artwork',existsSync(join(root,'public/assets/home/home-organizational-values.png'))],
  ['marquee has a reusable component',existsSync(join(root,'src/components/sections/brand-marquee.tsx'))],
  ['home registers the marquee in visual editor',text('src/components/pages/home-view.tsx').includes("key:'marquee'")],
  ['home renders organizational-values artwork',text('src/components/sections/home-sections.tsx').includes('home-organizational-values.png')],
  ['marquee respects reduced motion',text('src/app/globals.css').includes('prefers-reduced-motion:reduce')],
  ['shared navbar has scroll behavior',text('src/components/layout/site-header.tsx').includes("window.scrollY>44")],
  ['CMS editor shows published text samples',text('src/components/panel/section-editor.tsx').includes('fm-original-copy')],
  ['CMS live typing preview',text('src/components/panel/section-editor.tsx').includes('fm-friendly-preview')],
  ['products categories loaded from API',text('src/components/pages/products-view.tsx').includes('getCategories()')],
  ['products filters are URL-shareable',text('src/components/sections/product-collection.tsx').includes('window.history.replaceState')],
];
let failed=false;
for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'}: ${name}`);failed ||= !pass}
if(failed)process.exitCode=1;
