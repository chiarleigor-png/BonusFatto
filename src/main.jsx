import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './AppV2.jsx';
import './styles.css';
import './v2.css';
import './demo.css';
import './restyle.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
