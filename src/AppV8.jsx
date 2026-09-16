import AppV7 from './AppV7.jsx';
import IseeReportFlowV3 from './IseeReportFlowV3.jsx';

export default function AppV8() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('isee_preview') === '1') return <IseeReportFlowV3 />;
  return <AppV7 />;
}
