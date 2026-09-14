import './brandLogo.css';

const LOGO = '/bonusfatto_logo.png';

function applyOfficialLogo() {
  const brand = document.querySelector('.site-header .brand');
  if (brand && !brand.classList.contains('bf-official-brand')) {
    brand.classList.add('bf-official-brand');
    brand.innerHTML = `<img class="bf-official-logo" src="${LOGO}" alt="BonusFatto.it" />`;
  }

  const legalBrand = document.querySelector('.bf-footer-brand');
  if (legalBrand && !legalBrand.classList.contains('bf-logo-ready')) {
    legalBrand.classList.add('bf-logo-ready');
    const img = document.createElement('img');
    img.className = 'bf-footer-logo';
    img.src = LOGO;
    img.alt = 'BonusFatto.it';
    legalBrand.prepend(img);
  }

  const compactFooter = document.querySelector('.site-footer');
  if (compactFooter && !compactFooter.querySelector('.bf-mini-logo')) {
    const img = document.createElement('img');
    img.className = 'bf-mini-logo';
    img.src = LOGO;
    img.alt = 'BonusFatto.it';
    compactFooter.prepend(img);
  }
}

const observer = new MutationObserver(applyOfficialLogo);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', applyOfficialLogo);
applyOfficialLogo();
