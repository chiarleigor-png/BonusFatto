function getFamilySection() {
  return [...document.querySelectorAll('.bfq-section')].find((section) => section.querySelector('h2')?.textContent?.trim() === 'Famiglia');
}

function syncMaternityField() {
  const section = getFamilySection();
  if (!section) return;

  const fields = [...section.querySelectorAll('.bfq-field')];
  const eventField = fields.find((label) => /Evento nel 2026|Nascita, adozione o affidamento nel 2026/i.test(label.textContent || '')) || fields[0];
  const maternityField = fields.find((label) => /Indennità.*maternità/i.test(label.textContent || ''));
  if (!eventField || !maternityField) return;

  const eventSelect = eventField.querySelector('select');
  const maternitySelect = maternityField.querySelector('select');
  if (!eventSelect || !maternitySelect) return;

  const noEvent = eventSelect.value === 'none';
  maternityField.style.display = noEvent ? 'none' : '';

  if (noEvent && maternitySelect.value !== 'no') {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (setter) setter.call(maternitySelect, 'no');
    else maternitySelect.value = 'no';
    maternitySelect.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

document.addEventListener('change', (event) => {
  if (!event.target.closest?.('.bfq-form')) return;
  requestAnimationFrame(() => requestAnimationFrame(syncMaternityField));
}, true);

document.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(syncMaternityField);
});
