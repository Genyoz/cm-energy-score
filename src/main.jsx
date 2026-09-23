import React from 'react';
import { createRoot } from 'react-dom/client';
import CMEnergyScoreApp from '../cm-energy-score.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CMEnergyScoreApp />
  </React.StrictMode>
);
