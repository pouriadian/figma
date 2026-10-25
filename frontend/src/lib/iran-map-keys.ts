import type {IranProvinceName} from './iran-provinces';
import {canonicalProvinceName} from './iran-provinces';

/** Province keys used by the MIT-licensed react-iran-map package (v0.1.3).
 * Keep this mapping separate from the public API's province names.
 */
export const IRAN_MAP_KEYS: ReadonlyArray<readonly [string, IranProvinceName]> = [
  ['ardabil', 'اردبیل'],
  ['isfahan', 'اصفهان'],
  ['alborz', 'البرز'],
  ['ilam', 'ایلام'],
  ['eastAzerbaijan', 'آذربایجان شرقی'],
  ['westAzerbaijan', 'آذربایجان غربی'],
  ['bushehr', 'بوشهر'],
  ['tehran', 'تهران'],
  ['chaharmahalandBakhtiari', 'چهارمحال و بختیاری'],
  ['southKhorasan', 'خراسان جنوبی'],
  ['razaviKhorasan', 'خراسان رضوی'],
  ['northKhorasan', 'خراسان شمالی'],
  ['khuzestan', 'خوزستان'],
  ['zanjan', 'زنجان'],
  ['semnan', 'سمنان'],
  ['sistanAndBaluchestan', 'سیستان و بلوچستان'],
  ['fars', 'فارس'],
  ['qazvin', 'قزوین'],
  ['qom', 'قم'],
  ['kurdistan', 'کردستان'],
  ['kerman', 'کرمان'],
  ['kermanshah', 'کرمانشاه'],
  ['kohgiluyehAndBoyerAhmad', 'کهگیلویه و بویراحمد'],
  ['golestan', 'گلستان'],
  ['gilan', 'گیلان'],
  ['lorestan', 'لرستان'],
  ['mazandaran', 'مازندران'],
  ['markazi', 'مرکزی'],
  ['hormozgan', 'هرمزگان'],
  ['hamadan', 'همدان'],
  ['yazd', 'یزد'],
];

function compareKey(value: string) {
  return value.normalize('NFKC').replace(/[-_\s]/g, '').toLocaleLowerCase('en-US');
}

const keyToProvince = new Map(IRAN_MAP_KEYS.map(([key, name]) => [compareKey(key), name]));
const provinceToKey = new Map(IRAN_MAP_KEYS.map(([key, name]) => [name, key]));

export function provinceFromMapKey(value: unknown): IranProvinceName | null {
  if (typeof value !== 'string') return null;
  return keyToProvince.get(compareKey(value)) ?? canonicalProvinceName(value);
}
export function mapKeyFromProvince(value: string): string | undefined {
  const canonical = canonicalProvinceName(value);
  return canonical ? provinceToKey.get(canonical) : undefined;
}
