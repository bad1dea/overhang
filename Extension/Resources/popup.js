const $ = (id) => document.getElementById(id);
const UNDER = "textUnder";

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

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function describe(state) {
  if (!state) return "Not running on this page. Widen it once, or allow Overhang on this site in Safari to have it widen every page here.";
  if (state.off) return "Off for this site.";
  if (state.wide) return "Using the whole screen.";
  if (!state.duo) return "Nothing to do here: Safari already gives this page the whole screen, or its buttons are on the left.";
  if (!state.phone) return "This page isn't laid out for phones, so it's left as it is.";
  return "Waiting for the page to settle.";
}

async function show() {
  const state = await ask();
  if (state) site = state.site;
  $("site").textContent = site || "This page";
  $("status").textContent = describe(state);
  $("run").hidden = Boolean(state) || !tab;
  $("details").hidden = !state?.measured;
  if (state?.measured) {
    const m = state.measured;
    $("measured").textContent = [
      `screen ${m.screen} ${m.orientation}`,
      `shown ${m.shown} at ${m.scale}, inner ${m.inner}, layout ${m.layout}`,
      `phone ${state.phone}, duo ${state.duo}, wide ${state.wide}, off ${state.off}`,
      `${m.tags} viewport tag(s): ${m.viewport || "none"}`,
    ].join("\n");
  }

  const saved = await browser.storage.local.get(site ? [`off:${site}`, UNDER] : [UNDER]);
  $("site-on").checked = saved[`off:${site}`] !== true;
  $("site-on").disabled = !site;
  $("site-on").closest(".row").setAttribute("aria-disabled", String(!site));
  $("under").checked = saved[UNDER] === true;
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

$("site-on").addEventListener("change", async (event) => {
  if (event.target.checked) await browser.storage.local.remove(`off:${site}`);
  else await browser.storage.local.set({ [`off:${site}`]: true });
  setTimeout(show, 300);
});

$("under").addEventListener("change", async (event) => {
  if (event.target.checked) await browser.storage.local.set({ [UNDER]: true });
  else await browser.storage.local.remove(UNDER);
});

(async () => {
  [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  site = hostOf(tab?.url);
  await show();
})();
