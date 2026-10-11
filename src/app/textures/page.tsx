import type {Metadata} from 'next';
import {MobileTextures} from '@/components/mobile-page';
export const metadata:Metadata={title:'بافت و تکسچر محصولات',description:'انواع تکسچر و بافت MDF گروه فرامید'};
export default function Page(){return <div className="textures-page"><MobileTextures/></div>}
