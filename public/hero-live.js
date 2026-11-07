const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// Fixed, deterministic motes animate on the compositor, without an idle RAF.
function addAtmosphere(hero) {
  if (hero.querySelector('.hero-atmosphere')) return;
  const atmosphere = document.createElement('div');
  atmosphere.className = 'hero-atmosphere';
  atmosphere.setAttribute('aria-hidden', 'true');
  const glow = document.createElement('div');
  glow.className = 'hero-light-breath';
  atmosphere.appendChild(glow);

  const shafts = [
    {className: 'hero-light-shaft', angle: 17, delay: 0},
    {className: 'hero-light-shaft is-right', angle: -15, delay: -8},
    {className: 'hero-light-shaft is-center', angle: 7, delay: -4},
  ];
  shafts.forEach(({className, angle, delay}) => {
    const shaft = document.createElement('span');
    shaft.className = className;
    shaft.style.setProperty('--shaft-angle', `${angle}deg`);
    shaft.style.setProperty('--shaft-delay', `${delay}s`);
    atmosphere.appendChild(shaft);
  });

  for (let index = 0; index < 5; index++) {
    const wave = document.createElement('span');
    wave.className = 'hero-breath-wave';
    wave.style.setProperty('--wave-y', `${76 + index * 3.2}%`);
    wave.style.setProperty('--wave-w', `${58 + index * 6}vw`);
    wave.style.setProperty('--wave-h', `${140 + index * 34}px`);
    wave.style.setProperty('--wave-delay', `${index * -4.6}s`);
    wave.style.setProperty('--wave-life', `${17 + index * 1.6}s`);
    atmosphere.appendChild(wave);
  }

  for (let index = 0; index < 8; index++) {
    const bokeh = document.createElement('span');
    const unit = salt => ((index * 211 + salt * 97) % 991) / 991;
    bokeh.className = 'hero-bokeh';
    bokeh.style.setProperty('--px', `${6 + unit(1) * 88}%`);
    bokeh.style.setProperty('--py', `${22 + unit(2) * 62}%`);
    bokeh.style.setProperty('--size', `${16 + unit(3) * 42}px`);
    bokeh.style.setProperty('--blur', `${5 + unit(4) * 9}px`);
    bokeh.style.setProperty('--drift', `${-18 + unit(5) * 36}px`);
    bokeh.style.setProperty('--life', `${18 + unit(6) * 12}s`);
    bokeh.style.setProperty('--delay', `${unit(7) * -26}s`);
    atmosphere.appendChild(bokeh);
  }

  for (let index = 0; index < 38; index++) {
    const mote = document.createElement('span');
    const unit = salt => ((index * 137 + salt * 79) % 997) / 997;
    const depth = index % 3;
    const depthClass = depth === 0 ? 'far' : depth === 1 ? 'mid' : 'near';
    const size = depth === 0 ? .9 + unit(4) * 1.2 : depth === 1 ? 1.7 + unit(4) * 1.3 : 3 + unit(4) * 2.6;
    const blur = depth === 2 ? 1.4 + unit(6) * 1.8 : depth === 1 ? .3 : 0;
    const glimmer = depth === 2 ? .34 + unit(6) * .34 : depth === 1 ? .26 + unit(6) * .3 : .18 + unit(6) * .22;
    mote.className = `hero-light-mote ${depthClass}${index % 8 === 0 ? ' star' : ''}`;
    const properties = {
      '--px': `${4 + unit(1) * 92}%`, '--py': `${12 + unit(9) * 82}%`,
      '--mote-size': `${size}px`,
      '--drift': `${-40 + unit(2) * 80}px`, '--lift': `${-(60 + unit(3) * 110)}px`,
      '--life': `${12 + unit(5) * 16}s`, '--delay': `${unit(7) * -28}s`,
      '--glimmer': `${glimmer}`, '--blur': `${blur}px`
    };
    Object.entries(properties).forEach(([name,value]) => mote.style.setProperty(name,value));
    atmosphere.appendChild(mote);
  }

  hero.appendChild(atmosphere);
}
// The background keeps every seated person intact. Only the orator/desk move.
// All plates use the same source canvas, crop and scale, including at rest.
export function initHeroLive() {
  const hero = document.querySelector('.hero');
  if (!hero || hero.dataset.heroLive) return;
  hero.dataset.heroLive = 'ready';
  addAtmosphere(hero);
  const layers = [...hero.querySelectorAll('.hero-layer')];
  const home = document.getElementById('home-view');
  const pager = document.getElementById('home-pager');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let x = 0, y = 0, targetX = 0, targetY = 0, frame = 0, last = 0;
  const visibleMotion = () => !document.hidden && !home.hidden &&
    pager.dataset.page === '0' && !reduced.matches &&
    !document.documentElement.classList.contains('no-motion') &&
    !document.querySelector('dialog[open]');
  const active = () => visibleMotion() && finePointer.matches;
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
  function syncActivity() {
    hero.classList.toggle('ambient-running', visibleMotion());
    if (!active()) reset();
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
  document.addEventListener('visibilitychange', syncActivity);
  reduced.addEventListener('change', syncActivity);
  finePointer.addEventListener('change', syncActivity);
  const observer = new MutationObserver(syncActivity);
  observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
  observer.observe(home, {attributes: true, attributeFilter: ['hidden']});
  observer.observe(pager, {attributes: true, attributeFilter: ['data-page']});
  document.querySelectorAll('dialog').forEach(dialog =>
    observer.observe(dialog, {attributes: true, attributeFilter: ['open']}));
  syncActivity();
  // Keep the complete original painting visible if any plate cannot load.
  Promise.all(layers.map(img => img.decode())).then(() => {
    if (layers.length === 3) hero.classList.add('layers-ready');
  }).catch(() => hero.classList.remove('layers-ready'));
}

