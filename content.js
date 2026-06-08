// FeedForge v6 — content script
// Profile resolution now uses LinkedIn's GraphQL endpoint (same one MyFeedIn uses).
// This is more stable and returns structured data directly — no regex on HTML.

// ─── GraphQL profile lookup ──────────────────────────────────────────────────
// Endpoint discovered from MyFeedIn's working extension source.
// queryId is LinkedIn's internal hash — stable across sessions.
const GRAPHQL_URL = (vanity) =>
  `https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true` +
  `&variables=(vanityName:${encodeURIComponent(vanity)})` +
  `&queryId=voyagerIdentityDashProfiles.ee32334d3bd69a1900a077b5451c646a`;

function getCsrf() {
  // LinkedIn stores the CSRF token as JSESSIONID="value" (with double quotes in the cookie string).
  // This is readable by content scripts — it is NOT httpOnly on LinkedIn.
  return document.cookie.match(/JSESSIONID="([^"]+)"/)?.[1] ?? null;
}

function parseProfileResponse(json) {
  // Response shape from LinkedIn's GraphQL:
  // data.identityDashProfilesByVanityName.elements[0]
  const el =
    json?.data?.identityDashProfilesByVanityName?.elements?.[0] ??
    json?.data?.identityDashProfilesByMemberIdentity?.elements?.[0];
  if (!el) return null;

  return {
    // entityUrn looks like "urn:li:fsd_profile:ACoAA…" — the last segment is the member id
    id: el.entityUrn?.split(":").pop() ?? "",
    name: `${el.firstName ?? ""} ${el.lastName ?? ""}`.trim() || el.publicIdentifier,
    vanity: el.publicIdentifier ?? "",
    avatar: el.profilePicture?.displayImageReferenceResolutionResult
              ?.vectorImage?.artifacts?.[0]?.fileIdentifyingUrlPathSegment ?? "",
  };
}

async function fetchProfile(vanity, csrf) {
  const token = csrf ?? getCsrf();
  if (!token) return { ok: false, error: "NO_CSRF", hint: "Could not read LinkedIn session. Make sure you are logged in to LinkedIn." };

  try {
    const r = await fetch(GRAPHQL_URL(vanity), {
      method: "GET",
      credentials: "include",   // sends LinkedIn cookies automatically (same-origin)
      headers: {
        "csrf-token": token,
        "x-restli-protocol-version": "2.0.0",
        "content-type": "application/json",
      },
    });

    if (!r.ok) {
      const hint = r.status === 401 ? "Log in to LinkedIn and try again."
                 : r.status === 429 ? "LinkedIn rate-limited — wait a moment and retry."
                 : `LinkedIn returned HTTP ${r.status}.`;
      return { ok: false, error: `HTTP_${r.status}`, hint };
    }

    const json = await r.json();
    const member = parseProfileResponse(json);

    if (!member?.id) return { ok: false, error: "ID_NOT_FOUND", hint: "Profile resolved but no member id returned. Try visiting the profile page directly first." };

    // Cache so the side panel can use it instantly
    chrome.storage.local.set({ [`pfc:${vanity}`]: { ...member, ts: Date.now() } });
    return { ok: true, member };

  } catch (e) {
    return { ok: false, error: "FETCH_FAILED", hint: "Network error — are you online?" };
  }
}

// ─── Message handler ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _s, send) => {
  if (msg?.type === "FF_FETCH_PROFILE") {
    // First check cache
    const cKey = `pfc:${msg.vanity}`;
    chrome.storage.local.get(cKey, (r) => {
      const c = r[cKey];
      if (c?.id && Date.now() - c.ts < 300_000) { send({ ok: true, member: c }); return; }
      fetchProfile(msg.vanity, msg.csrf).then(send);
    });
    return true;
  }
});

// ─── Proactive cache on profile pages ────────────────────────────────────────
function currentVanity() {
  return location.pathname.match(/^\/in\/([^/?#]+)/)?.[1]
    ? decodeURIComponent(location.pathname.match(/^\/in\/([^/?#]+)/)[1])
    : null;
}

async function cacheCurrentProfile() {
  const vanity = currentVanity();
  if (!vanity) return;
  const cKey = `pfc:${vanity}`;
  const cached = (await new Promise(r => chrome.storage.local.get(cKey, r)))[cKey];
  // Skip if we have a fresh cache
  if (cached?.id && Date.now() - cached.ts < 300_000) return;
  const csrf = getCsrf();
  if (!csrf) return;
  fetchProfile(vanity, csrf); // fire and forget — result is cached inside fetchProfile
}

cacheCurrentProfile();
setTimeout(cacheCurrentProfile, 2500); // retry after React hydration

// SPA navigation
let lastPath = location.pathname;
setInterval(() => {
  if (location.pathname !== lastPath) {
    lastPath = location.pathname;
    setTimeout(cacheCurrentProfile, 1000);
  }
}, 600);

// ─── Per-post add buttons ─────────────────────────────────────────────────────
const PALETTE = ["#4F46E5","#0EA5E9","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6"];
const getFeeds = () => new Promise(r => chrome.storage.local.get({ feeds:[] }, d => r(d.feeds)));
const setFeeds = f => new Promise(r => chrome.storage.local.set({ feeds:f }, r));
const esc  = s => (s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const init = n => (n||"?").split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("")||"?";
const hue  = s => { let h=0; for(const c of s||"") h=(h*31+c.charCodeAt(0))%360; return `hsl(${h} 52% 55%)`; };

async function addToFeed(feedId, member) {
  const feeds = await getFeeds();
  const f = feeds.find(x=>x.id===feedId);
  if (!f || f.members.some(m=>m.id===member.id)) return;
  f.members.push({...member, addedAt:Date.now()});
  f.updatedAt = Date.now();
  await setFeeds(feeds);
}
async function createFeed(name) {
  const feeds = await getFeeds();
  const f = {id:crypto.randomUUID(),name:(name||"").trim()||"Untitled",
    color:PALETTE[feeds.length%PALETTE.length],members:[],createdAt:Date.now(),updatedAt:Date.now()};
  feeds.push(f); await setFeeds(feeds); return f;
}

let toastT;
function toast(txt) {
  let el = document.getElementById("ff-toast");
  if (!el) { el=document.createElement("div"); el.id="ff-toast"; document.body.appendChild(el); }
  el.textContent=txt; el.classList.add("ff-show");
  clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove("ff-show"),2600);
}

function closeMenu() {
  document.getElementById("ff-menu")?.remove();
  document.removeEventListener("click", docClick, true);
}
function docClick(e) {
  if (!e.target.closest("#ff-menu") && !e.target.closest(".ff-post-btn")) closeMenu();
}

async function showPostMenu(anchor, vanity) {
  closeMenu();
  const menu = document.createElement("div"); menu.id="ff-menu";
  const rect = anchor.getBoundingClientRect();
  menu.style.cssText=`top:${Math.min(rect.bottom+6,window.innerHeight-300)}px;left:${Math.max(4,Math.min(rect.left,window.innerWidth-248))}px`;
  document.body.appendChild(menu);
  menu.innerHTML=`<div class="ff-mload">Resolving…</div>`;
  setTimeout(()=>document.addEventListener("click",docClick,true),0);

  const res = await chrome.runtime.sendMessage({type:"FF_RESOLVE",vanity});
  if (!res?.ok) {
    menu.innerHTML=`<div class="ff-mload ff-merr">${esc(res?.hint||"Could not resolve profile.")}</div>`;
    return;
  }
  const member = res.member;
  const feeds = await getFeeds();
  menu.innerHTML=`
    <div class="ff-mhead"><div class="ff-mav" style="background:${hue(member.name)}">${esc(init(member.name))}</div><b>${esc(member.name)}</b></div>
    <div class="ff-mlist">${feeds.length
      ? feeds.map(f=>`<button class="ff-mrow" data-fid="${esc(f.id)}">
          <span class="ff-mdot" style="background:${f.color}"></span>${esc(f.name)}
          <span class="ff-mcnt">${f.members.some(m=>m.id===member.id)?"✓":f.members.length}</span>
        </button>`).join("")
      : `<div class="ff-mload">No feeds — open FeedForge panel to create one.</div>`}
    </div>
    <button class="ff-mnew" id="ff-mnew">+ New feed</button>`;

  menu.querySelectorAll(".ff-mrow").forEach(btn=>btn.onclick=async()=>{
    await addToFeed(btn.dataset.fid, member);
    closeMenu(); toast(`Added to "${feeds.find(f=>f.id===btn.dataset.fid)?.name}" ✓`);
  });
  menu.querySelector("#ff-mnew").onclick=async()=>{
    const name=prompt("Feed name:"); if(!name) return;
    const f=await createFeed(name); await addToFeed(f.id,member);
    closeMenu(); toast(`Created "${f.name}" ✓`);
  };
}

function vanityFromHref(href) {
  return (href||"").match(/\/in\/([^/?#]+)/)?.[1]
    ? decodeURIComponent((href).match(/\/in\/([^/?#]+)/)[1]) : null;
}

function injectPostButtons() {
  try {
    document.querySelectorAll('div[data-urn^="urn:li:activity"], div.feed-shared-update-v2').forEach(post=>{
      if (post.dataset.ffb) return;
      const a = post.querySelector('a[href*="/in/"]');
      const vanity = a && vanityFromHref(a.getAttribute("href"));
      if (!vanity) return;
      post.dataset.ffb="1";
      const btn = document.createElement("button");
      btn.className="ff-post-btn"; btn.title="Add to FeedForge"; btn.textContent="+";
      btn.onclick=e=>{e.preventDefault();e.stopPropagation();showPostMenu(btn,vanity);};
      (a.closest("div")||a.parentElement||post).appendChild(btn);
    });
  } catch(_) {}
}

new MutationObserver(()=>{try{injectPostButtons();}catch(_){}})
  .observe(document.documentElement,{childList:true,subtree:true});
injectPostButtons();
