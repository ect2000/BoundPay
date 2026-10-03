import { Suspense } from 'react';
import Workspace from '@/components/workspace';
export default function MissionPage() {
  return (
    <Suspense fallback={<div className="page-loading">Opening BoundPay workspace…</div>}>
      <Workspace />
    </Suspense>
  );
}
