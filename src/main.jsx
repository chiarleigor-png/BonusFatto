import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './AppV3.jsx';
import './styles.css';
import './v2.css';
import './demo.css';
import './restyle.css';
import './family-hero.css';
import './results-v3.css';
import './paywallV3.js';
import './legalSite.js';
import './guideNav.js';
import './brandLogo.js';
import './formEnhancements.js';
import './reportDelivery.js';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
