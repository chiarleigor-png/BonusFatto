function ensureGuideStyles() {
  if (document.getElementById('bf-guide-nav-styles')) return;
  const style = document.createElement('style');
  style.id = 'bf-guide-nav-styles';
  style.textContent = `
    .bf-guide-highlight{
      display:inline-flex!important;
      align-items:center;
      gap:8px;
      padding:10px 16px!important;
      border-radius:999px!important;
      background:linear-gradient(135deg,#6a4ce0 0%,#5136c9 100%)!important;
      color:#fff!important;
      border:1px solid rgba(255,255,255,.28)!important;
      box-shadow:0 8px 20px rgba(86,63,195,.24)!important;
      font-weight:800!important;
      text-decoration:none!important;
      letter-spacing:.01em;
      transition:transform .2s ease,box-shadow .2s ease,filter .2s ease!important;
    }
    .bf-guide-highlight:hover{
      transform:translateY(-2px);
      box-shadow:0 12px 26px rgba(86,63,195,.32)!important;
      filter:brightness(1.04);
    }
    .bf-guide-highlight span{
      display:inline-grid;
      place-items:center;
      width:21px;
      height:21px;
      border-radius:50%;
      background:rgba(255,255,255,.18);
      font-size:12px;
      line-height:1;
    }
    @media(max-width:760px){
      .bf-guide-highlight{padding:9px 13px!important;box-shadow:0 6px 16px rgba(86,63,195,.2)!important}
    }
  `;
  document.head.appendChild(style);
}

function addGuideNavigation() {
  ensureGuideStyles();
  const current = document.querySelector('.magazine-button');
  if (!current) return;

  if (current.tagName === 'A') {
    if (current.dataset.bfGuideReady === '1') return;
    current.dataset.bfGuideReady = '1';
    current.classList.add('bf-guide-highlight');
    current.href = '/guide-bonus/';
    current.setAttribute('aria-label', 'Guide Bonus');
    current.innerHTML = 'Guide Bonus <span>↗</span>';
    return;
  }

  const link = document.createElement('a');
  link.dataset.bfGuideReady = '1';
  link.className = `${current.className} bf-guide-highlight`;
  link.href = '/guide-bonus/';
  link.setAttribute('aria-label', 'Guide Bonus');
  link.innerHTML = 'Guide Bonus <span>↗</span>';
  current.replaceWith(link);
}

addGuideNavigation();
new MutationObserver(addGuideNavigation).observe(document.body, { childList: true, subtree: true });
