import type {TextureApiItem} from '@/lib/api';

export const developmentTextures:TextureApiItem[]=[
  {id:-1,name:'Natural Oak',slug:'natural-oak',code:'TEX-001',category:'',description:'نمونه‌ی نمایشی با جلوه‌ی چوب طبیعی برای پیش‌نمایش قالب صفحه‌ی بافت.',technical_specs:{},image:'',products_count:0,is_demo:true},
  {id:-2,name:'Soft Matte',slug:'soft-matte',code:'TEX-002',category:'',description:'نمونه‌ی نمایشی با ظاهر مات و ساده برای تکمیل طراحی کاتالوگ.',technical_specs:{},image:'',products_count:0,is_demo:true},
  {id:-3,name:'Linen Structure',slug:'linen-structure',code:'TEX-003',category:'',description:'نمونه‌ی نمایشی با الگوی الهام‌گرفته از بافت پارچه‌ای؛ تصویر واقعی هنوز ثبت نشده است.',technical_specs:{},image:'',products_count:0,is_demo:true},
];

export function getDevelopmentTexture(slug:string){
  return process.env.NODE_ENV==='development'?developmentTextures.find(texture=>texture.slug===slug)||null:null;
}
