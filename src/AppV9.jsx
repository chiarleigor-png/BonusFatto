import AppV7 from './AppV7.jsx';
import IseeReportFlowFinal from './IseeReportFlowFinal.jsx';
import ServiceTestFlow from './ServiceTestFlow.jsx';
import QuickAnalysisTestFlow from './QuickAnalysisTestFlow.jsx';
import TariPecTestFlow from './TariPecTestFlow.jsx';

export default function AppV9() {
  const params = new URLSearchParams(window.location.search);
  const serviceTest = params.get('service_test');
  if (serviceTest === 'base') return <QuickAnalysisTestFlow />;
  if (serviceTest === 'tari') return <TariPecTestFlow />;
  if (serviceTest === 'whatsapp') return <ServiceTestFlow service={serviceTest} />;
  if (params.get('isee_preview') === '1') return <IseeReportFlowFinal />;
  return <AppV7 />;
}
