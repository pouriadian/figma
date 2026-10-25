'use client';

import {useMemo, useState} from 'react';
import dynamic from 'next/dynamic';
import {ArrowDownLeft, ArrowLeft, BadgeCheck, Building2, Compass, MapPinned, MousePointer2, RotateCcw} from 'lucide-react';
import type {PublicRepresentative} from '@/lib/public-representatives';
import {canonicalProvinceName, IRAN_PROVINCES, type IranProvinceName} from '@/lib/iran-provinces';
import {IRAN_MAP_KEYS, mapKeyFromProvince, provinceFromMapKey} from '@/lib/iran-map-keys';
import styles from './iran-representatives-map.module.css';

// The map paths are bundled by the package at build time: no /api/geo request,
// remote CDN, API key or loading of geometry when a visitor opens the page.
const VectorIranMap = dynamic(
  () => import('react-iran-map').then(module => module.IranMap),
  {ssr: false, loading: () => <div className={styles.mapSkeleton} role="status">در حال نمایش نقشه ایران…</div>},
);

const numberFa = new Intl.NumberFormat('fa-IR');

type Props = {
  items: PublicRepresentative[];
  dataAvailable: boolean;
  selectedProvince: string;
  onProvinceChange: (province: string) => void;
};

export function IranRepresentativesMap({items, dataAvailable, selectedProvince, onProvinceChange}: Props) {
  const [palette, setPalette] = useState<'teal' | 'rose'>('teal');
  const colors = palette === 'teal'
    ? {range: '26, 115, 133', selected: '#dc405c', legend: ['#bbdce1', '#85bac5', '#4695a6', '#1a7385'], progress: 'linear-gradient(90deg,#9bd8d6,#228b9c)'}
    : {range: '180, 53, 84', selected: '#1c8194', legend: ['#f8d4dc', '#eea0b1', '#dc6d88', '#b43554'], progress: 'linear-gradient(90deg,#f8a0b4,#bd3758)'};
  const counts = useMemo(() => {
    const output = Object.fromEntries(IRAN_PROVINCES.map(name => [name, 0])) as Record<IranProvinceName, number>;
    for (const representative of items) {
      const province = canonicalProvinceName(representative.province);
      if (province) output[province] += 1;
    }
    return output;
  }, [items]);

  const mapData = useMemo(() => Object.fromEntries(
    IRAN_MAP_KEYS.map(([key, province]) => [key, dataAvailable ? counts[province] : 0]),
  ), [counts, dataAvailable]);

  const ranked = useMemo(() => IRAN_PROVINCES
    .map(name => ({name, count: counts[name]}))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'fa')),
  [counts]);

  const activeProvinces = ranked.filter(item => item.count > 0).length;
  const mappedCount = ranked.reduce((sum, item) => sum + item.count, 0);
  const withoutProvince = Math.max(0, items.length - mappedCount);
  const selectedName = canonicalProvinceName(selectedProvince);
  const selectedKey = selectedName ? mapKeyFromProvince(selectedName) : undefined;
  const shownCount = selectedName ? counts[selectedName] : items.length;
  const largestCount = Math.max(1, ...ranked.map(item => item.count));

  function selectProvince(value: IranProvinceName) {
    onProvinceChange(selectedName === value ? '' : value);
  }

  function handleProvinceClick(value: string) {
    const name = provinceFromMapKey(value);
    if (name) selectProvince(name);
  }

  return (
    <section className={styles.section} aria-labelledby="iran-coverage-title" dir="rtl">
      <header className={styles.header}>
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className={styles.headerIcon}><Compass size={23} aria-hidden="true"/></div>
          <div>
            <span className={styles.eyebrow} dir="ltr">FAROMID  /  NATIONWIDE COVERAGE</span>
            <h2 id="iran-coverage-title" className="mt-2 text-[19px] font-extrabold leading-relaxed text-white sm:text-[24px]">نقشه نمایندگان فرامید در سراسر ایران</h2>
            <p className="mt-1 max-w-2xl text-[12px] leading-7 text-slate-300 sm:text-[13px]">استان موردنظر را انتخاب کنید تا تعداد نمایندگان تأییدشده و فهرست آن‌ها نمایش داده شود.</p>
          </div>
        </div>
        <div className={styles.validated}><BadgeCheck size={15} aria-hidden="true"/><span>فقط اطلاعات عمومی تأییدشده</span></div>
      </header>

      <div className={styles.grid}>
        <div className={styles.mapPanel}>
          <div className={styles.gridTexture} aria-hidden="true"/>
          <div className={styles.mapTopline}>
            <div className="flex items-center gap-2"><span className={styles.liveDot}/><span>پراکندگی استانی نمایندگان</span></div>
            <div className={styles.paletteSwitcher} role="group" aria-label="انتخاب رنگ‌بندی نقشه">
              <button type="button" aria-pressed={palette === 'teal'} className={`${styles.paletteButton} ${palette === 'teal' ? styles.paletteButtonActive : ''}`} onClick={() => setPalette('teal')}><span className={styles.tealDot}/>فیروزه‌ای</button>
              <button type="button" aria-pressed={palette === 'rose'} className={`${styles.paletteButton} ${palette === 'rose' ? styles.paletteButtonActive : ''}`} onClick={() => setPalette('rose')}><span className={styles.roseDot}/>زرشکی</button>
            </div>
          </div>

          <div className={styles.mapViewport} aria-label="نقشه تعاملی استان‌های ایران">
            <VectorIranMap
              key={`${selectedKey ?? 'all-provinces'}-${palette}`}
              data={mapData}
              colorRange={colors.range}
              deactiveProvinceColor="#d8e4e7"
              selectedProvinceColor={colors.selected}
              defaultSelectedProvince={selectedKey}
              tooltipTitle="تعداد نمایندگان: "
              textColor="#315562"
              width={700}
              selectProvinceHandler={handleProvinceClick}
            />
          </div>

          {!dataAvailable && (
            <div className={styles.unavailable} role="status">اطلاعات نمایندگان در دسترس نیست؛ نقشه همچنان قابل انتخاب است.</div>
          )}

          <div className={styles.mapFooter}>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500"><MousePointer2 size={15} aria-hidden="true"/> روی استان کلیک یا لمس کنید</div>
            <div className={styles.legend} aria-label="راهنمای شدت رنگ نقشه">
              <span>بدون نماینده</span><span className={styles.swatchNeutral}/>
              <span className="mr-2">کم</span>
              {colors.legend.map(color => <span key={color} style={{background: color}} className={styles.swatch}/>)}
              <span>زیاد</span>
            </div>
          </div>
        </div>

        <aside className={styles.sidePanel} aria-label="آمار و انتخاب استان">
          <div className="grid grid-cols-2 gap-3">
            <div className={styles.metricCard}>
              <div className="flex items-center justify-between"><span className={styles.metricIcon}><Building2 size={16}/></span><span className={styles.metricTag}>عمومی</span></div>
              <div className={styles.metricNumber}>{dataAvailable ? numberFa.format(items.length) : '—'}</div>
              <p className={styles.metricLabel}>نماینده تأییدشده</p>
            </div>
            <div className={styles.metricCard}>
              <div className="flex items-center justify-between"><span className={styles.metricIcon}><MapPinned size={16}/></span><span className={styles.metricTag}>از ۳۱ استان</span></div>
              <div className={styles.metricNumber}>{dataAvailable ? numberFa.format(activeProvinces) : '—'}</div>
              <p className={styles.metricLabel}>استان دارای نماینده</p>
            </div>
          </div>

          <div className={styles.selectionBox} aria-live="polite" aria-atomic="true">
            <span className="text-[11px] font-semibold text-[#9e5967]">{selectedName ? 'استان انتخاب‌شده' : 'آمار کل کشور'}</span>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[20px] font-extrabold text-[#3b2631]">{selectedName ?? 'سراسر ایران'}</h3>
              <div className="text-left"><span className="block text-[30px] font-black leading-none text-[#c92e4c]">{dataAvailable ? numberFa.format(shownCount) : '—'}</span><span className="mt-1 block text-[10px] text-[#9d7480]">نماینده فعال</span></div>
            </div>
            {selectedName ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <button type="button" className={styles.clearButton} onClick={() => onProvinceChange('')}><RotateCcw size={13}/> حذف فیلتر</button>
                <a className={styles.actionLink} href="#representatives-directory-heading">دیدن نمایندگان <ArrowDownLeft size={14}/></a>
              </div>
            ) : <p className="mt-3 text-[11px] leading-6 text-[#9a7180]">برای نمایش جزئیات، یک استان را از نقشه یا فهرست انتخاب کنید.</p>}
          </div>

          <label htmlFor="faromid-map-select" className="mb-2 mt-6 block text-[12px] font-bold text-slate-700">جستجو و انتخاب استان</label>
          <select id="faromid-map-select" value={selectedName ?? ''} onChange={event => onProvinceChange(event.target.value)} className={styles.select}>
            <option value="">همه استان‌ها</option>
            {IRAN_PROVINCES.map(name => <option value={name} key={name}>{name}{dataAvailable ? ` (${numberFa.format(counts[name])})` : ''}</option>)}
          </select>

          {dataAvailable && withoutProvince > 0 && (
            <p className={styles.warning} role="status">استان {numberFa.format(withoutProvince)} نماینده در داده‌های عمومی مشخص نشده است؛ این افراد فقط در آمار کل لحاظ شده‌اند.</p>
          )}

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-[12px] font-bold text-slate-700">استان‌های پیشرو</h3><span className="text-[10px] text-slate-400">بر اساس تعداد نماینده</span></div>
            {dataAvailable && activeProvinces > 0 ? (
              <div className="space-y-2">
                {ranked.filter(item => item.count > 0).slice(0, 5).map(({name, count}) => (
                  <button type="button" onClick={() => selectProvince(name)} key={name} className={`${styles.rankRow} ${selectedName === name ? styles.rankRowActive : ''}`} aria-pressed={selectedName === name}>
                    <div className="flex items-center justify-between gap-2"><span className="truncate">{name}</span><span className="flex shrink-0 items-center gap-1 font-bold">{numberFa.format(count)}<ArrowLeft size={13}/></span></div>
                    <span className={styles.progressTrack}><span className={styles.progressBar} style={{width: `${Math.max(5, count / largestCount * 100)}%`, background: colors.progress}}/></span>
                  </button>
                ))}
              </div>
            ) : <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-[12px] leading-7 text-slate-500">{dataAvailable ? 'پس از تأیید نمایندگان، آمار استان‌ها نمایش داده می‌شود.' : 'در حال حاضر آمار نمایندگان از سرویس دریافت نشده است.'}</p>}
          </div>
        </aside>
      </div>
      <footer className={styles.footer}>نقشه SVG از بسته متن‌باز <a href="https://github.com/simamojtahedi/react-iran-map" target="_blank" rel="noopener noreferrer">react-iran-map</a> (مجوز MIT)؛ تعدادها فقط از فهرست عمومی نمایندگان فرامید محاسبه می‌شوند.</footer>
    </section>
  );
}
