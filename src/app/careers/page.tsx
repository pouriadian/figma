import type {Metadata} from 'next';
import {FigmaPage} from '@/components/figma-page';
import pageData from '@/design/careers.json';
import type {DesignNode} from '@/lib/types';

export const metadata:Metadata={title:'همکاری با ما', description:'همکاری با ما | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'};
export default function Page(){return <FigmaPage slug="careers" design={pageData as DesignNode}/>;}
