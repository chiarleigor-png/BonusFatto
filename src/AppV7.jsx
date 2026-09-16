import AppV6 from './AppV6.jsx';
import IseeReportFlowV2 from './IseeReportFlowV2.jsx';

export default function AppV7() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('isee_preview') === '1') return <IseeReportFlowV2 />;
  return <AppV6 />;
}
