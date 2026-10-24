import {notFound} from 'next/navigation';
import {PanelSms} from '@/components/panel/panel-sms';
const sections=['campaigns','contacts','rewards','settings','sales'] as const;
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;if(!sections.includes(section as typeof sections[number]))notFound();return <PanelSms section={section as typeof sections[number]}/>}
