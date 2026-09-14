function addGuideNavigation() {
  const current = document.querySelector('.magazine-button');
  if (!current || current.tagName === 'A') return;
  const link = document.createElement('a');
  link.className = current.className;
  link.href = '/guide-bonus/';
  link.setAttribute('aria-label', 'Guide Bonus');
  link.innerHTML = 'Guide Bonus <span>↗</span>';
  current.replaceWith(link);
}

addGuideNavigation();
new MutationObserver(addGuideNavigation).observe(document.body, { childList: true, subtree: true });
