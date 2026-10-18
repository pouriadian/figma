import {SectionEditor} from '@/components/panel/section-editor';
export default async function Page({params}:{params:Promise<{key:string;id:string}>}){const {key,id}=await params;return <SectionEditor pageKey={key} sectionId={id}/>}
