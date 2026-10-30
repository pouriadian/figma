import {getPageMetadata} from '@/lib/seo';
import {ProductsView} from '@/components/pages/products-view';

export async function generateMetadata(){return getPageMetadata('products',{title:'محصولات آنتی فینگر',description:'محصولات آنتی فینگر | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'});}
export default function Page({searchParams}:{searchParams:Promise<{by?:string;category?:string}>}){return <ProductsView searchParams={searchParams}/>;}
