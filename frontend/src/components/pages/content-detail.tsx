import Image from 'next/image';
import Link from 'next/link';
import type {CMSItem} from '@/lib/api';
import {Container} from '@/components/ui/brand-ui';
export function ContentDetail({item,back}:{item:CMSItem;back:string}){
 return <article className="bg-[#f5f5f1] py-12 sm:py-20"><Container><Link href={back} className="text-sm text-[#6d796d] underline underline-offset-4">بازگشت</Link><h1 className="mt-10 max-w-3xl text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.7]">{item.title}</h1>
  {item.summary&&<p className="mt-5 max-w-3xl text-base leading-10 text-[#626e64]">{item.summary}</p>}
  {item.image&&<div className="relative mt-10 aspect-[1.9] overflow-hidden rounded-[24px] bg-[#dfe2df]"><Image fill src={item.image} alt={item.title} sizes="100vw" className="object-cover"/></div>}
  {item.body&&<div className="mt-12 max-w-4xl whitespace-pre-line text-[15px] leading-[2.6] text-[#3b463d]">{item.body}</div>}
  {item.images?.length>0&&<div className="mt-12 grid gap-4 sm:grid-cols-2">{item.images.map(image=><div className="relative aspect-[1.4] overflow-hidden rounded-2xl" key={image.id}><Image src={image.url} fill alt={image.caption||item.title} sizes="(max-width:640px) 100vw, 50vw" className="object-cover"/></div>)}</div>}
 </Container></article>;
}
