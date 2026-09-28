import { useEffect, useState, useMemo } from "react";

// MOTORE 7894 COMUNI + ETA' - integrato
const BONUS_ETA = [
  { id: 'sociale', nome: 'Bonus Luce/Gas/Acqua', isee_max: 9530, eta_min: 0, eta_max: 120, importo: '500€/anno' },
  { id: 'unico_0_21', nome: 'Assegno Unico 0-21 anni', isee_max: 45000, eta_min: 0, eta_max: 21, rif: 'figlio', importo: '199€/mese ISEE 0' },
  { id: 'asilo_0_3', nome: 'Bonus Asilo Nido 0-3', isee_max: 40000, eta_min: 0, eta_max: 3, rif: 'bambino', importo: '3000€/anno' },
  { id: 'mensa_3_14', nome: 'Mensa 3-14 esenzione ISEE 0', isee_max: 10000, eta_min: 3, eta_max: 14, rif: 'figlio', importo: 'Esenzione totale' },
  { id: 'trasporto_u26', nome: 'Trasporto Under 26 gratis', isee_max: 15000, eta_min: 0, eta_max: 26, importo: 'Gratis ISEE 0-5000' },
  { id: 'carta_over65', nome: 'Carta Over 65', isee_max: 8000, eta_min: 65, eta_max: 120, importo: '80€ bimestrali' },
  { id: 'trasporto_o65', nome: 'Trasporto Over 65 gratis', isee_max: 15000, eta_min: 65, eta_max: 120, importo: 'Gratis' },
  { id: 'tari', nome: 'Bonus TARI', isee_max: 15000, eta_min: 0, eta_max: 120, importo: '25-100%' },
];

function calcolaBonus(isee, eta, etaFigli) {
  return BONUS_ETA.filter(b => {
    if (isee > b.isee_max) return false;
    if (b.rif === 'figlio' && etaFigli.length) return etaFigli.some(e => e >= b.eta_min && e <= b.eta_max);
    if (b.rif !== 'figlio' && (eta < b.eta_min || eta > b.eta_max)) return false;
    return true;
  });
}

// ... mantieni il tuo codice esistente sotto, aggiungi solo stato età
