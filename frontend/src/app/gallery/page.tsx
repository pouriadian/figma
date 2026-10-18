import {getPageMetadata} from '@/lib/seo';
import {GalleryView} from '@/components/pages/gallery-view';

export async function generateMetadata(){return getPageMetadata('gallery',{title:'گالری تصاویر و پروژه\u200cها',description:'گالری تصاویر و پروژه\u200cها | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'});}
export default function Page(){return <GalleryView/>;}
