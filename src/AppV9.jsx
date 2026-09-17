import AppV7 from './AppV7.jsx';
import IseeReportFlowFinal from './IseeReportFlowFinal.jsx';

export default function AppV9() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('isee_preview') === '1') return <IseeReportFlowFinal />;
  return <AppV7 />;
}
