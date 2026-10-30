import type {Metadata} from 'next';
import {RepresentativesView} from '@/components/pages/representatives-view';
export const metadata:Metadata={title:'نمایندگان فرامید',description:'نقشه نمایندگان فرامید در سراسر ایران'};
export default function Page(){return <RepresentativesView/>}
