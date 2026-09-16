try {
  localStorage.removeItem('bonusfatto_profile_2026');
  if (typeof window !== 'undefined' && window.__bonusFattoProfile2026) {
    delete window.__bonusFattoProfile2026;
  }
} catch {
  // Nessuna azione: la pulizia legacy non deve mai bloccare l'app.
}
