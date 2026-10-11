import type {Metadata} from 'next';
import {FigmaPage} from '@/components/figma-page';
import pageData from '@/design/dealership.json';
import type {DesignNode} from '@/lib/types';

export const metadata:Metadata={title:'اخذ نمایندگی', description:'اخذ نمایندگی | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'};
export default function Page(){return <FigmaPage slug="dealership" design={pageData as DesignNode}/>;}
