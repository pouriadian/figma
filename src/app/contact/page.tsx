import type {Metadata} from 'next';
import {FigmaPage} from '@/components/figma-page';
import pageData from '@/design/contact.json';
import type {DesignNode} from '@/lib/types';

export const metadata:Metadata={title:'تماس با ما', description:'تماس با ما | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'};
export default function Page(){return <FigmaPage slug="contact" design={pageData as DesignNode}/>;}
