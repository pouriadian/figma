import {getPageMetadata} from '@/lib/seo';
import {CareersView} from '@/components/pages/careers-view';

export async function generateMetadata(){return getPageMetadata('careers',{title:'همکاری با ما',description:'همکاری با ما | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'});}
export default function Page(){return <CareersView/>;}
