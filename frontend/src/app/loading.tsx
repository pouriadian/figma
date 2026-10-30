'use client';

import {PageLoader} from '@/components/ui/page-loader';

/** Keep route-pending feedback everywhere except home, which owns its timed loader. */
export default function Loading() {
  return <PageLoader/>;
}
