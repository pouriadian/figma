'use client';

import {usePathname} from 'next/navigation';
import {PageLoader} from '@/components/ui/page-loader';

/** Keep route-pending feedback everywhere except home, which owns its timed loader. */
export default function Loading() {
  const pathname=usePathname();
  return pathname==='/'?null:<PageLoader/>;
}
