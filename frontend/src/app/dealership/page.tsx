import {getPageMetadata} from '@/lib/seo';
import {DealershipView} from '@/components/pages/dealership-view';

export async function generateMetadata(){return getPageMetadata('dealership',{title:'اخذ نمایندگی',description:'اخذ نمایندگی | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'});}
export default function Page(){return <DealershipView/>;}
