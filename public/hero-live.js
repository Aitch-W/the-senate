const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// The plates share a source canvas and crop; only their depth transforms differ.
export function initHeroLive() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const layers = [...hero.querySelectorAll('.hero-layer')];
  const home = document.getElementById('home-view');
  const pager = document.getElementById('home-pager');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let x = 0, y = 0, targetX = 0, targetY = 0, frame = 0, last = 0;
  const active = () => !document.hidden && !home.hidden &&
    pager.dataset.page === '0' && !reduced.matches && finePointer.matches &&
    !document.documentElement.classList.contains('no-motion') &&
    !document.querySelector('dialog[open]');

  function paint() {
    hero.style.setProperty('--mx', x.toFixed(4));
    hero.style.setProperty('--my', y.toFixed(4));
  }
  function reset() {
    cancelAnimationFrame(frame);
    frame = 0; last = 0;
    x = y = targetX = targetY = 0;
    paint();
  }
  function tick(now) {
    frame = 0;
    if (!active()) { reset(); return; }
    const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 60;
    last = now;
    const ease = 1 - Math.exp(-9 * dt);
    x += (targetX - x) * ease;
    y += (targetY - y) * ease;
    if (Math.abs(targetX - x) + Math.abs(targetY - y) < .001) {
      x = targetX; y = targetY; last = 0;
    } else frame = requestAnimationFrame(tick);
    paint();
  }
  function wake() { if (!frame && active()) frame = requestAnimationFrame(tick); }
  hero.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !active()) return;
    const rect = hero.getBoundingClientRect();
    targetX = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
    targetY = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
    wake();
  }, {passive: true});
  hero.addEventListener('pointerleave', () => { targetX = targetY = 0; wake(); });
  document.addEventListener('visibilitychange', reset);
  reduced.addEventListener('change', reset);
  finePointer.addEventListener('change', reset);
  const observer = new MutationObserver(() => { if (!active()) reset(); });
  observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
  observer.observe(home, {attributes: true, attributeFilter: ['hidden']});
  observer.observe(pager, {attributes: true, attributeFilter: ['data-page']});
  document.querySelectorAll('dialog').forEach(dialog =>
    observer.observe(dialog, {attributes: true, attributeFilter: ['open']}));
  // Reveal the assembled scene only after all three plates load successfully.
  Promise.all(layers.map(img => img.decode())).then(() => {
    if (layers.length === 3) hero.classList.add('layers-ready');
  }).catch(() => hero.classList.remove('layers-ready'));
}
