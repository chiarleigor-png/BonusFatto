import './brandLogo.css';

const LOGO = '/brand/bonusfatto-logo-official.jpg';

function createLockup(className) {
  const lockup = document.createElement('span');
  lockup.className = `bf-brand-lockup ${className}`;
  lockup.setAttribute('aria-label', 'BonusFatto.it');

  const mark = document.createElement('span');
  mark.className = 'bf-brand-mark';

  const img = document.createElement('img');
  img.src = LOGO;
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  mark.appendChild(img);

  const name = document.createElement('span');
  name.className = 'bf-brand-name';
  name.innerHTML = '<span class="bf-brand-blue">Bonus</span><span class="bf-brand-green">Fatto</span><span class="bf-brand-blue">.it</span>';

  lockup.append(mark, name);
  return lockup;
}

function applyOfficialLogo() {
  const brand = document.querySelector('.site-header .brand');
  if (brand && !brand.querySelector('.bf-header-lockup')) {
    brand.classList.add('bf-official-brand');
    brand.replaceChildren(createLockup('bf-header-lockup'));
  }

  const legalBrand = document.querySelector('.bf-footer-brand');
  if (legalBrand && !legalBrand.querySelector('.bf-footer-lockup')) {
    legalBrand.classList.add('bf-logo-ready');
    legalBrand.prepend(createLockup('bf-footer-lockup'));
  }

  document.querySelectorAll('.site-footer .bf-mini-logo, .site-footer .bf-brand-lockup').forEach((node) => node.remove());
}

const observer = new MutationObserver(applyOfficialLogo);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', applyOfficialLogo);
applyOfficialLogo();
