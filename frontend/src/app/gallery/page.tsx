import {getPageMetadata} from '@/lib/seo';
import {GalleryView} from '@/components/pages/gallery-view';

export async function generateMetadata(){return getPageMetadata('gallery',{title:'پروژه‌ها | فرامید',description:'پروژه‌های دکوراسیون داخلی فرامید'});}
export default function Page(){return <GalleryView/>;}
