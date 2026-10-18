import {ProductEditor} from '@/components/panel/product-editor';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <ProductEditor id={id}/>}
