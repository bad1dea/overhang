// Overhang's page script. The layout work is Brim's (github.com/AVGVSTVS96/brim, commit de0422f, MIT, see
// LICENSE); the per-site switch, the text setting and the messages for the panel are Overhang's.
//
// On the iPhone Duo's front screen Safari keeps its buttons in an 84-point column along the right and lays pages out
// beside it (377 of 461 points on our Duo, 382 of 466 on others, 594 of 678 on its side). This lays pages out the
// full width, so pictures, cards, grids, headers and bars use the whole screen, and running text wraps at the column
// unless you let it run under the buttons.
//
// It runs at document_start on sites Safari lets it see, or once on the current page when you tap Widen in the
// panel (popup.js injects it with scripting.executeScript). Either way it only reads where things sit on the page,
// and it never makes a network request.
(() => {
  if (globalThis.overhang) return;
  globalThis.overhang = true;

  const COLUMN = 84; // points Safari keeps for its buttons
  const GAP = 6; // points between the buttons and what you read or tap
  // Widths Safari has been seen to show beside its column. They differ between phones (382 of 466 on Brim's and
  // Splay's Duos, 377 of 461 on ours with Shift Display for a case on), so they're only used when the screen size
  // can't be trusted. 589 is the guess for that shift on its side.
  const SHOWN = [377, 382, 589, 594];

  const CONTROLS =
    'a[href],button,input,label,select,textarea,summary,[role="button"],[role="link"],[role="menuitem"],[role="tab"],[onclick]';

  const root = document.documentElement;
  const site = location.hostname;
  // Every site is widened unless EVERY is false. Either way a site can be the exception: off:<site> while every site
  // is widened, on:<site> while none are.
  const EVERY = "every";
  const OFF = `off:${site}`;
  const ON = `on:${site}`;
  const UNDER = "textUnder";
  const BUTTON = "button";
  const KEYS = [EVERY, OFF, ON, UNDER, BUTTON];
  const saved = {};

  const settings = { off: false, under: false, loaded: false };

  const style = document.createElement("style");

  // The page is wider than the part Safari counts as shown, so a sideways drag would slide it under the column. Every
  // box takes only drags up and down and pinches, as a page's own setting doesn't say otherwise (WebKit starts afresh
  // in each box that scrolls, so the root alone isn't enough), except rows that scroll sideways and what's in them,
  // which keep a sideways drag to themselves rather than pass it on to the page at their ends.
  style.textContent = `:where(html[data-overhang],html[data-overhang] *){touch-action:pan-y pinch-zoom}
:where(html[data-overhang] [data-overhang-row],html[data-overhang] [data-overhang-row] *){touch-action:auto}
html[data-overhang] [data-overhang-row]{overscroll-behavior-x:contain}
html[data-overhang]{overscroll-behavior-x:none!important}
html[data-overhang]::-webkit-scrollbar:horizontal{display:none}`;

  let tags = []; // the page's viewport tags
  let phone = false; // the page is laid out for phones (device-width)
  let full = 0; // the screen's width while the page is widened, else 0
  let left = false; // Safari's column is on the left (on its side, camera on the left)

  const extra = (width) => `, width=${width}, height=device-height, initial-scale=1, minimum-scale=1`;
  const EXTRA = new RegExp(extra("\\d+"), "g");

  // What the page itself asked of a tag, and what we put in it. Some pages (Amazon) write back what they read, our
  // settings included, which are taken off again rather than added to.
  const own = (tag) => tag.content.replace(EXTRA, "");
  const want = (tag) => own(tag) + (full ? extra(full) : "");

  // The screen's width when Safari has its column beside the page, else 0. Safari has its column when the screen is
  // the column's width wider than what it shows, which holds whatever the screen's size (Shift Display for a case
  // takes a few points off it). The shown width is scaled, so a pinch on another phone never reads as the Duo's.
  // Private Browsing's fingerprinting protection reports a made-up screen size; then the shown width is checked
  // against the ones seen on Duos. On its side with the camera on the left (landscape-primary) the column is on the
  // left.
  function wide() {
    const type = screen.orientation.type;
    const across = type.startsWith("landscape")
      ? Math.max(screen.width, screen.height)
      : Math.min(screen.width, screen.height);
    const shown = visualViewport.width * visualViewport.scale;

    if (Math.abs(across - shown - COLUMN) < 2) return across;

    return SHOWN.some((width) => Math.abs(shown - width) < 1) ? Math.round(shown) + COLUMN : 0;
  }

  // The viewport tag decides the layout's width before anything is laid out, and our settings come last, so they win
  // over the page's own.
  function widen() {
    full = phone && !settings.off ? wide() : 0;
    left = screen.orientation.type === "landscape-primary";

    for (const tag of tags) if (tag.content !== want(tag)) tag.content = want(tag);

    root.toggleAttribute("data-overhang", Boolean(full));

    if (!style.isConnected) root.append(style);

    place();
    later(0);
  }

  // Pages that set their viewport tag again from script get it widened again. Safari goes by the tag it read last,
  // and some pages (Next.js) add a second one after their first, so every tag carries our settings and the newest
  // says whether the page is laid out for phones.
  function adopt() {
    const found = [...document.querySelectorAll('meta[name="viewport"]')];

    if (found.length === tags.length && found.every((tag, i) => tag === tags[i] && tag.content === want(tag))) return;
    tags = found;
    phone = tags.length > 0 && /device-width/.test(own(tags.at(-1)));
    widen();
  }

  // Every change is an inline style that can be taken back.
  let changes = []; // [element, property, the page's own value]
  let sliding = []; // rows that scroll sideways

  function set(el, property, value, priority = "important") {
    changes.push([el, property, el.style.getPropertyValue(property)]);
    el.style.setProperty(property, value, priority);
  }

  function undo() {
    for (const el of sliding) el.removeAttribute("data-overhang-row");
    sliding = [];

    for (const [el, property, value] of changes.toReversed())
      if (value) el.style.setProperty(property, value);
      else el.style.removeProperty(property);
    changes = [];
  }

  // Everything below measures across the page toward the column, so one set of rules serves both sides: with the
  // column on the left a box is mirrored, measured from the page's right edge (Splay does the same).
  function box(el) {
    const r = el.getBoundingClientRect();

    if (!left) return r;
    const x = root.getBoundingClientRect().left;

    return { left: full - (r.right - x), right: full - (r.left - x), top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  }

  const facing = () => (left ? "Left" : "Right"); // the side of a box that faces the column

  // The page is laid out the full width and shown unzoomed, the part beside the column counted as shown (see wide).
  const fits = () => full && root.clientWidth === full && Math.abs(visualViewport.width + COLUMN - full) <= 2;

  // While Safari's sizes are briefly off (they are, mid-scroll, as its bars move), the last pass's changes stay as
  // they are and the pass is tried again shortly. Taking them off in between made text and pictures jump between the
  // two layouts while scrolling. If the sizes stay off for a couple of seconds (a pinch, a turn of the phone) the
  // changes are taken off.
  let misses = 0;
  let missed = "";

  function arrange() {
    if (!full || !document.body) return undo();

    if (!fits()) {
      misses += 1;
      missed = `${visualViewport.width}+${COLUMN} vs ${full}, layout ${root.clientWidth}`;

      if (misses % 8 === 0) undo();

      return later();
    }
    undo();
    const edge = full - COLUMN - GAP;
    // Everything is measured before anything is written, so the page is laid out once.
    const found = { blocks: new Map(), rows: [] };
    walk(document.body, edge, found, { inside: false, block: null });

    if (!settings.under)
      for (const [el, padding] of found.blocks)
        if (!within(el, found.blocks)) set(el, `padding-${facing().toLowerCase()}`, `${padding}px`);

    for (const el of found.rows) el.setAttribute("data-overhang-row", "");
    sliding = found.rows;

    observer.takeRecords(); // our own changes aren't the page's
    home();
  }

  // Safari counts only the part beside the column as shown, so it lets the page slide that far sideways. A page that
  // scrolls itself there (Google's results) or opens at its right edge (right-to-left pages) is put back, once no
  // finger is on it (put back under a finger, a page that lets itself be dragged sideways shook) and nothing is being
  // typed (Safari slides the page to keep the caret in sight). With the column on the left, Safari shows the page
  // from beside the column and the extra width lands off the right edge, so the page rests scrolled by the column's
  // width, which brings its left edge under the column.
  let touches = 0;

  function home() {
    let focused = document.activeElement;

    while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement;

    const typing = focused?.matches("input,textarea,[contenteditable]:not([contenteditable=false])");

    const rest = left ? COLUMN / visualViewport.scale : 0;

    if (!touches && !typing && fits() && Math.abs(scrollX - rest) > 0.5)
      scrollBy({ left: rest - scrollX, top: 0, behavior: "instant" });
  }

  // One pass down the page. Each block holding text reaching past the edge stops its lines there. Headers, fixed bars
  // and buttons are left as the page lays them out, full width: Brim moved them in beside the column so they stayed
  // tappable, but that made every header widen and then shrink back as the page loaded.
  function walk(el, edge, found, { inside, block }) {
    const css = getComputedStyle(el);

    if (css.display === "none") return;
    const r = box(el);
    const over = r.right - edge;

    const bar = /fixed|sticky/.test(css.position) || el.tagName === "IFRAME";

    if (/auto|scroll/.test(css.overflowX) && el.scrollWidth > el.clientWidth + 1) return void found.rows.push(el);

    const control = over > 0 && r.width < root.clientWidth * 0.4 && el.matches(CONTROLS);

    // The block whose lines this element's text runs in: itself, or for inline text the block around it. Once a
    // block's lines stop at the edge, so do those of everything inside it. Text in a bar, or in a control that is a
    // box of its own rather than words in a line, is left alone (Chase's "Sign in", narrowed, broke into a letter or
    // two a line).
    const holder = /^inline|^contents$/.test(css.display) ? block : el;
    const text = [...el.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.data.trim());
    const whole = bar || (control && css.display !== "inline");

    if (text && holder && !inside && !whole) {
      const css = getComputedStyle(holder);
      const side = facing();
      const by = box(holder).right - parseFloat(css[`border${side}Width`]) - parseFloat(css[`padding${side}`]) - edge;

      if (by > 0) found.blocks.set(holder, parseFloat(css[`padding${side}`]) + by);
    }

    // Web components (Reddit's) lay out their own open shadow trees, with the page's elements placed in them.
    for (const child of [...(el.shadowRoot?.children ?? []), ...el.children])
      walk(child, edge, found, { inside: inside || whole || (text && Boolean(holder)), block: holder });
  }

  // The box around an element, across the edge of a shadow tree.
  const up = (el) => el.parentElement ?? el.parentNode?.host;

  function within(el, boxes) {
    for (let e = up(el); e; e = up(e)) if (boxes.has(e)) return true;

    return false;
  }

  // A pass runs shortly after the page changes, and at most that often while it keeps changing. (Brim waited for the
  // page to stop changing, but Kotaku never stops while it's scrolled, and its header, put back as it scrolls, then
  // stayed under the column.)
  let timer = 0;
  let due = Infinity;

  function later(delay = 120) {
    const at = performance.now() + delay;

    if (timer && at >= due) return;
    clearTimeout(timer);
    due = at;
    timer = setTimeout(() => {
      timer = 0;
      due = Infinity;
      requestAnimationFrame(arrange);
    }, delay);
  }

  const observer = new MutationObserver(() => {
    adopt();

    if (full) later();
  });

  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["content", "class"] });

  // A round button in the gap between Safari's column buttons that switches widening for this site. Safari has no way
  // for an extension to add a button to its column, so this one is drawn on the page, which reaches under the column
  // once widened. In portrait it sits just above New Tab, as Widen's does: a Live Activity pushes Back and Bookmarks
  // about 85 points down, but not New Tab. On its side it sits in the gap between the column's top and middle
  // buttons. When the site isn't widened the page doesn't reach under the column, so it waits at the page's edge.
  // Heights were measured from screenshots of Safari on a Duo and from Splay's measurements.
  const TOP = { portrait: 505, "landscape-secondary": 207, "landscape-primary": 260 }; // the button's center, points
  const SIZE = 48; // Safari's own column buttons, measured
  const UNDER_COLUMN = 24; // from the screen's edge, which centers it on Safari's buttons
  const BESIDE = 8; // from the page's edge, when the page doesn't reach under the column

  // Drawn like Safari's column buttons, light or dark with the phone, so it looks like one of them. The icon shows
  // what a tap does: spread the page out, or bring it back in.
  const WIDEN = '<path d="M3.5 12h17M7.5 8l-4 4 4 4M16.5 8l4 4-4 4"/>';
  const NARROW = '<path d="M12 5v14M3 12h6M6 9l3 3-3 3M21 12h-6M18 9l-3 3 3 3"/>';

  const host = document.createElement("overhang-button");
  const shadow = host.attachShadow({ mode: "closed" });

  shadow.innerHTML = `<style>
:host{all:initial;position:fixed;z-index:2147483647;width:${SIZE}px;height:${SIZE}px}
button{all:unset;box-sizing:border-box;width:100%;height:100%;border-radius:50%;display:grid;place-items:center;
  background:rgba(250,250,252,.78);color:#000;border:.5px solid rgba(0,0,0,.1);
  -webkit-backdrop-filter:blur(20px) saturate(1.8);backdrop-filter:blur(20px) saturate(1.8);
  box-shadow:0 1px 8px rgba(0,0,0,.12);-webkit-tap-highlight-color:transparent;touch-action:manipulation;cursor:pointer}
@media (prefers-color-scheme:dark){button{background:rgba(28,28,30,.78);color:#fff;border-color:rgba(255,255,255,.14)}}
button:active{transform:scale(.9)}
svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
</style><button type="button"><svg viewBox="0 0 24 24"></svg></button>`;
  const button = shadow.querySelector("button");
  const icon = shadow.querySelector("svg");

  function place() {
    const duo = phone && wide();

    if (!duo || saved[BUTTON] === false) return void host.remove();
    const type = screen.orientation.type;
    const top = TOP[type.startsWith("portrait") ? "portrait" : type] - SIZE / 2;
    const css = host.style;

    css.setProperty("top", `${top}px`, "important");
    css.setProperty(left ? "left" : "right", `${full ? UNDER_COLUMN : BESIDE}px`, "important");
    css.setProperty(left ? "right" : "left", "auto", "important");
    icon.innerHTML = full ? NARROW : WIDEN;
    button.setAttribute("aria-label", full ? "Stop widening this site" : "Widen this site");

    if (!host.isConnected) root.append(host);
  }

  // The tap writes the exception to whichever way every other site goes (see EVERY), and takes effect here at once.
  // Under Safari's column iOS doesn't send a touch to the element under the finger (a button there showed but
  // didn't answer), so every touch and click on the page is checked against where the button is drawn. Both a
  // touchend and the click after it can arrive; the second is ignored.
  let tapped = 0;
  let lastTap = "";

  function toggle(event) {
    event.preventDefault();
    event.stopPropagation();

    if (performance.now() - tapped < 500) return;
    tapped = performance.now();
    const every = saved[EVERY] !== false;
    const key = every ? OFF : ON;
    const value = every ? !settings.off : settings.off;

    saved[key] = value || undefined;
    apply();

    if (value) browser.storage.local.set({ [key]: true });
    else browser.storage.local.remove(key);
  }

  function onButton(x, y) {
    if (!host.isConnected) return false;
    const r = host.getBoundingClientRect();

    return x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6;
  }

  function heard(event, x, y) {
    const r = host.isConnected ? host.getBoundingClientRect() : null;
    const target = event.target?.tagName?.toLowerCase() ?? "?";

    lastTap = `${event.type} at ${Math.round(x)},${Math.round(y)} on ${target}` +
      (r ? `, button ${Math.round(r.left)},${Math.round(r.top)}` : "");

    if (onButton(x, y)) toggle(event);
  }

  addEventListener(
    "touchend",
    (event) => {
      const touch = event.changedTouches[0];

      if (touch) heard(event, touch.clientX, touch.clientY);
    },
    { capture: true, passive: false },
  );
  addEventListener("click", (event) => heard(event, event.clientX, event.clientY), true);

  function apply() {
    settings.off = saved[EVERY] === false ? saved[ON] !== true : saved[OFF] === true;
    settings.under = saved[UNDER] === true;
    widen();
  }

  // Storage answers after the page has started, so the page is widened straight away and put back if this site is
  // switched off. Waiting instead would let Safari lay the page out narrow first on every site.
  adopt();

  browser.storage.local
    .get(KEYS)
    .then((values) => {
      Object.assign(saved, values);
      settings.loaded = true;
      apply();
    })
    .catch(() => {
      settings.loaded = true;
    });

  browser.storage.onChanged.addListener((change, area) => {
    if (area !== "local" || !KEYS.some((key) => key in change)) return;

    for (const key of KEYS) if (key in change) saved[key] = change[key].newValue;
    apply();
  });

  // The panel asks what's going on in this tab, and says when it has changed a setting: Safari doesn't always pass
  // storage.onChanged on to a page script, so the page would otherwise only notice on its next load.
  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === "settings")
      return browser.storage.local.get(KEYS).then((values) => {
        for (const key of KEYS) saved[key] = values[key];
        apply();
      });

    if (message?.type !== "state") return;

    return Promise.resolve({
      site,
      phone,
      duo: Boolean(wide()),
      wide: Boolean(full),
      off: settings.off,
      // What Safari reports, shown in the panel's details line, for working out pages that don't widen.
      measured: {
        screen: `${screen.width}x${screen.height}`,
        orientation: screen.orientation.type,
        shown: `${Math.round(visualViewport.width * 10) / 10}x${Math.round(visualViewport.height * 10) / 10}`,
        scale: Math.round(visualViewport.scale * 1000) / 1000,
        inner: `${innerWidth}x${innerHeight}`,
        layout: root.clientWidth,
        column: left ? "left" : "right",
        scrollX: Math.round(scrollX),
        misses,
        lastTap,
        missed,
        tags: tags.length,
        viewport: tags.at(-1)?.content ?? "",
      },
    });
  });

  addEventListener("resize", widen);

  // Safari can settle the width it shows only after a page has started, once the script has looked.
  // Checked once the resize has settled, so a moment mid-scroll can't narrow the page and widen it again.
  let settling = 0;

  visualViewport.addEventListener("resize", () => {
    clearTimeout(settling);
    settling = setTimeout(() => phone && wide() !== full && widen(), 300);
  });

  visualViewport.addEventListener("scroll", home);

  for (const type of ["touchstart", "touchend", "touchcancel"])
    addEventListener(
      type,
      (event) => {
        touches = event.touches.length;
        home();
      },
      { capture: true, passive: true },
    );

  screen.orientation.addEventListener("change", widen);

  addEventListener("load", () => later(0));
})();
