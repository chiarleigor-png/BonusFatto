import './brandLogo.css';

const LOGO = '/brand/bonusfatto-logo-official.jpg';

function setImg(img, className) {
  img.className = className;
  img.src = LOGO;
  img.alt = 'BonusFatto.it';
}

function applyOfficialLogo() {
  const brand = document.querySelector('.site-header .brand');
  if (brand) {
    brand.classList.add('bf-official-brand');
    let img = brand.querySelector('.bf-official-logo');
    if (!img) {
      brand.replaceChildren();
      img = document.createElement('img');
      brand.appendChild(img);
    }
    setImg(img, 'bf-official-logo');
  }

  const legalBrand = document.querySelector('.bf-footer-brand');
  if (legalBrand && !legalBrand.querySelector('.bf-footer-logo')) {
    legalBrand.classList.add('bf-logo-ready');
    const img = document.createElement('img');
    setImg(img, 'bf-footer-logo');
    legalBrand.prepend(img);
  }

  const compactFooter = document.querySelector('.site-footer');
  if (compactFooter && !compactFooter.querySelector('.bf-mini-logo')) {
    const img = document.createElement('img');
    setImg(img, 'bf-mini-logo');
    compactFooter.prepend(img);
  }
}

const observer = new MutationObserver(applyOfficialLogo);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', applyOfficialLogo);
applyOfficialLogo();
