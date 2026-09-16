function scrollResultsToTop() {
  const run = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
  setTimeout(run, 80);
  setTimeout(run, 250);
}

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (!form.closest('.form-card')) return;
  if (!form.querySelector('button[type="submit"]')) return;
  scrollResultsToTop();
}, true);
