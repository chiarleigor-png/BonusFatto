import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import './clearLegacyProfile.js';
import App from './AppV9.jsx';
import './styles.css';
import './v2.css';
import './restyle.css';
import './family-hero.css';
import './results-v3.css';
import './iseeFlow.css';
import './serviceTest.css';
import './tariPecTest.css';
import './legalSite.js';
import './contactPageEnhancement.js';
import './legalContentProduction.js';
import './guideNav.js';
import './brandLogo.js';
import './formEnhancements.js';
import './reportDelivery.js';
import './pricingGateLaunch.js';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

flushSync(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});

rootElement.classList.add('app-ready');
