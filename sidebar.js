/* FeedForge v7 — floating sidebar injected into LinkedIn pages
   Uses Shadow DOM for full CSS isolation from LinkedIn's styles. */
(function () {
  "use strict";
  if (document.getElementById("__ff_host")) return; // already injected

  // ── state ─────────────────────────────────────────────────────────────────
  const PALETTE = ["#4F46E5","#0EA5E9","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6"];
  let FEEDS = [], MAX = 28, openId = null, search = "", isOpen = true;

  // ── shadow DOM setup ──────────────────────────────────────────────────────
  const host = document.createElement("div");
  host.id = "__ff_host";
  host.style.cssText = "position:fixed;top:0;right:0;height:100vh;width:0;z-index:2147483000;pointer-events:none;";
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });



  // ── CSS ───────────────────────────────────────────────────────────────────
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    :host { all: initial; display: block; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif !important; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    input, button, select, textarea { font-family: inherit !important; }
    ::-webkit-scrollbar { width: 9px; }
    ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 9px; border: 2px solid #f7f7fb; }

    /* ── root panel ── */
    #ff-panel {
      position: fixed; top: 0; right: 0; height: 100vh; width: 440px;
      display: flex; flex-direction: row;
      transform: translateX(0);
      transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: all;
      filter: drop-shadow(-4px 0 20px rgba(20,20,43,0.14));
    }
    #ff-panel.ff-min { transform: translateX(440px); }

    /* ── collapse tab — minimal floating pill ── */
    #ff-tab {
      position: absolute; left: -30px; top: 50%; transform: translateY(-50%);
      width: 30px; height: 56px;
      background: #fff;
      border: 1px solid #e0e0ea;
      border-right: none;
      border-radius: 11px 0 0 11px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      box-shadow: -3px 0 10px rgba(20,20,43,0.10);
      transition: background 0.12s, box-shadow 0.12s;
      user-select: none;
      z-index: 10;
      flex-shrink: 0;
    }
    #ff-tab:hover { background: #f4f4f9; box-shadow: -4px 0 14px rgba(20,20,43,0.15); }
    .ff-tab-logo { display: none; }
    .ff-tab-label { display: none; }
    .ff-tab-arrow {
      color: #5a5a6b; font-size: 14px; line-height: 1;
      transition: transform 0.22s;
    }
    #ff-panel.ff-min .ff-tab-arrow { transform: rotate(180deg); }

    /* ── main content ── */
    #ff-main {
      flex: 1; background: #f7f7fb; display: flex; flex-direction: column;
      overflow: hidden; min-width: 0; position: relative; width: 100%;
    }

    /* ── search overlay ── */
    #ff-search-overlay {
      position: absolute; inset: 0; background: #f7f7fb; z-index: 30;
      display: flex; flex-direction: column;
      animation: ff-slide-up 0.18s ease;
    }
    @keyframes ff-slide-up { from { opacity: 0; transform: translateY(8px); } }
    .ff-so-head {
      display: flex; align-items: center; gap: 11px; padding: 15px 15px 13px;
      background: #fff; border-bottom: 1px solid #ececf3; flex-shrink: 0;
    }
    .ff-so-back {
      border: none; background: #f4f4f9; color: #16161d; cursor: pointer;
      width: 37px; height: 37px; border-radius: 10px; font-size: 20px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
    }
    .ff-so-back:hover { background: #ececf3; }
    .ff-so-title { font-weight: 700; font-size: 17px; }
    .ff-so-searchbar {
      display: flex; align-items: center; gap: 10px; margin: 14px 16px;
      background: #fff; border: 1px solid #ececf3; border-radius: 11px; padding: 0 15px;
      flex-shrink: 0;
    }
    .ff-so-searchbar svg { width: 18px; height: 18px; color: #9494a4; flex-shrink: 0; }
    #ff-so-input {
      flex: 1; border: none; background: transparent; outline: none;
      padding: 12px 0; font-size: 16px; font-family: inherit; color: #16161d; min-width: 0;
    }
    #ff-so-results { flex: 1; overflow-y: auto; padding: 0 11px 13px; }
    .ff-sr-msg { padding: 17px 15px; font-size: 15px; color: #9494a4; text-align: center; }
    .ff-sr-item {
      display: flex; align-items: center; gap: 13px; padding: 12px 11px;
      border-radius: 11px; cursor: pointer;
    }
    .ff-sr-item:hover { background: #fff; }
    .ff-sr-av {
      width: 45px; height: 45px; border-radius: 50%; flex-shrink: 0;
      color: #fff; font-size: 15px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      background-size: cover; background-position: center;
    }
    .ff-sr-info { flex: 1; min-width: 0; }
    .ff-sr-name { font-size: 16px; font-weight: 600; color: #16161d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ff-sr-deg { font-size: 12px; font-weight: 600; color: #4f46e5; background: rgba(79,70,229,.1); padding: 2px 6px; border-radius: 5px; margin-left: 6px; }
    .ff-sr-head { font-size: 13px; color: #5a5a6b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
    .ff-sr-add {
      border: none; background: #4f46e5; color: #fff; cursor: pointer;
      width: 37px; height: 37px; border-radius: 10px; font-size: 22px; line-height: 1;
      flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    }
    .ff-sr-add:hover { filter: brightness(1.1); }
    .ff-sr-add.ff-done { background: #10b981; cursor: default; }
    .ff-spin {
      display: inline-block; width: 17px; height: 17px; border: 2px solid #e0e0ea;
      border-top-color: #4f46e5; border-radius: 50%; animation: ff-spin 0.7s linear infinite;
      vertical-align: middle; margin-right: 8px;
    }
    @keyframes ff-spin { to { transform: rotate(360deg); } }
    .ff-tool.ff-t-add { background: rgba(79,70,229,.1); color: #4f46e5; border-color: transparent; font-weight: 650; }
    .ff-tool.ff-t-add:hover { background: rgba(79,70,229,.18); }

    /* ── top bar ── */
    .ff-bar {
      display: flex; align-items: center; gap: 10px; padding: 13px 14px;
      background: #fff; border-bottom: 1px solid #ececf3; flex-shrink: 0;
    }
    .ff-brand { font-weight: 800; font-size: 17px; white-space: nowrap; color: #16161d; }
    .ff-search-wrap { position: relative; flex: 1; }
    .ff-search-ic { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #9494a4; width: 17px; height: 17px; }
    #ff-q {
      width: 100%; border: 1px solid #ececf3; background: #f7f7fb;
      border-radius: 10px; padding: 10px 12px 10px 36px; font-size: 15px;
      font-family: inherit; color: #16161d; outline: none;
    }
    #ff-q:focus { border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79,70,229,.09); }
    #ff-btn-new {
      background: #4f46e5; color: #fff; border: none; border-radius: 10px;
      padding: 10px 14px; font-size: 15px; font-weight: 650; cursor: pointer;
      font-family: inherit; white-space: nowrap;
    }
    #ff-btn-new:hover { filter: brightness(1.08); }

    /* ── feed list ── */
    #ff-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 7px; }
    .ff-feed {
      background: #fff; border: 1px solid #ececf3; border-radius: 13px; overflow: hidden;
      transition: box-shadow 0.13s;
    }
    .ff-feed:hover { box-shadow: 0 3px 12px rgba(20,20,43,.07); }
    .ff-feed.ff-open { border-color: rgba(79,70,229,.25); box-shadow: 0 5px 18px rgba(79,70,229,.1); }
    .ff-frow { display: flex; align-items: center; gap: 11px; padding: 14px 15px; cursor: pointer; }
    .ff-fdot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
    .ff-fname { font-weight: 650; font-size: 16px; letter-spacing: -0.1px; }
    .ff-fsp { flex: 1; }
    .ff-stack { display: flex; align-items: center; }
    .ff-av {
      width: 26px; height: 26px; border-radius: 50%; border: 2px solid #fff;
      margin-left: -7px; color: #fff; font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      background-size: cover; background-position: center;
    }
    .ff-av:first-child { margin-left: 0; }
    .ff-more {
      margin-left: -7px; width: 26px; height: 26px; border-radius: 50%; border: 2px solid #fff;
      background: #ececf3; color: #5a5a6b; font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .ff-badge {
      font-size: 13px; font-weight: 650; color: #5a5a6b; background: #f4f4f9;
      border-radius: 22px; padding: 3px 8px; min-width: 23px; text-align: center;
    }
    .ff-chev { color: #9494a4; transition: transform 0.15s; flex-shrink: 0; }
    .ff-feed.ff-open .ff-chev { transform: rotate(180deg); }

    /* ── drag handle ── */
    .ff-drag {
      cursor: grab; color: #c0c0cc; flex-shrink: 0; display: flex;
      align-items: center; padding: 2px; transition: color 0.12s;
    }
    .ff-drag:hover { color: #5a5a6b; }
    .ff-drag:active { cursor: grabbing; }
    .ff-feed.ff-dragging { opacity: 0.4; }
    .ff-feed.ff-drag-over { border-top: 2px solid #4f46e5; }

    /* ── expanded body ── */
    .ff-fbody { border-top: 2px solid #e0e0ea; padding: 4px 13px 13px; background: #f7f7fb; }
    .ff-tools { display: flex; gap: 6px; padding: 11px 0; flex-wrap: wrap; }
    .ff-tool {
      display: inline-flex; align-items: center; gap: 6px;
      border: 1px solid #ececf3; background: #fff; border-radius: 9px;
      padding: 8px 13px; cursor: pointer; font-family: inherit;
      font-size: 14px; font-weight: 550; color: #5a5a6b;
    }
    .ff-tool:hover { background: #f4f4f9; color: #16161d; }
    .ff-tool.ff-t-open { background: #4f46e5; color: #fff; border-color: #4f46e5; }
    .ff-tool.ff-t-open:hover { filter: brightness(1.07); }
    .ff-tool.ff-t-del:hover { color: #e5484d; border-color: rgba(229,72,77,.35); background: rgba(229,72,77,.05); }
    .ff-chunks { display: flex; gap: 6px; align-items: center; padding: 0 0 8px; flex-wrap: wrap; }
    .ff-chunks-lbl { font-size: 13px; color: #9494a4; margin-right: 2px; }
    .ff-chunk {
      border: 1px solid #ececf3; background: #fff; width: 30px; height: 30px;
      border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 650; color: #5a5a6b;
    }
    .ff-chunk:hover { border-color: #4f46e5; color: #4f46e5; }
    .ff-mlist { display: flex; flex-direction: column; gap: 2px; margin-top: 3px; max-height: 370px; overflow-y: auto; }
    .ff-mrow { display: flex; align-items: center; gap: 9px; padding: 8px 5px; border-radius: 9px; }
    .ff-mrow:hover { background: #f4f4f9; }
    .ff-mrow .ff-av { width: 30px; height: 30px; font-size: 11px; }
    .ff-mn { flex: 1; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #16161d; }
    .ff-mn a { color: inherit; text-decoration: none; }
    .ff-mn a:hover { color: #4f46e5; }
    .ff-rm { border: none; background: transparent; color: #9494a4; cursor: pointer; padding: 5px; border-radius: 7px; opacity: 0; font-size: 16px; line-height: 1; }
    .ff-mrow:hover .ff-rm { opacity: 1; }
    .ff-rm:hover { color: #e5484d; background: rgba(229,72,77,.08); }

    /* ── empty ── */
    #ff-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 26px; gap: 7px; color: #5a5a6b; }
    #ff-empty p { font-weight: 700; font-size: 17px; color: #16161d; }
    #ff-empty small { font-size: 14px; max-width: 260px; line-height: 1.5; }
    .ff-empty-icon { width: 60px; height: 60px; border-radius: 16px; background: rgba(79,70,229,.09); position: relative; margin-bottom: 8px; }
    .ff-empty-icon::before, .ff-empty-icon::after { content: ""; position: absolute; left: 15px; height: 5px; border-radius: 2px; background: #4f46e5; opacity: .5; }
    .ff-empty-icon::before { top: 20px; width: 30px; }
    .ff-empty-icon::after { top: 33px; width: 17px; }
    #ff-btn-empty { background: #4f46e5; color: #fff; border: none; border-radius: 10px; padding: 11px 20px; font-size: 16px; font-weight: 650; cursor: pointer; font-family: inherit; margin-top: 11px; }

    /* ── footer ── */
    .ff-foot { display: flex; align-items: center; gap: 13px; padding: 11px 14px; border-top: 1px solid #ececf3; background: #fff; flex-shrink: 0; }
    .ff-flink { border: none; background: transparent; color: #9494a4; font-family: inherit; font-size: 13px; cursor: pointer; padding: 0; }
    .ff-flink:hover { color: #4f46e5; }
    .ff-flink b { color: #16161d; }
    .ff-fsp { flex: 1; }
    .ff-hidden { display: none !important; }
  `;
  shadow.appendChild(styleEl);

  // ── HTML structure ────────────────────────────────────────────────────────
  const panel = document.createElement("div");
  panel.id = "ff-panel";
  panel.innerHTML = `
    <div id="ff-tab">
      <span class="ff-tab-arrow"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></span>
    </div>
    <div id="ff-main">
      <header class="ff-bar">
        <span class="ff-brand">FeedForge</span>
        <div class="ff-search-wrap">
          <svg class="ff-search-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input id="ff-q" type="text" placeholder="Search feeds…" autocomplete="off"/>
        </div>
        <button id="ff-btn-new">+ Feed</button>
      </header>
      <div id="ff-list"></div>
      <div id="ff-empty" class="ff-hidden">
        <div class="ff-empty-icon"></div>
        <p>No feeds yet</p>
        <small>Create a feed, then use the search to add people.</small>
        <button id="ff-btn-empty">Create first feed</button>
      </div>
      <footer class="ff-foot">
        <button class="ff-flink" id="ff-export">Export</button>
        <button class="ff-flink" id="ff-import">Import</button>
        <input id="ff-import-file" type="file" accept="application/json" style="display:none"/>
        <span class="ff-fsp"></span>
        <button class="ff-flink" id="ff-max-btn">Max: <b id="ff-max-lbl">28</b></button>
      </footer>
      <div id="ff-search-overlay" class="ff-hidden">
        <div class="ff-so-head">
          <button class="ff-so-back" data-act="search-close">←</button>
          <span class="ff-so-title" id="ff-so-title">Add people</span>
        </div>
        <div class="ff-so-searchbar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input id="ff-so-input" type="text" placeholder="Search people by name…" autocomplete="off"/>
        </div>
        <div id="ff-so-results"></div>
      </div>
    </div>
  `;
  shadow.appendChild(panel);

  // ── helpers ───────────────────────────────────────────────────────────────
  const $  = id  => shadow.getElementById(id);
  const esc = s  => (s||"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ini = n  => (n||"?").split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("")||"?";
  const hue = s  => { let h=0; for(const c of s||"") h=(h*31+c.charCodeAt(0))%360; return `hsl(${h} 52% 55%)`; };
  const avEl = (m,cls) => {
    const bg = m.avatar ? `background-image:url('${esc(m.avatar)}')` : `background:${hue(m.name||m.id)}`;
    return `<div class="${cls}" style="${bg}">${m.avatar?"":esc(ini(m.name||m.id))}</div>`;
  };
  const IC = {
    open:   `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>`,
    pen:    `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>`,
    color:  `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`,
    trash:  `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`,
    chev:   `<svg class="ff-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>`,
    userplus: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>`,
    grip:   `<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><circle cx="5" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/><circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/><circle cx="5" cy="13" r="1.5"/><circle cx="11" cy="13" r="1.5"/></svg>`,
  };

  // ── storage ───────────────────────────────────────────────────────────────
  const getFeeds = () => new Promise(r => chrome.storage.local.get({feeds:[]}, d => r(d.feeds)));
  const setFeeds = f  => new Promise(r => chrome.storage.local.set({feeds:f}, r));

  // ── toggle open/minimized ─────────────────────────────────────────────────
  function setOpen(open) {
    isOpen = open;
    panel.classList.toggle("ff-min", !open);
    chrome.storage.local.set({ ff_open: open });
  }

  $("ff-tab").addEventListener("click", () => setOpen(!isOpen));

  // ── CSRF helper ──────────────────────────────────────────────────────────
  async function getCsrf() {
    // Try document.cookie first (fast, works when not httpOnly)
    const local = document.cookie.match(/JSESSIONID="([^"]+)"/)?.[1];
    if (local) return local;
    // Ask background which can read httpOnly cookies
    const res = await chrome.runtime.sendMessage({ type: "FF_GET_CSRF" }).catch(() => null);
    return res?.token ?? null;
  }


  // ── feed rendering ────────────────────────────────────────────────────────
  function stackHtml(members) {
    const s = members.slice(0,4).map(m => avEl(m,"ff-av")).join("");
    const x = members.length>4 ? `<div class="ff-more">+${members.length-4}</div>` : "";
    return `<div class="ff-stack">${s}${x}</div>`;
  }

  function feedHtml(f) {
    const isOpen = f.id === openId;
    const chunks = Math.ceil(f.members.length/MAX)||1;
    const chunkBtns = f.members.length>MAX
      ? `<div class="ff-chunks"><span class="ff-chunks-lbl">Pages:</span>`
        +Array.from({length:chunks},(_,i)=>`<button class="ff-chunk" data-act="chunk" data-i="${i}">${i+1}</button>`).join("")
        +`</div>` : "";
    const mRows = f.members.map(m=>`
      <div class="ff-mrow">
        ${avEl(m,"ff-av")}
        <span class="ff-mn">${m.vanity?`<a href="https://www.linkedin.com/in/${esc(m.vanity)}/" target="_blank">${esc(m.name||m.id)}</a>`:esc(m.name||m.id)}</span>
        <button class="ff-rm" data-act="rm" data-mid="${esc(m.id)}">✕</button>
      </div>`).join("");
    return `
    <div class="ff-feed${isOpen?" ff-open":""}" data-feed="${f.id}">
      <div class="ff-frow" data-act="toggle">
        <span class="ff-drag" data-act="drag">${IC.grip}</span>
        <span class="ff-fdot" style="background:${f.color}"></span>
        <span class="ff-fname">${esc(f.name)}</span><span class="ff-fsp"></span>
        ${stackHtml(f.members)}<span class="ff-badge">${f.members.length}</span>${IC.chev}
      </div>
      ${isOpen?`<div class="ff-fbody">
        <div class="ff-tools">
          <button class="ff-tool ff-t-add" data-act="search-people">${IC.userplus} Add people</button>
          <button class="ff-tool ff-t-open" data-act="open">${IC.open} Open</button>
          <button class="ff-tool" data-act="rename">${IC.pen} Rename</button>
          <button class="ff-tool" data-act="color">${IC.color} Color</button>
          <button class="ff-tool ff-t-del" data-act="del">${IC.trash} Delete</button>
        </div>
        ${chunkBtns}
        <div class="ff-mlist">${mRows||'<p style="font-size:11px;color:#9494a4;padding:3px 1px">No members yet.</p>'}</div>
      </div>`:""}
    </div>`;
  }

  function render() {
    const term = search.trim().toLowerCase();
    const vis = term
      ? FEEDS.filter(f=>f.name.toLowerCase().includes(term)||f.members.some(m=>(m.name||"").toLowerCase().includes(term)))
      : FEEDS;
    $("ff-empty").classList.toggle("ff-hidden", FEEDS.length>0);
    $("ff-list").classList.toggle("ff-hidden", FEEDS.length===0);
    $("ff-list").innerHTML = vis.map(feedHtml).join("");
    $("ff-max-lbl").textContent = MAX;
  }

  // ── actions ───────────────────────────────────────────────────────────────
  async function newFeed(then) {
    const name = prompt("Feed name:"); if (name===null) return null;
    const f = {id:crypto.randomUUID(), name:name.trim()||"Untitled",
      color:PALETTE[FEEDS.length%PALETTE.length], members:[], createdAt:Date.now(), updatedAt:Date.now()};
    FEEDS.push(f); await setFeeds(FEEDS); render();
    if (then) then(f); return f;
  }

  function buildUrl(ids) {
    const p = new URLSearchParams();
    p.set("origin","FACETED_SEARCH");
    p.set("sortBy",JSON.stringify(["date_posted"]));
    p.set("fromMember",JSON.stringify(ids));
    return "https://www.linkedin.com/search/results/content/?"+p.toString();
  }

  function openFeed(f, idx=0) {
    if (!f.members.length) { alert("No members in this feed yet."); return; }
    const ids = f.members.map(m=>m.id);
    const chunks=[]; for(let i=0;i<ids.length;i+=MAX) chunks.push(ids.slice(i,i+MAX));
    window.location.href = buildUrl(chunks[idx]||chunks[0]);
  }


  // ── people search (LinkedIn typeahead — returns ACoA ids directly) ─────────
  // queryId from MyFeedIn: the @mention/share typeahead. Each hit already carries
  // the fsd_profile:ACoA id, so no separate resolution step is needed.
  async function searchPeople(query) {
    const q = query.trim().slice(0, 100).replace(/[<>{}]/g, "");
    if (q.length < 2) return [];
    const csrf = await getCsrf();
    if (!csrf) return { error: "NOT_LOGGED_IN" };

    const url = `https://www.linkedin.com/voyager/api/graphql?variables=(keywords:${encodeURIComponent(q)})&queryId=voyagerSearchDashSharing.4e26d0f2284baec4fa3fe92c090494cd`;
    try {
      const r = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          accept: "application/vnd.linkedin.normalized+json+2.1",
          "csrf-token": csrf,
          "x-restli-protocol-version": "2.0.0",
        },
      });
      if (!r.ok) return { error: r.status === 429 ? "RATE_LIMIT" : `HTTP_${r.status}` };
      const json = await r.json();
      const elements =
        json?.data?.data?.searchDashSharingByBlended?.elements ||
        json?.data?.searchDashSharingByBlended?.elements || [];

      const out = [];
      for (const e of elements) {
        const profileRef = e?.target?.["*profile"];
        if (!profileRef || e.renderStyle === "NON_INTERACTIVE_BANNER") continue;
        const id = String(profileRef).match(/fsd_profile:([A-Za-z0-9_-]+)/)?.[1];
        if (!id) continue;

        const vanity = (e.navigationUrl || "").match(/\/in\/([^/?]+)/)?.[1] || "";
        const name = e.title?.text || vanity;
        let headline = e.subtitle?.text || "";
        let degree = "";
        const dm = headline.match(/^(1st|2nd|3rd)\s*[•·]\s*/);
        if (dm) { degree = dm[1]; headline = headline.replace(/^(1st|2nd|3rd)\s*[•·]\s*/, ""); }

        let avatar = "";
        try {
          const pic = e.image?.attributes?.[0]?.detailData?.nonEntityProfilePicture?.vectorImage;
          if (pic?.rootUrl && pic?.artifacts?.length) {
            avatar = pic.rootUrl + (pic.artifacts[0]?.fileIdentifyingUrlPathSegment || "");
          }
        } catch (_) {}

        out.push({ id, name, vanity, headline, degree, avatar });
      }
      return out;
    } catch (e) {
      return { error: "FETCH_FAILED" };
    }
  }

  // ── search overlay ─────────────────────────────────────────────────────────
  let searchFeedId = null;
  let searchTimer = null;

  function openSearch(feedId) {
    const f = FEEDS.find(x => x.id === feedId);
    if (!f) return;
    searchFeedId = feedId;
    $("ff-so-title").textContent = `Add to "${f.name}"`;
    $("ff-so-input").value = "";
    $("ff-so-results").innerHTML = `<div class="ff-sr-msg">Type a name to search LinkedIn…</div>`;
    $("ff-search-overlay").classList.remove("ff-hidden");
    setTimeout(() => $("ff-so-input").focus(), 50);
  }
  function closeSearch() {
    searchFeedId = null;
    $("ff-search-overlay").classList.add("ff-hidden");
  }

  function renderResults(results) {
    const box = $("ff-so-results");
    const f = FEEDS.find(x => x.id === searchFeedId);
    if (!f) return;
    if (!results.length) { box.innerHTML = `<div class="ff-sr-msg">No people found.</div>`; return; }
    box.innerHTML = results.map(p => {
      const inFeed = f.members.some(m => m.id === p.id);
      const bg = p.avatar ? `background-image:url('${esc(p.avatar)}')` : `background:${hue(p.name)}`;
      return `
        <div class="ff-sr-item" data-act="sr-add" data-id="${esc(p.id)}"
             data-name="${esc(p.name)}" data-vanity="${esc(p.vanity)}" data-avatar="${esc(p.avatar)}">
          <div class="ff-sr-av" style="${bg}">${p.avatar?"":esc(ini(p.name))}</div>
          <div class="ff-sr-info">
            <div class="ff-sr-name">${esc(p.name)}${p.degree?`<span class="ff-sr-deg">${esc(p.degree)}</span>`:""}</div>
            <div class="ff-sr-head">${esc(p.headline)}</div>
          </div>
          <button class="ff-sr-add ${inFeed?"ff-done":""}">${inFeed?"✓":"+"}</button>
        </div>`;
    }).join("");
  }

  function onSearchInput() {
    clearTimeout(searchTimer);
    const q = $("ff-so-input").value.trim();
    const box = $("ff-so-results");
    if (q.length < 2) { box.innerHTML = `<div class="ff-sr-msg">Type at least 2 characters…</div>`; return; }
    box.innerHTML = `<div class="ff-sr-msg"><span class="ff-spin"></span>Searching…</div>`;
    searchTimer = setTimeout(async () => {
      const res = await searchPeople(q);
      if (res.error) {
        const msg = res.error === "NOT_LOGGED_IN" ? "Log in to LinkedIn first."
                  : res.error === "RATE_LIMIT" ? "LinkedIn rate-limited — wait a moment."
                  : "Search failed. Try again.";
        box.innerHTML = `<div class="ff-sr-msg">${msg}</div>`;
        return;
      }
      renderResults(res);
    }, 350);
  }

  // ── event delegation ──────────────────────────────────────────────────────
  shadow.addEventListener("click", async e => {
    if (justDragged) { justDragged = false; return; }
    const el = e.target.closest("[data-act]"); if (!el) return;
    const act = el.dataset.act;


    // search overlay actions
    if (act==="search-close") { closeSearch(); return; }
    if (act==="sr-add") {
      const f = FEEDS.find(x => x.id === searchFeedId);
      if (!f) return;
      const member = { id: el.dataset.id, name: el.dataset.name, vanity: el.dataset.vanity, avatar: el.dataset.avatar || "" };
      const btn = el.querySelector(".ff-sr-add");
      if (f.members.some(m => m.id === member.id)) return;
      f.members.push({ ...member, addedAt: Date.now() });
      f.updatedAt = Date.now();
      await setFeeds(FEEDS);
      if (btn) { btn.classList.add("ff-done"); btn.textContent = "✓"; }
      render(); // refresh the underlying feed list/counts
      return;
    }

    const card=e.target.closest(".ff-feed");
    const f=FEEDS.find(x=>x.id===card?.dataset.feed); if (!f) return;

    if      (act==="drag")   { return; }
    else if (act==="toggle") { openId=openId===f.id?null:f.id; render(); }
    else if (act==="search-people") { openSearch(f.id); }
    else if (act==="open")   { openFeed(f,0); }
    else if (act==="chunk")  { openFeed(f,Number(el.dataset.i)); }
    else if (act==="rename") { const n=prompt("Rename:",f.name);if(n!==null){f.name=n.trim()||f.name;await setFeeds(FEEDS);render();} }
    else if (act==="color")  { const i=PALETTE.indexOf(f.color);f.color=PALETTE[(i+1)%PALETTE.length];await setFeeds(FEEDS);render(); }
    else if (act==="del")    { if(confirm(`Delete "${f.name}"?`)){FEEDS=FEEDS.filter(x=>x.id!==f.id);if(openId===f.id)openId=null;await setFeeds(FEEDS);render();} }
    else if (act==="rm")     { f.members=f.members.filter(m=>m.id!==el.dataset.mid);f.updatedAt=Date.now();await setFeeds(FEEDS);render(); }
  });

  $("ff-q").addEventListener("input", e=>{search=e.target.value;render();});
  $("ff-so-input").addEventListener("input", onSearchInput);
  $("ff-btn-new").addEventListener("click", ()=>newFeed(f=>{openId=f.id;render();}));
  $("ff-btn-empty").addEventListener("click", ()=>newFeed(f=>{openId=f.id;render();}));

  // ── drag-to-reorder ──────────────────────────────────────────────────────
  let dragFeedId = null, startClientY = 0, dragThreshold = 5, justDragged = false;

  shadow.addEventListener("pointerdown", e => {
    const handle = e.target.closest(".ff-drag");
    if (!handle) return;
    e.preventDefault();
    const card = handle.closest(".ff-feed");
    if (!card) return;
    dragFeedId = card.dataset.feed;
    startClientY = e.clientY;
  });

  document.addEventListener("pointermove", e => {
    if (!dragFeedId) return;
    if (Math.abs(e.clientY - startClientY) < dragThreshold) return;
    const card = shadow.querySelector(`[data-feed="${dragFeedId}"]`);
    if (!card) return;
    if (!card.classList.contains("ff-dragging")) {
      if (openId === dragFeedId) { openId = null; }
      card.classList.add("ff-dragging");
    }
    shadow.querySelectorAll(".ff-feed.ff-drag-over").forEach(el => el.classList.remove("ff-drag-over"));
    const overEl = shadow.elementFromPoint(e.clientX, e.clientY);
    const overCard = overEl?.closest(".ff-feed");
    if (overCard && overCard.dataset.feed !== dragFeedId) {
      overCard.classList.add("ff-drag-over");
    }
  });

  document.addEventListener("pointerup", async e => {
    if (!dragFeedId) return;
    const overEl = shadow.elementFromPoint(e.clientX, e.clientY);
    const overCard = overEl?.closest(".ff-feed");
    if (overCard) {
      const targetId = overCard.dataset.feed;
      if (targetId && targetId !== dragFeedId) {
        const fromIdx = FEEDS.findIndex(f => f.id === dragFeedId);
        const toIdx = FEEDS.findIndex(f => f.id === targetId);
        if (fromIdx !== -1 && toIdx !== -1) {
          const [moved] = FEEDS.splice(fromIdx, 1);
          FEEDS.splice(toIdx, 0, moved);
          await setFeeds(FEEDS);
        }
      }
    }
    justDragged = true;
    dragFeedId = null;
    render();
  });

  $("ff-max-btn").addEventListener("click", async()=>{
    const v=prompt("Max per URL (28 recommended):",String(MAX)); if(!v) return;
    MAX=Math.max(1,Math.min(28,parseInt(v)||MAX));
    await new Promise(r=>chrome.storage.local.set({maxPerFeed:MAX},r)); render();
  });
  $("ff-export").addEventListener("click",()=>{
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([JSON.stringify(FEEDS,null,2)],{type:"application/json"}));
    a.download=`feedforge-${new Date().toISOString().slice(0,10)}.json`; a.click();
  });
  $("ff-import").addEventListener("click",()=>$("ff-import-file").click());
  $("ff-import-file").addEventListener("change",e=>{
    const file=e.target.files[0]; if(!file) return;
    const r=new FileReader(); r.onload=async()=>{
      try{const d=JSON.parse(r.result);if(!Array.isArray(d))throw 0;
        if(!FEEDS.length||confirm("Replace feeds with imported set?")){FEEDS=d;await setFeeds(FEEDS);render();}
      }catch{alert("Invalid export file.");} e.target.value="";
    }; r.readAsText(file);
  });

  // ── live sync (content.js post buttons write to same storage) ─────────────
  chrome.storage.onChanged.addListener((ch,area)=>{
    if(area!=="local") return;
    if(ch.feeds){FEEDS=ch.feeds.newValue||[];render();}
    if(ch.maxPerFeed){MAX=ch.maxPerFeed.newValue||28;render();}
  });

  // ── toggle from toolbar icon (via background.js) ──────────────────────────
  chrome.runtime.onMessage.addListener((msg)=>{
    if(msg?.type==="FF_TOGGLE") setOpen(!isOpen);
  });


  // ── boot ──────────────────────────────────────────────────────────────────
  (async()=>{
    const d = await new Promise(r=>chrome.storage.local.get({feeds:[],maxPerFeed:28,ff_open:true},r));
    FEEDS=d.feeds||[]; MAX=d.maxPerFeed||28;
    isOpen = d.ff_open!==false;
    render();
    if (!isOpen) panel.classList.add("ff-min");
  })();
})();
