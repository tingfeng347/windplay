/* Below the hero the ten works sit in one horizontal band. The band keeps the wheel: while the
   pointer is over it a scroll slides the works along and zooms whichever one has reached the middle
   up to full size, the way a scrolling tiling layout moves through its columns. Everywhere else on
   the page — and past either end of the band — the scroll belongs to the document, so the works
   never stand between the reader and the rest of the site. Nothing is faded or masked on the way
   through: a work either owns the middle at full size or it is out past the edge at a smaller one.
   The cards themselves are ordinary links, so with no JavaScript the band is the plain catalogue. */
(() => {
  'use strict';

  const catalog = document.querySelector('.catalog');
  const grid = document.querySelector('.work-grid');
  const rail = document.querySelector('.corridor-rail');
  if (!catalog || !grid) return;

  const cards = [...grid.querySelectorAll('.work-card')].map(element => ({
    element,
    t: 0,
    transform: '',
    warm: false
  }));
  if (cards.length < 2) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const ticks = rail ? [...rail.children] : [];
  const written = new WeakMap();

  // Wheel pixels that carry the ribbon one whole work along. Roughly three notches to a work: enough
  // that a flick moves the gallery on, little enough that no work blurs past unread.
  const STEP = 300;
  // A single wheel event is capped here, so one very fast trackpad flick cannot throw the ribbon
  // across half the gallery in a frame.
  const BURST = 1.5;
  // The step curve. A work hangs in the middle and then commits, so the slope is gentle there and
  // steep at the ends: that is what gives the switch a run-up and a landing instead of a slide. Odd
  // about zero and exactly 1 at 1, so it can be read straight off the step.
  const SLOPE = 0.45;
  const trip = value => value * (SLOPE + (1 - SLOPE) * value * value);
  // How much smaller a work is by the time its neighbour has taken the middle. The size difference is
  // the whole of the effect — nothing fades — so it is set to read unmistakably at the band's edges.
  const FOCUS = 0.26;
  // The clear air between the outgoing and the incoming work at the moment they trade places. Two
  // works of this size cannot both hold the middle, so the hand-over happens with one leaving frame
  // and the other arriving; the gap is what keeps them from ever sitting on top of each other.
  const GAP = 32;
  const HANDOVER = 0.5;
  const LAG = 40;         // px a flick drags the ribbon behind by, so the gallery carries weight
  // How long a switch takes. One work of travel settles in SWITCH milliseconds, a longer throw
  // stretches that but only as far as LONGEST, and QUICKEST is the floor so a single notch still
  // reads as a movement rather than a cut. These size the follow's settling time, and settling is
  // what it does: it is never still gliding after the hand has stopped.
  const SWITCH = 210;
  const QUICKEST = 130;
  const LONGEST = 520;
  // A critically damped follow settles in about 3.3 of its own time constants, which is how a
  // duration in milliseconds becomes the number the follow actually wants.
  const SETTLE = 3300;
  // Inside this, and moving slower than this, the ribbon is simply at the work it was asked for. The
  // follow stops there instead of creeping the last hundredth of a pixel for another half second.
  const ARRIVED = 0.00002;
  const STILL = 0.002;

  const current = { progress: 0, velocity: 0 };
  const target = { progress: 0 };

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
  const spans = distance => clamp(distance, -BURST * STEP, BURST * STEP) / (STEP * (cards.length - 1));

  let mode = '';
  let atmosphere = null;
  let atmosphereRequested = false;
  let canvas = null;
  let metrics = null;
  let activeIndex = -1;
  let started = false;
  let stageVisible = false;
  let frameId = null;
  let lastFrame = null;
  let needsMeasure = false;
  let elapsedTime = 0;
  let drag = null;
  let moved = null;
  let previewsWanted = false;
  let previewsWarmed = false;

  function property(element, name, value) {
    let values = written.get(element);
    if (!values) written.set(element, values = new Map());
    if (values.get(name) === value) return;
    values.set(name, value);
    element.style.setProperty(name, value);
  }

  const enabled = () => mode === 'active' || mode === 'paused';

  // Reads are grouped here. The animation frames use these cached numbers only.
  function measure() {
    const catalogBox = catalog.getBoundingClientRect();
    const gridBox = grid.getBoundingClientRect();

    // The band reaches past the text column to both screen edges, so a work leaves frame through the
    // edge of the window and not through an invisible line inside it. The catalogue column is the
    // reference because it is never widened, so this cannot feed back on itself, and the half pixel
    // is so a rounding error can never turn into a horizontal scrollbar.
    const viewportWidth = document.documentElement.clientWidth;
    const bleed = Math.max(0, (viewportWidth - catalogBox.width) / 2 - 0.5);
    property(grid, '--bleed', `${bleed.toFixed(1)}px`);

    for (const card of cards) {
      card.t = parseFloat(getComputedStyle(card.element).getPropertyValue('--t')) || 0;
    }
    // One work owns the middle for the length of one step along the ribbon. The steps are read from
    // the page rather than assumed, so adding a work does not need the motion retuned.
    const steps = cards.slice(1).map((card, index) => card.t - cards[index].t).filter(step => step > 0);
    steps.sort((a, b) => a - b);
    const spacing = steps.length ? steps[Math.floor(steps.length / 2)] : 1 / cards.length;

    // How far a work travels over one whole step. It is set from the work's own size so that at the
    // hand-over the outgoing and the incoming work are exactly GAP apart — the ribbon's speed follows
    // from the layout instead of being tuned against it, and the gap holds at every viewport width.
    const cardWidth = cards[0].element.offsetWidth || catalogBox.width * 0.6;
    const spread = (cardWidth * (1 - FOCUS * smooth(HANDOVER)) + GAP) / (2 * trip(HANDOVER));

    metrics = {
      width: Math.max(catalogBox.width + bleed * 2, 1),
      height: Math.max(gridBox.height, 1),
      spacing,
      spread,
      cardWidth
    };
    needsMeasure = false;
    render();
  }

  function render() {
    if (!metrics) return;
    const p = current.progress;
    const spread = metrics.spread;
    const spacing = metrics.spacing;
    // A flick drags the ribbon behind and it catches up as it slows.
    const lean = clamp(current.velocity, -1, 1) * LAG;
    let nearest = 0;
    let nearestDistance = Infinity;

    for (let index = 0; index < cards.length; index += 1) {
      const card = cards[index];
      const u = card.t - p;
      const distance = Math.abs(u);
      if (distance < nearestDistance) { nearestDistance = distance; nearest = index; }

      // How far through its own step the work is: 0 in the middle, 1 the moment it is handed over.
      const reach = distance < spacing ? distance / spacing : 1;
      // Only the works actually on the band are touched: everything further along is parked beyond
      // the edge and left exactly as it was, so a frame of motion costs the two works that are
      // actually moving and nothing else.
      const warm = reach < 1;
      if (card.warm !== warm) {
        card.warm = warm;
        card.element.classList.toggle('is-near', warm);
      }

      const side = u < 0 ? -1 : 1;
      const travel = side * spread * trip(reach) + lean * (1 - reach);
      const scale = 1 - FOCUS * smooth(reach);

      // Written straight onto the card: transform composites and is not inherited, so the two works
      // that are moving are the only thing a frame repaints.
      const transform = `translate(-50%,-50%) translateX(${travel.toFixed(1)}px) scale(${scale.toFixed(4)})`;
      if (card.transform !== transform) {
        card.transform = transform;
        card.element.style.transform = transform;
      }
    }

    if (nearest !== activeIndex) {
      activeIndex = nearest;
      cards.forEach((card, index) => card.element.classList.toggle('is-live', index === nearest));
      for (let index = 0; index < ticks.length; index += 1) {
        ticks[index].classList.toggle('is-on', index === nearest);
      }
    }

    if (atmosphere) atmosphere.update({ progress: p, time: elapsedTime });
  }

  // Published for whoever is watching, but only when it changes: writing the same value back sixty
  // times a second is a style invalidation on the gallery for no change at all.
  function moving(value) {
    if (moved === value) return;
    moved = value;
    catalog.setAttribute('data-moving', String(value));
  }

  function cancel() {
    if (frameId !== null) window.cancelAnimationFrame(frameId);
    frameId = null;
    lastFrame = null;
    moving(false);
  }

  function schedule() {
    if (!enabled() || !stageVisible || document.hidden || frameId !== null) return;
    moving(true);
    frameId = window.requestAnimationFrame(tick);
  }

  // A critically damped follow, and the reason a trackpad swipe reads as one movement. Aiming at a
  // new place moves the target and nothing else: the ribbon keeps the speed it already had and is
  // carried on into the new place, so a burst of deltas integrates into a single glide instead of a
  // lurch on every event. Critically damped is the choice because it is the fastest approach that
  // does not overshoot — the works arrive in order and none of them swings back past the middle.
  function follow(delta, smoothTime) {
    const omega = 2 / Math.max(smoothTime, 0.001);
    const x = omega * delta;
    const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = current.progress - target.progress;
    const carry = (current.velocity + omega * change) * delta;
    current.velocity = (current.velocity - omega * carry) * decay;
    const next = target.progress + (change + carry) * decay;
    if (Math.abs(target.progress - next) < ARRIVED && Math.abs(current.velocity) < STILL) {
      current.progress = target.progress;
      current.velocity = 0;
      return;
    }
    current.progress = next;
  }

  // Every gesture — a wheel notch, a trackpad flick, a finger drag — ends up here as a place along
  // the ribbon. Nothing is started or restarted: the follow in tick() carries the ribbon there from
  // wherever it has got to, at whatever speed it has, so a second flick landing mid-switch joins the
  // first rather than beginning again, and a steady stream of deltas tracks the hand without
  // stopping between the events.
  function seek(progress) {
    const next = clamp(progress, 0, 1);
    if (next === target.progress) return;
    target.progress = next;
    begin();
  }

  // The wheel and the finger both say how far to go, not where to arrive.
  const advance = distance => seek(target.progress + distance);

  function begin() {
    if (!started) {
      started = true;
      catalog.setAttribute('data-started', 'true');
    }
    schedule();
  }

  function tick(time) {
    frameId = null;
    if (!enabled() || document.hidden) return cancel();
    if (needsMeasure) measure();
    if (!stageVisible) { moving(false); lastFrame = null; return; }

    const elapsed = lastFrame === null ? 1000 / 60 : clamp(time - lastFrame, 1, 64);
    lastFrame = time;

    if (mode === 'active') {
      // How long this switch is allowed to take, sized from how far it still has to go: one work is
      // SWITCH, half a work is quicker than that, and a throw right across the gallery stops at
      // LONGEST. Read from what is left rather than from what was asked for, so a re-aimed switch
      // is judged on the distance it now has rather than the distance it once had.
      const spacing = metrics ? metrics.spacing : 1 / (cards.length - 1);
      const span = clamp(Math.abs(target.progress - current.progress) / spacing * SWITCH, QUICKEST, LONGEST);
      follow(elapsed / 1000, span / SETTLE);
    } else {
      // Paused means the ribbon still reaches every work — the works have to stay reachable when the
      // reader has asked the page to hold still — but it arrives there without travelling, so there
      // is no trailing weight to carry and the lean is pinned rather than left frozen mid-swing.
      current.progress = target.progress;
      current.velocity = 0;
    }

    elapsedTime += elapsed / 1000;
    render();

    const unfinished = mode === 'active'
      && (current.progress !== target.progress || current.velocity !== 0);
    if (unfinished) schedule();
    else {
      lastFrame = null;
      current.velocity = 0;
      moving(false);
    }
  }

  const isDark = () => {
    const chosen = document.documentElement.dataset.theme;
    return chosen ? chosen === 'dark' : systemDark.matches;
  };

  // Soft motes gain almost nothing from a third and fourth sample per pixel, and the layer covers the
  // whole band, so the air is drawn at a lower density than the text on top of it.
  const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 1.5);

  // The motes cost a 130 KB gzipped bundle, so they are only fetched once the band is nearly in view.
  // If the import fails the band simply runs without them.
  function loadAtmosphere() {
    if (atmosphereRequested || !metrics) return;
    atmosphereRequested = true;

    canvas = document.createElement('canvas');
    canvas.className = 'corridor-air';
    canvas.setAttribute('aria-hidden', 'true');
    grid.prepend(canvas);

    const drop = () => { canvas?.remove(); canvas = null; };
    import('./vendor/atmosphere.js').then(module => {
      if (!canvas) return;
      const created = module.createAtmosphere(canvas);
      if (!created) return drop();
      atmosphere = created;
      atmosphere.setTheme(isDark());
      atmosphere.resize(metrics.width, metrics.height, pixelRatio());
      render();
    }).catch(drop);
  }

  // The band is a carousel, so any work can be asked for at any moment and none of the ten bitmaps
  // can be left to arrive on demand. Left lazy, a work begins downloading at the instant it slides
  // into frame — which is the one moment in the interaction when there is no time to spare, and the
  // reason a swipe could stutter while the pictures caught up. They are asked for, and decoded, while
  // the band is still a screen or more away, and only once the ribbon is actually in play: on a page
  // that never reaches the band, or one that has been asked to hold still, nothing is fetched.
  //
  // The page itself goes first. The band sits less than a screen below the hero, so it is already
  // "near" the moment the page opens, and warming on that alone would have ten pictures competing
  // with the two the reader is actually looking at.
  function warmPreviews() {
    if (previewsWarmed || !previewsWanted || !enabled()) return;
    if (document.readyState !== 'complete') return;
    previewsWarmed = true;
    for (const image of grid.querySelectorAll('img')) {
      image.loading = 'eager';
      image.decode?.().catch(() => {});
    }
  }

  const warmth = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    previewsWanted = true;
    warmPreviews();
  }, { rootMargin: '150% 0px' });

  // A wheel event, in pixels, along whichever axis the gesture leans on — a trackpad swiping sideways
  // across the band means the same thing there as a wheel does.
  function wheelDistance(event) {
    const lines = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? (window.innerHeight || 800) : 1;
    const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    return raw * lines;
  }

  grid.addEventListener('wheel', event => {
    if (!enabled() || !metrics) return;
    const distance = wheelDistance(event);
    if (!distance) return;
    // At either end of the ribbon there is nothing left to hand over, so the document keeps the
    // gesture and the reader is never held on the works.
    if ((distance < 0 && target.progress <= 0) || (distance > 0 && target.progress >= 1)) return;
    // The script only claims the scroll once it is certain it can use it.
    event.preventDefault();
    advance(spans(distance));
  }, { passive: false });

  // The same gesture with a finger: pan-y is declared on the band, so a vertical drag is the page's
  // and only the horizontal one arrives here.
  grid.addEventListener('touchstart', event => {
    if (!enabled() || !metrics || event.touches.length !== 1) return;
    drag = { x: event.touches[0].clientX, progress: target.progress };
  }, { passive: true });

  grid.addEventListener('touchmove', event => {
    if (!enabled() || !metrics || !drag || event.touches.length !== 1) return;
    // A drag of about one work's width carries the ribbon one work along, so the band follows the
    // finger rather than racing it.
    const travel = Math.max(metrics.cardWidth * 0.9, 120) * (cards.length - 1);
    seek(drag.progress - (event.touches[0].clientX - drag.x) / travel);
  }, { passive: true });

  const endDrag = () => { drag = null; };
  grid.addEventListener('touchend', endDrag, { passive: true });
  grid.addEventListener('touchcancel', endDrag, { passive: true });

  // Tabbing through the works must still reach every one of them, so focusing a card brings its work
  // to the middle — and pulls the band into view only if it is not already there.
  grid.addEventListener('focusin', event => {
    if (!enabled() || !metrics) return;
    const card = event.target.closest?.('.work-card');
    const index = card ? cards.findIndex(entry => entry.element === card) : -1;
    if (index < 0) return;
    const box = grid.getBoundingClientRect();
    if (box.top > window.innerHeight - 96 || box.bottom < 96) grid.scrollIntoView({ block: 'center' });
    seek(cards[index].t);
  });

  // The band is only ever worked while it is on screen, and the air is only drawn then too: with the
  // reader somewhere else on the page, nothing here runs at all.
  const observer = new IntersectionObserver(entries => {
    const next = entries[0].isIntersecting;
    if (next === stageVisible) return;
    stageVisible = next;
    if (next) {
      loadAtmosphere();
      schedule();
    } else cancel();
  }, { rootMargin: '240px' });
  observer.observe(grid);

  function invalidateGeometry() {
    needsMeasure = true;
    if (document.hidden) return;
    if (enabled() && metrics) {
      measure();
      if (atmosphere) atmosphere.resize(metrics.width, metrics.height, pixelRatio());
    }
    schedule();
  }

  function applyMode() {
    cancel();
    catalog.removeAttribute('data-motion');
    catalog.removeAttribute('data-started');
    started = false;
    metrics = null;
    // With no ribbon the work grid is the plain two-column catalogue it always was. The transforms
    // are the corridor's alone, and left behind they would displace every card in a layout they no
    // longer belong to, so they are cleared rather than merely ignored.
    if (!enabled()) {
      current.velocity = 0;
      warmth.unobserve(grid);
      for (const card of cards) {
        card.transform = '';
        card.element.style.transform = '';
        card.element.classList.remove('is-near', 'is-live');
        card.warm = false;
      }
      return;
    }

    catalog.setAttribute('data-motion', mode);
    activeIndex = -1;
    current.progress = target.progress;
    current.velocity = 0;
    warmth.observe(grid);
    // The band's own size is what the geometry is measured against, so measure only after the
    // attribute has landed. If the measurement trips over something, the band is put back rather
    // than left as ten cards stacked on one another.
    try {
      measure();
    } catch {
      catalog.removeAttribute('data-motion');
      metrics = null;
      return;
    }
    if (stageVisible) loadAtmosphere();
    if (atmosphere) {
      atmosphere.setTheme(isDark());
      atmosphere.resize(metrics.width, metrics.height, pixelRatio());
    }
    schedule();
  }

  function readMode() {
    // launcher-motion owns the pause toggle and publishes the resolved mode on <html>; when it is
    // not on the page at all, the band still has to decide for itself.
    const declared = document.documentElement.dataset.motion;
    const next = declared || (reduceMotion.matches ? 'reduced' : 'active');
    if (next === mode) return;
    mode = next;
    applyMode();
  }

  window.addEventListener('resize', invalidateGeometry, { passive: true });
  window.addEventListener('load', () => {
    invalidateGeometry();
    // Now that the page has everything it was waiting for, the band's ten bitmaps may go.
    warmPreviews();
  }, { once: true });
  document.fonts?.ready.then(invalidateGeometry);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancel();
    else invalidateGeometry();
  });

  systemDark.addEventListener('change', () => atmosphere?.setTheme(isDark()));
  new MutationObserver(() => atmosphere?.setTheme(isDark()))
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  new MutationObserver(readMode)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  reduceMotion.addEventListener('change', readMode);

  readMode();
})();
