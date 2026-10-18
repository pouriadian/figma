import {getPageMetadata} from '@/lib/seo';
import {ContactView} from '@/components/pages/contact-view';

export async function generateMetadata(){return getPageMetadata('contact',{title:'تماس با ما',description:'تماس با ما | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'});}
export default function Page(){return <ContactView/>;}
