import AppV7 from './AppV7.jsx';
import PaidServiceRouter, { ProductionReportFlow } from './ProductionRouter.jsx';

export default function AppV9() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');

  if (sessionId) return <PaidServiceRouter sessionId={sessionId} />;
  if (params.get('isee_preview') === '1') return <ProductionReportFlow />;
  return <AppV7 />;
}
