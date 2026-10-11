import type {Metadata} from 'next';
import {FigmaPage} from '@/components/figma-page';
import pageData from '@/design/gallery.json';
import type {DesignNode} from '@/lib/types';

export const metadata:Metadata={title:'گالری تصاویر و پروژه\u200cها', description:'گالری تصاویر و پروژه\u200cها | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'};
export default function Page(){return <FigmaPage slug="gallery" design={pageData as DesignNode}/>;}
