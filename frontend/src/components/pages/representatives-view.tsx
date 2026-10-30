import {SiteShell} from '@/components/layout/site-shell';
import {Container} from '@/components/ui/brand-ui';
import {getPublicRepresentatives} from '@/lib/public-representatives';
import {RepresentativeDirectory} from './representative-directory';

export async function RepresentativesView(){
 const {results,available}=await getPublicRepresentatives();
 return <SiteShell><main className="min-h-[65vh] bg-[#f7f7f4] py-8 sm:py-12" dir="rtl"><Container><RepresentativeDirectory items={results} dataAvailable={available}/></Container></main></SiteShell>;
}
