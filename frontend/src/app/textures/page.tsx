import {TexturesView} from '@/components/pages/textures-view';
import {developmentTextures} from '@/lib/texture-dev-fixtures';
import {getTextures} from '@/lib/api';

export const dynamic='force-dynamic';
export const metadata={title:'بافت‌های فرامید',description:'جستجو و بررسی بافت‌های محصولات فرامید'};
export default async function TexturesPage(){
  const [realTextures]=await Promise.all([getTextures()]);
  const developmentItems=process.env.NODE_ENV==='development'?developmentTextures:[];
  return <TexturesView developmentItems={developmentItems} initialRealTextures={realTextures}/>;
}
