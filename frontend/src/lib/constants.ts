export const SITE_TITLE = 'فرامید | Faromid Group';
export const SITE_DESCRIPTION = 'گروه تولیدی فرامید؛ تولیدکننده MDF ملامینه، سینکرونایز، فوق برجسته و سوپرمات آنتی فینگر، محصولات و طراحی داخلی';

/** Shared contact locations used across public contact surfaces. */
export const CONTACT_SHOWROOM = {
  label: 'دفتر مرکزی و شوروم',
  address: 'نیاوران، نرسیده به میدان باهنر، خیابان ناطقیان، بن‌بست سادات، پلاک ۵، طبقه اول، شرکت فرامید.',
  lat: 35.810932,
  lng: 51.467497,
  directionsUrl: 'https://www.google.com/maps/search/?api=1&query=35.810932%2C51.467497',
  embedUrl: 'https://maps.google.com/maps?output=embed&hl=en&q=35.810932%2C51.467497&z=15',
} as const;
export const CONTACT_LOCATIONS = [
  {label: 'دفتر مرکزی و شوروم', address: CONTACT_SHOWROOM.address},
  {label: 'کارخانه اول', address: 'تهران، جاده خراسان، قیامدشت.'},
  {label: 'کارخانه دوم', address: 'تهران، جاده خراسان، شنزار.'},
] as const;
export const links = [
  { href: '/', label: 'صفحه اصلی' },
  { href: '/products', label: 'محصولات' },
  { href: '/textures', label: 'بافت' },
  { href: '/gallery', label: 'پروژه‌ها' },
  { href: '/exhibitions', label: 'نمایشگاه ها' },
  { href: '/about', label: 'درباره ما' },
  { href: '/careers', label: 'همکاری با ما' },
  { href: '/dealership', label: 'اخذ نمایندگی' },
  { href: '/representatives', label: 'نمایندگان' },
  { href: '/contact', label: 'تماس با ما' },
] as const;
export const asPath = (text: string): string | undefined => {
  const key = text.replace(/\s+/g, ' ').trim();
  if(key==='بافت'||key==='تکسچر')return '/products?by=texture';
  return links.find(({label})=>label===key)?.href;
};
