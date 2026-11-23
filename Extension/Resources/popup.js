const $ = (id) => document.getElementById(id);
const UNDER = "textUnder";
const EVERY = "every";
const BUTTON = "button";

let tab = null;
let site = "";

// The page script answers if it's running in this tab: always on sites Safari lets Overhang see, and after Widen
// this page elsewhere.
async function ask() {
  try {
    return await browser.tabs.sendMessage(tab.id, { type: "state" });
  } catch {
    return null;
  }
}

// Tell the page a setting changed, then show what it did.
async function changed() {
  try {
    await browser.tabs.sendMessage(tab.id, { type: "settings" });
  } catch {
    // Not running on this page; there's nothing to update.
  }
  setTimeout(show, 300);
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function describe(state) {
  if (!state) return "Not running on this page. Widen it once, or allow Overhang on this site in Safari to have it widen every page here.";
  if (state.off) return "Not widening this site.";
  if (state.wide) return "Using the whole screen.";
  if (!state.duo) return "Nothing to do here: Safari already gives this page the whole screen.";
  if (!state.phone) return "This page isn't laid out for phones, so it's left as it is.";
  return "Waiting for the page to settle.";
}

async function show() {
  const state = await ask();
  if (state) site = state.site;
  $("site").textContent = site || "This page";
  $("status").textContent = describe(state);
  $("run").hidden = Boolean(state) || !tab;

  const saved = await browser.storage.local.get(site ? [EVERY, `off:${site}`, `on:${site}`, UNDER, BUTTON] : [EVERY, UNDER, BUTTON]);
  const every = saved[EVERY] !== false;
  $("every").checked = every;
  $("site-on").checked = every ? saved[`off:${site}`] !== true : saved[`on:${site}`] === true;
  $("site-label").textContent = every ? "On for this site" : "Widen this site anyway";
  $("site-on").disabled = !site;
  $("site-on").closest(".row").setAttribute("aria-disabled", String(!site));
  $("under").checked = saved[UNDER] === true;
  $("button").checked = saved[BUTTON] !== false;
}

$("run").addEventListener("click", async () => {
  try {
    await browser.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
  } catch {
    $("status").textContent = "Safari didn't let Overhang into this page. Pages like Safari's own and the App Store can't be changed.";
    return;
  }
  // The script widens straight away; give it a moment to report.
  setTimeout(show, 300);
});

// The site switch writes the exception to whichever way every other site goes.
$("site-on").addEventListener("change", async (event) => {
  const every = $("every").checked;
  const key = every ? `off:${site}` : `on:${site}`;
  if (event.target.checked === every) await browser.storage.local.remove(key);
  else await browser.storage.local.set({ [key]: true });
  await changed();
});

$("button").addEventListener("change", async (event) => {
  if (event.target.checked) await browser.storage.local.remove(BUTTON);
  else await browser.storage.local.set({ [BUTTON]: false });
  await changed();
});

$("every").addEventListener("change", async (event) => {
  if (event.target.checked) await browser.storage.local.remove(EVERY);
  else await browser.storage.local.set({ [EVERY]: false });
  await changed();
});

$("under").addEventListener("change", async (event) => {
  if (event.target.checked) await browser.storage.local.set({ [UNDER]: true });
  else await browser.storage.local.remove(UNDER);
  await changed();
});

(async () => {
  [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  site = hostOf(tab?.url);
  await show();
})();
