import {SiteShell} from '@/components/layout/site-shell';
import {DealerDashboard} from '@/components/portal/dealer-dashboard';
import {getProducts} from '@/lib/api';
export const metadata={title:'پنل نمایندگان | فرامید',robots:{index:false,follow:false}};
export default async function Page(){const products=await getProducts();return <SiteShell><div className="min-h-[70vh] bg-[#f5f5f1]"><DealerDashboard products={products.map(p=>({id:p.id,code:p.code,name:p.name}))}/></div></SiteShell>}
