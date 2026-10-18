export const SITE_TITLE = 'فرامید | Faromid Group';
export const SITE_DESCRIPTION = 'گروه تولیدی فرامید؛ تولیدکننده MDF ملامینه، سینکرونایز، فوق برجسته و سوپرمات آنتی فینگر، محصولات و طراحی داخلی';

/** Showroom address displayed on the contact page. */
export const CONTACT_SHOWROOM = {
  label: 'دفتر نمایشگاه نیاوران',
  address:
    'نیاوران، نرسیده به میدان باهنر، خیابان ناطقیان، بن بست سادات پلاک ۵، طبقه اول',
  lat: 35.8109353,
  lng: 51.4702136,
  directionsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    'نیاوران، خیابان ناطقیان، بن بست سادات پلاک 5، تهران',
  )}`,
} as const;
export const links = [
  { href: '/', label: 'صفحه اصلی' },
  { href: '/products', label: 'محصولات' },
  { href: '/textures', label: 'تکسچر' },
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
  return links.find(({label})=>label===key || (key === 'بافت' && label === 'تکسچر'))?.href;
};
