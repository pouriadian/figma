import {getPageMetadata} from '@/lib/seo';
import {AboutView} from '@/components/pages/about-view';

export async function generateMetadata(){return getPageMetadata('about',{title:'درباره فرامید',description:'درباره فرامید | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'});}
export default function Page(){return <AboutView/>;}
