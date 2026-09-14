import './brandLogo.css';

const PARTS = [
  '/brand/bonusfatto-logo.part1',
  '/brand/bonusfatto-logo.part2',
  '/brand/bonusfatto-logo.part3',
  '/brand/bonusfatto-logo.part4',
  '/brand/bonusfatto-logo.part5',
];

let logoPromise;

function loadOfficialLogo() {
  if (!logoPromise) {
    logoPromise = Promise.all(
      PARTS.map((url) =>
        fetch(url, { cache: 'force-cache' }).then((response) => {
          if (!response.ok) throw new Error(`Logo part unavailable: ${url}`);
          return response.text();
        }),
      ),
    ).then((parts) => `data:image/jpeg;base64,${parts.join('').replace(/\s+/g, '')}`);
  }
  return logoPromise;
}

function setImg(img, src, className) {
  img.className = className;
  img.src = src;
  img.alt = 'BonusFatto.it';
}

async function applyOfficialLogo() {
  let logo;
  try {
    logo = await loadOfficialLogo();
  } catch {
    return;
  }

  const brand = document.querySelector('.site-header .brand');
  if (brand) {
    brand.classList.add('bf-official-brand');
    let img = brand.querySelector('.bf-official-logo');
    if (!img) {
      brand.replaceChildren();
      img = document.createElement('img');
      brand.appendChild(img);
    }
    setImg(img, logo, 'bf-official-logo');
  }

  const legalBrand = document.querySelector('.bf-footer-brand');
  if (legalBrand && !legalBrand.querySelector('.bf-footer-logo')) {
    legalBrand.classList.add('bf-logo-ready');
    const img = document.createElement('img');
    setImg(img, logo, 'bf-footer-logo');
    legalBrand.prepend(img);
  }

  const compactFooter = document.querySelector('.site-footer');
  if (compactFooter && !compactFooter.querySelector('.bf-mini-logo')) {
    const img = document.createElement('img');
    setImg(img, logo, 'bf-mini-logo');
    compactFooter.prepend(img);
  }
}

const observer = new MutationObserver(applyOfficialLogo);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', applyOfficialLogo);
applyOfficialLogo();
