import AppV7 from './AppV7.jsx';
import IseeReportFlowV4 from './IseeReportFlowV4.jsx';

export default function AppV8() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('isee_preview') === '1') return <IseeReportFlowV4 />;
  return <AppV7 />;
}
