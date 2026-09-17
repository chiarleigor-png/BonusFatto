import AppV7 from './AppV7.jsx';
import IseeReportFlowFinal from './IseeReportFlowFinal.jsx';
import ServiceTestFlow from './ServiceTestFlow.jsx';

export default function AppV9() {
  const params = new URLSearchParams(window.location.search);
  const serviceTest = params.get('service_test');
  if (['base', 'tari', 'whatsapp'].includes(serviceTest)) return <ServiceTestFlow service={serviceTest} />;
  if (params.get('isee_preview') === '1') return <IseeReportFlowFinal />;
  return <AppV7 />;
}
