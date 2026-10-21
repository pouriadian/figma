export const SITE_TITLE = 'فرامید | Faromid Group';
export const SITE_DESCRIPTION = 'گروه تولیدی فرامید؛ تولیدکننده MDF ملامینه، سینکرونایز، فوق برجسته و سوپرمات آنتی فینگر، محصولات و طراحی داخلی';

/** Sadat location displayed on the contact page. */
export const CONTACT_SHOWROOM = {
  label: 'Sadat',
  address: 'Tehran Province, Tajrish, Iran',
  lat: 35.810932,
  lng: 51.467497,
  directionsUrl: 'https://www.google.com/maps/search/?api=1&query=35.810932%2C51.467497',
  embedUrl: 'https://maps.google.com/maps?output=embed&hl=en&q=35.810932%2C51.467497&z=15',
} as const;
export const links = [
  { href: '/', label: 'صفحه اصلی' },
  { href: '/products', label: 'محصولات' },
  { href: '/gallery', label: 'گالری تصاویر' },
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
