import {getPageMetadata} from '@/lib/seo';
import {HomeView} from '@/components/pages/home-view';

export async function generateMetadata(){return getPageMetadata('home',{title:'فرامید | گروه تولیدی فرامید',description:'فرامید | گروه تولیدی فرامید | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'});}
export default function Page(){return <HomeView/>;}
