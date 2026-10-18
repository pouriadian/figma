import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {SiteShell} from '@/components/layout/site-shell';
import {ContentDetail} from '@/components/pages/content-detail';
import {getContentDetail} from '@/lib/api';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const item=await getContentDetail(slug);return {title:item?.seo_title||item?.title||'پروژه',description:item?.seo_description||item?.summary};}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const item=await getContentDetail(slug);if(!item||item.kind!=='project')notFound();return <SiteShell><ContentDetail item={item} back="/projects"/></SiteShell>}
