import AppV7 from './AppV7.jsx';
import IseeReportFlowV4 from './IseeReportFlowV4.jsx';
import ServiceTestFlow from './ServiceTestFlow.jsx';

export default function AppV8() {
  const params = new URLSearchParams(window.location.search);
  const serviceTest = params.get('service_test');
  if (['base', 'tari', 'whatsapp'].includes(serviceTest)) return <ServiceTestFlow service={serviceTest} />;
  if (params.get('isee_preview') === '1') return <IseeReportFlowV4 />;
  return <AppV7 />;
}
