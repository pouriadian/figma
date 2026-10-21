import {notFound} from 'next/navigation';
import {PanelTable} from '@/components/panel/panel-table';
import {PanelContent} from '@/components/panel/panel-content';
import {MODULES} from '@/components/panel/module-config';
export default async function Page({params}:{params:Promise<{module:string}>}){const {module}=await params;if(!(module in MODULES))notFound();return module==='content'?<PanelContent/>:<PanelTable module={module}/>}
