import {getPageMetadata} from '@/lib/seo';
import {ExhibitionsView} from '@/components/pages/exhibitions-view';

export async function generateMetadata(){return getPageMetadata('exhibitions',{title:'نمایشگاه\u200cها',description:'نمایشگاه\u200cها | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'});}
export default function Page(){return <ExhibitionsView/>;}
