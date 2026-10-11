import type {Metadata} from 'next';
import {FigmaPage} from '@/components/figma-page';
import pageData from '@/design/home.json';
import type {DesignNode} from '@/lib/types';

export const metadata:Metadata={title:'فرامید | گروه تولیدی فرامید', description:'فرامید | گروه تولیدی فرامید | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'};
export default function Page(){return <FigmaPage slug="home" design={pageData as DesignNode}/>;}
