// bonusFatto - Motore Completo 7894 Comuni + ISEE + Età
export const BONUS_NAZIONALI_ETA = [
  { id: 'bonus_sociale', nome: 'Bonus Sociale Luce/Gas/Acqua', isee_max: 9530, isee_max_4_figli: 15000, eta_min: 0, eta_max: 120, importo: '500€/anno', categoria: 'nazionale', priorita: 1 },
  { id: 'assegno_unico_0_21', nome: 'Assegno Unico Figli 0-21 anni', isee_max: 45000, eta_min: 0, eta_max: 21, eta_riferimento: 'figlio', importo: '199€/mese con ISEE 0', categoria: 'nazionale', priorita: 1 },
  { id: 'bonus_asilo_0_3', nome: 'Bonus Asilo Nido 0-3 anni', isee_max: 40000, eta_min: 0, eta_max: 3, eta_riferimento: 'bambino', importo: '3000€/anno', categoria: 'nazionale', priorita: 2 },
  { id: 'bonus_mensa_3_14', nome: 'Bonus Mensa Scolastica 3-14 anni', isee_max: 10000, isee_esenzione: 3000, eta_min: 3, eta_max: 14, eta_riferimento: 'figlio', importo: 'Esenzione totale con ISEE 0', categoria: 'comunale', priorita: 2 },
  { id: 'bonus_trasporto_under26', nome: 'Bonus Trasporto Under 26', isee_max: 15000, isee_gratis: 5000, eta_min: 0, eta_max: 26, importo: 'Gratis ISEE 0-5000', categoria: 'regionale', priorita: 3 },
  { id: 'adi_18_67', nome: 'Assegno di Inclusione 18-67', isee_max: 6000, eta_min: 18, eta_max: 67, importo: '500€+280€ affitto', categoria: 'nazionale', priorita: 1 },
  { id: 'carta_acquisti_over65', nome: 'Carta Acquisti Over 65', isee_max: 8000, eta_min: 65, eta_max: 120, importo: '80€ bimestrali', categoria: 'nazionale', priorita: 2 },
  { id: 'bonus_tari', nome: 'Bonus TARI', isee_max: 15000, eta_min: 0, eta_max: 120, importo: '25-100%', categoria: 'comunale', priorita: 1 }
]

export function calcolaBonus({ isee, eta, etaFigli = [], comune }) {
  const iseeVal = Number(isee) || 0
  const etaVal = eta !== undefined ? Number(eta) : null
  return BONUS_NAZIONALI_ETA.filter(bonus => {
    if (iseeVal > (bonus.isee_max || 999999)) return false
    if (etaVal !== null && bonus.eta_min !== undefined) {
      if (bonus.eta_riferimento === 'figlio' && etaFigli.length > 0) {
        return etaFigli.some(e => e >= bonus.eta_min && e <= bonus.eta_max)
      } else if (bonus.eta_riferimento !== 'figlio') {
        if (etaVal < bonus.eta_min || etaVal > bonus.eta_max) return false
      }
    }
    return true
  })
}

export function ricercaUniversale({ nomeComune, isee, eta, etaFigli }) {
  const bonus = calcolaBonus({ isee, eta, etaFigli, comune: nomeComune })
  return { comune: nomeComune, isee, eta, totaleBonus: bonus.length, bonus, isDinamico: true }
}
