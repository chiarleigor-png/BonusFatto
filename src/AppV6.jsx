import AppV5 from './AppV5.jsx';
import IseeReportFlow from './IseeReportFlow.jsx';

export default function AppV6() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('isee_preview') === '1') return <IseeReportFlow />;
  return <AppV5 />;
}
