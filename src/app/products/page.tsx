import type {Metadata} from 'next';
import {FigmaPage} from '@/components/figma-page';
import pageData from '@/design/products.json';
import type {DesignNode} from '@/lib/types';

export const metadata:Metadata={title:'محصولات آنتی فینگر', description:'محصولات آنتی فینگر | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'};
export default function Page(){return <FigmaPage slug="products" design={pageData as DesignNode}/>;}
