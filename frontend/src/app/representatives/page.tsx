import type {Metadata} from 'next';
import {RepresentativesView} from '@/components/pages/representatives-view';
export const metadata:Metadata={title:'نمایندگان فرامید',description:'فهرست نمایندگان رسمی و تأییدشده فرامید'};
export default function Page(){return <RepresentativesView/>}
