/* Small WebP previews are real images even without JavaScript. Only nearby works get larger files. */
(() => {
  'use strict';
  const catalog = document.querySelector('.catalog');
  const grid = document.querySelector('.work-grid');
  if (!catalog || !grid) return;
  const images = [...grid.querySelectorAll('img[data-preview-srcset]')];
  if (!images.length || !window.IntersectionObserver) return;
  const states = new WeakMap();
  const visible = new Set();
  let near = false;
  let index = 0;
  const corridor = () => ['active', 'paused'].includes(catalog.dataset.motion);
  const sizes = () => corridor()
    ? '(max-width: 700px) min(560px, 92vw, 104svh), min(1000px, 76vw, 108svh)'
    : '(max-width: 640px) calc(100vw - 40px), (max-width: 900px) calc((100vw - 88px) / 2), (max-width: 1312px) calc((100vw - 144px) / 2), 584px';

  function upgrade(image) {
    if (!image || states.has(image) || document.hidden) return;
    states.set(image, 'pending');
    const preview = new Image();
    preview.decoding = 'async';
    preview.sizes = sizes();
    preview.srcset = image.dataset.previewSrcset;
    preview.src = image.src;
    // Decode separately so a slow or failed request cannot replace the usable thumbnail with a blank.
    preview.decode().then(() => {
      image.sizes = sizes();
      image.srcset = preview.srcset;
      image.dataset.imageState = 'ready';
      states.set(image, 'ready');
    }).catch(() => {
      states.set(image, 'failed');
      image.dataset.imageState = 'fallback';
    });
  }

  function warm() {
    if (document.hidden) return;
    if (corridor()) {
      if (!near) return;
      for (const offset of [0, 1, -1]) upgrade(images[index + offset]);
    } else {
      for (const image of visible) upgrade(image);
    }
  }

  new IntersectionObserver(entries => {
    near = entries.some(entry => entry.isIntersecting);
    warm();
  }, { rootMargin: '160px 0px' }).observe(grid);
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    warm();
  }, { rootMargin: '160px 0px' });
  images.forEach(image => observer.observe(image));
  document.addEventListener('windplay:previewchange', event => {
    if (!Number.isInteger(event.detail) || event.detail < 0 || event.detail >= images.length) return;
    index = event.detail;
    warm();
  });
  new MutationObserver(() => {
    for (const image of images) if (states.get(image) === 'ready') image.sizes = sizes();
    warm();
  }).observe(catalog, { attributes: true, attributeFilter: ['data-motion'] });
  document.addEventListener('visibilitychange', warm);
})();
