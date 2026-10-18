import {PageSections} from '@/components/panel/page-sections';
export default async function Page({params}:{params:Promise<{key:string}>}){const {key}=await params;return <PageSections pageKey={key}/>}
