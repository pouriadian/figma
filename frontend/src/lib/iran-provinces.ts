/** Province labels shared by the public directory, filters and the map. */
export const IRAN_PROVINCES = [
  'آذربایجان شرقی', 'آذربایجان غربی', 'اردبیل', 'اصفهان', 'البرز',
  'ایلام', 'بوشهر', 'تهران', 'چهارمحال و بختیاری', 'خراسان جنوبی',
  'خراسان رضوی', 'خراسان شمالی', 'خوزستان', 'زنجان', 'سمنان',
  'سیستان و بلوچستان', 'فارس', 'قزوین', 'قم', 'کردستان', 'کرمان',
  'کرمانشاه', 'کهگیلویه و بویراحمد', 'گلستان', 'گیلان', 'لرستان',
  'مازندران', 'مرکزی', 'هرمزگان', 'همدان', 'یزد',
] as const;

export type IranProvinceName = (typeof IRAN_PROVINCES)[number];

function normalizedKey(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200d\u200e\u200f\u2066-\u2069]/g, ' ')
    .replace(/[\-_–—،]/g, ' ')
    .replace(/^\s*استان\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('fa-IR');
}

const provinceAliases: Record<string, IranProvinceName> = {};
for (const province of IRAN_PROVINCES) {
  provinceAliases[normalizedKey(province)] = province;
}
const alternatives: Record<string, IranProvinceName> = {
  'چهار محال و بختیاری': 'چهارمحال و بختیاری',
  'چهارمحال بختیاری': 'چهارمحال و بختیاری',
  'کهگیلویه و بویر احمد': 'کهگیلویه و بویراحمد',
  'کهکیلویه و بویر احمد': 'کهگیلویه و بویراحمد',
  'کهکیلویه و بویراحمد': 'کهگیلویه و بویراحمد',
  'سیستان بلوچستان': 'سیستان و بلوچستان',
  'آذربایجانشرقی': 'آذربایجان شرقی',
  'آذربایجانغربی': 'آذربایجان غربی',
  'خراسان شمالي': 'خراسان شمالی',
  'خراسان جنوبي': 'خراسان جنوبی',
  'خراسان رضوي': 'خراسان رضوی',
  'اصفهان (Esfahan)': 'اصفهان',
  'East Azerbaijan': 'آذربایجان شرقی',
  'West Azerbaijan': 'آذربایجان غربی',
  'Ardabil': 'اردبیل',
  'Ardebil': 'اردبیل',
  'Isfahan': 'اصفهان',
  'Esfahan': 'اصفهان',
  'Alborz': 'البرز',
  'Ilam': 'ایلام',
  'Bushehr': 'بوشهر',
  'Tehran': 'تهران',
  'Chaharmahal and Bakhtiari': 'چهارمحال و بختیاری',
  'Chahar Mahall and Bakhtiari': 'چهارمحال و بختیاری',
  'South Khorasan': 'خراسان جنوبی',
  'Razavi Khorasan': 'خراسان رضوی',
  'North Khorasan': 'خراسان شمالی',
  'Khuzestan': 'خوزستان',
  'Zanjan': 'زنجان',
  'Semnan': 'سمنان',
  'Sistan and Baluchestan': 'سیستان و بلوچستان',
  'Sistan and Baluchistan': 'سیستان و بلوچستان',
  'Fars': 'فارس',
  'Qazvin': 'قزوین',
  'Qom': 'قم',
  'Kurdistan': 'کردستان',
  'Kordestan': 'کردستان',
  'Kerman': 'کرمان',
  'Kermanshah': 'کرمانشاه',
  'Kohgiluyeh and Boyer-Ahmad': 'کهگیلویه و بویراحمد',
  'Kohgiluyeh and Buyer Ahmad': 'کهگیلویه و بویراحمد',
  'Golestan': 'گلستان',
  'Gilan': 'گیلان',
  'Lorestan': 'لرستان',
  'Mazandaran': 'مازندران',
  'Markazi': 'مرکزی',
  'Hormozgan': 'هرمزگان',
  'Hamadan': 'همدان',
  'Hamedan': 'همدان',
  'Yazd': 'یزد',
};
for (const [alias, province] of Object.entries(alternatives)) {
  provinceAliases[normalizedKey(alias)] = province;
}

/** Return a known canonical province, or null rather than counting an unknown region incorrectly. */
export function canonicalProvinceName(value: unknown): IranProvinceName | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return provinceAliases[normalizedKey(value)] ?? null;
}
