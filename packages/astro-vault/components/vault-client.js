// @ts-check
/**
 * Browser behaviour of the built-in layout, loaded once by VaultLayout:
 *
 * - keeps the persisted sidebar in sync with the current note after a
 *   client-side navigation (ClientRouter swaps the page but not the sidebar);
 * - previews the linked note when hovering a wikilink, when the page has
 *   `data-vault-previews` on <body>.
 */

const normalise = (/** @type {string} */ path) => decodeURI(path).replace(/\/+$/, '') || '/';

function syncSidebar() {
  const current = normalise(location.pathname);
  for (const link of document.querySelectorAll('.vault-sidebar a[href]')) {
    if (!(link instanceof HTMLAnchorElement) || link.classList.contains('vault-brand')) continue;
    if (normalise(new URL(link.href).pathname) !== current) {
      link.removeAttribute('aria-current');
      continue;
    }
    link.setAttribute('aria-current', 'page');
    for (let folder = link.closest('details'); folder; folder = folder.parentElement?.closest('details') ?? null) {
      folder.open = true;
    }
    const sidebar = link.closest('.vault-sidebar');
    if (sidebar) {
      const box = link.getBoundingClientRect();
      const frame = sidebar.getBoundingClientRect();
      if (box.top < frame.top || box.bottom > frame.bottom) link.scrollIntoView({ block: 'nearest' });
    }
  }
}

// Fired on the first load and after every client-side navigation.
document.addEventListener('astro:page-load', syncSidebar);

/* Wikilink previews */

/** @type {Map<string, Promise<{ title: string, body: DocumentFragment } | null>>} */
const cache = new Map();
/** @type {HTMLElement | null} */
let card = null;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let showTimer;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let hideTimer;
/** @type {HTMLAnchorElement | null} */
let active = null;

/** @param {string} url */
function load(url) {
  const key = url.split('#')[0] ?? url;
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(key)
        .then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
        .then((html) => {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const prose = doc.querySelector('.vault-prose');
          if (!prose) return null;
          const body = document.createDocumentFragment();
          for (const node of Array.from(prose.children)) body.append(document.importNode(node, true));
          return { title: doc.querySelector('.vault-title')?.textContent?.trim() ?? '', body };
        })
        .catch(() => null)
    );
  }
  return /** @type {Promise<{ title: string, body: DocumentFragment } | null>} */ (cache.get(key));
}

function ensureCard() {
  if (card?.isConnected) return card;
  card = document.createElement('div');
  card.className = 'vault-preview';
  card.setAttribute('role', 'tooltip');
  card.hidden = true;
  card.addEventListener('pointerenter', () => clearTimeout(hideTimer));
  card.addEventListener('pointerleave', scheduleHide);
  document.body.append(card);
  return card;
}

function hide() {
  clearTimeout(showTimer);
  active = null;
  if (card) card.hidden = true;
}

function scheduleHide() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hide, 180);
}

/** @param {HTMLAnchorElement} link */
async function show(link) {
  const note = await load(link.href);
  if (!note || active !== link) return;
  const el = ensureCard();
  el.replaceChildren();
  const title = document.createElement('p');
  title.className = 'vault-preview-title';
  title.textContent = note.title;
  const body = document.createElement('div');
  body.className = 'vault-prose vault-preview-body';
  body.append(note.body.cloneNode(true));
  el.append(title, body);
  el.hidden = false;

  // A link to a heading starts the preview at that heading.
  const hash = new URL(link.href).hash.slice(1);
  if (hash) {
    const target = body.querySelector(`[id="${CSS.escape(decodeURIComponent(hash))}"]`);
    if (target instanceof HTMLElement) body.scrollTop = target.offsetTop - body.offsetTop;
  }

  const box = link.getBoundingClientRect();
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  const left = Math.min(Math.max(8, box.left), window.innerWidth - width - 8);
  const below = box.bottom + 8 + height < window.innerHeight;
  el.style.left = `${left + window.scrollX}px`;
  el.style.top = `${(below ? box.bottom + 8 : box.top - height - 8) + window.scrollY}px`;
}

const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');

document.addEventListener('pointerover', (event) => {
  if (!canHover.matches || !document.body.hasAttribute('data-vault-previews')) return;
  const link = event.target instanceof Element ? event.target.closest('a.wikilink') : null;
  if (!(link instanceof HTMLAnchorElement)) return;
  if (normalise(new URL(link.href).pathname) === normalise(location.pathname)) return;
  clearTimeout(hideTimer);
  if (active === link) return;
  clearTimeout(showTimer);
  active = link;
  showTimer = setTimeout(() => show(link), 350);
});

document.addEventListener('pointerout', (event) => {
  const link = event.target instanceof Element ? event.target.closest('a.wikilink') : null;
  if (link && link === active) scheduleHide();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hide();
});

document.addEventListener('astro:before-swap', hide);
