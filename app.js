const lightbox = document.querySelector('#lightbox');
const image = document.querySelector('#lightbox-image');
const caption = document.querySelector('#lightbox-caption');
let opener;
document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-lightbox]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || typeof lightbox.showModal !== 'function') return;
  event.preventDefault();
  opener = link.closest('[aria-hidden="true"]') ? document.querySelector('.motion-toggle') : link;
  const thumbnail = link.querySelector('img');
  image.src = link.href;
  image.alt = thumbnail.alt;
  caption.textContent = `${thumbnail.alt} — fot. Krystian Pakieła`;
  lightbox.showModal();
});
document.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', (event) => { if (event.target === lightbox) lightbox.close(); });
lightbox.addEventListener('close', () => { image.removeAttribute('src'); opener?.focus({ preventScroll: true }); });

// Keep the photo preview discoverable while offering explicit motion controls.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const teaser = document.querySelector('.gallery-teaser');
const preview = document.querySelector('.preview-window');
const previewGroup = document.querySelector('.preview-group');
const motionToggle = document.querySelector('.motion-toggle');
const gallery = document.querySelector('.full-gallery');
gallery.querySelector('.gallery-count').textContent = `${gallery.querySelectorAll('.jewelry-archive').length} fotografii do obejrzenia`;
let photosPaused = reducedMotion.matches;
// iPadOS/Safari can flash while compositing a continuously moving, duplicated
// image strip. Touch devices get a stable, native scrollable contact sheet.
const touchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches || navigator.maxTouchPoints > 1;
if (touchDevice) {
  document.documentElement.classList.add('touch-gallery');
  // Keep every tile visible to Safari without its unstable CSS columns.
  document.querySelectorAll('.archive-grid a').forEach(link => {
    link.style.contentVisibility = 'visible';
    link.style.containIntrinsicSize = 'auto';
  });
}
if (!touchDevice && !reducedMotion.matches) {
  const duplicate = previewGroup.cloneNode(true);
  duplicate.setAttribute('aria-hidden', 'true');
  duplicate.querySelectorAll('a').forEach(link => link.tabIndex = -1);
  previewGroup.parentNode.append(duplicate);
}
function updatePhotoMotion() {
  const motionUnavailable = reducedMotion.matches || touchDevice;
  teaser.classList.toggle('is-paused', photosPaused || motionUnavailable);
  motionToggle.setAttribute('aria-pressed', String(photosPaused || motionUnavailable));
  motionToggle.textContent = motionUnavailable ? 'Przesuń zdjęcia palcem lub gładzikiem' : photosPaused ? 'Wznów ruch zdjęć' : 'Wstrzymaj ruch zdjęć';
  motionToggle.disabled = motionUnavailable;
}
motionToggle.addEventListener('click', () => { photosPaused = !photosPaused; updatePhotoMotion(); });
new IntersectionObserver(([entry]) => {
  preview.dataset.moving = String(entry.isIntersecting && !document.hidden);
}, { threshold: 0.1 }).observe(preview);
gallery.addEventListener('toggle', () => {
  gallery.querySelector('.gallery-action').textContent = gallery.open ? 'Zwiń galerię' : 'Rozwiń całą galerię';
});
updatePhotoMotion();

// Autoplay only visible videos. Native controls retain pause, sound and fullscreen.
const videos = [...document.querySelectorAll('.portfolio-video')];
const visibleVideos = new Set();
const manuallyPaused = new WeakSet();
const explicitPlay = new WeakSet();
function synchronizeVideos() {
  for (const video of videos) {
    const shouldPlay = visibleVideos.has(video) && !document.hidden && !lightbox.open && !manuallyPaused.has(video) && (!reducedMotion.matches || explicitPlay.has(video));
    if (shouldPlay) video.play().catch(() => {});
    else video.pause();
  }
}
for (const video of videos) {
  video.muted = true;
  video.addEventListener('pause', () => {
    if (visibleVideos.has(video) && !document.hidden && !lightbox.open && !reducedMotion.matches && !video.ended) manuallyPaused.add(video);
  });
  video.addEventListener('play', () => { manuallyPaused.delete(video); explicitPlay.add(video); });
  video.addEventListener('volumechange', () => {
    if (!video.muted) for (const other of videos) if (other !== video) other.muted = true;
  });
}
const videoObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting && entry.intersectionRatio >= 0.12) visibleVideos.add(entry.target);
    else visibleVideos.delete(entry.target);
  }
  synchronizeVideos();
}, { threshold: [0, 0.12] });
videos.forEach(video => videoObserver.observe(video));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) preview.dataset.moving = 'false';
  else preview.dataset.moving = 'true';
  synchronizeVideos();
});
new MutationObserver(synchronizeVideos).observe(lightbox, { attributes: true, attributeFilter: ['open'] });
reducedMotion.addEventListener('change', () => {
  photosPaused = reducedMotion.matches;
  if (reducedMotion.matches) videos.forEach(video => explicitPlay.delete(video));
  updatePhotoMotion();
  synchronizeVideos();
});

// Optional service sections stay quiet until a visitor asks for the details.
const offerSections = [...document.querySelectorAll('[data-collapsible]')];
function setOfferState(section, open, focusToggle = false) {
  const toggle = section.querySelector('.offer-toggle');
  section.classList.toggle('is-collapsed', !open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.querySelector('strong').firstChild.textContent = open
    ? (section.id === 'strategia' ? 'Zwiń strategię ' : 'Zwiń abonament ')
    : (section.id === 'strategia' ? 'Rozwiń strategię ' : 'Rozwiń abonament ');
  if (focusToggle) toggle.focus({ preventScroll: true });
}
for (const section of offerSections) {
  section.querySelector('.offer-toggle').addEventListener('click', () => {
    setOfferState(section, section.classList.contains('is-collapsed'));
  });
}
for (const link of document.querySelectorAll('.offer-navigation a')) {
  link.addEventListener('click', () => {
    const target = document.querySelector(link.hash);
    if (target?.matches('[data-collapsible]')) setOfferState(target, true);
  });
}
