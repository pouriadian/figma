import {Suspense} from 'react';
import {getPageMetadata} from '@/lib/seo';
import {HomeView} from '@/components/pages/home-view';
import {HomeLoadingGate} from '@/components/pages/home-loading-gate';

export async function generateMetadata(){return getPageMetadata('home',{title:'فرامید | گروه تولیدی فرامید',description:'فرامید | گروه تولیدی فرامید | گروه تولیدی فرامید، طراحی و تولید MDF و محصولات دکوراسیون داخلی'});}
export default function Page(){return <HomeLoadingGate><Suspense fallback={null}><HomeView/></Suspense></HomeLoadingGate>;}
