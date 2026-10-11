import type {Metadata} from 'next';
import {FigmaPage} from '@/components/figma-page';
import pageData from '@/design/about.json';
import type {DesignNode} from '@/lib/types';

export const metadata:Metadata={title:'درباره فرامید', description:'درباره فرامید | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'};
export default function Page(){return <FigmaPage slug="about" design={pageData as DesignNode}/>;}
