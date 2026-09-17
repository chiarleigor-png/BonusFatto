import IseeReportFlowV4 from './IseeReportFlowV4.jsx';

export const ISEE_FLOW_VERSION = '2026-09-17-final-1';

export default function IseeReportFlowFinal() {
  const params = new URLSearchParams(window.location.search);
  const requestedVersion = params.get('flow');

  if (requestedVersion === ISEE_FLOW_VERSION) {
    const versionKey = 'bonusfatto_isee_flow_version';
    const previousVersion = window.sessionStorage.getItem(versionKey);
    const freshStart = params.get('fresh') === '1';

    if (freshStart || previousVersion !== ISEE_FLOW_VERSION) {
      window.sessionStorage.removeItem('bonusfatto_report_analysis');
      window.sessionStorage.setItem(versionKey, ISEE_FLOW_VERSION);
    }
  }

  return <IseeReportFlowV4 key={ISEE_FLOW_VERSION} />;
}
