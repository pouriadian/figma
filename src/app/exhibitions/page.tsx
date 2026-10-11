import type {Metadata} from 'next';
import {FigmaPage} from '@/components/figma-page';
import pageData from '@/design/exhibitions.json';
import type {DesignNode} from '@/lib/types';

export const metadata:Metadata={title:'نمایشگاه\u200cها', description:'نمایشگاه\u200cها | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'};
export default function Page(){return <FigmaPage slug="exhibitions" design={pageData as DesignNode}/>;}
