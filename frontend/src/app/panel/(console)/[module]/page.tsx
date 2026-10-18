import {notFound} from 'next/navigation';
import {PanelTable} from '@/components/panel/panel-table';
import {MODULES} from '@/components/panel/module-config';
export default async function Page({params}:{params:Promise<{module:string}>}){const {module}=await params;if(!(module in MODULES))notFound();return <PanelTable module={module}/>}
