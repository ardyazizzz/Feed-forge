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
    .ff-so-urlsep {
      display: flex; align-items: center; gap: 10px; margin: 0 16px 6px; flex-shrink: 0;
      font-size: 13px; color: #c0c0cc; font-weight: 600;
    }
    .ff-so-urlsep::before, .ff-so-urlsep::after { content: ""; flex: 1; height: 1px; background: #ececf3; }
    .ff-so-urlwrap { display: flex; gap: 8px; margin: 0 16px; flex-shrink: 0; }
    #ff-so-url {
      flex: 1; border: 1px solid #ececf3; background: #fff; border-radius: 10px;
      padding: 10px 14px; font-size: 14px; font-family: inherit; color: #16161d; outline: none; min-width: 0;
    }
    #ff-so-url:focus { border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79,70,229,.09); }
    #ff-so-url::placeholder { color: #c0c0cc; font-size: 13px; }
    .ff-so-url-btn {
      border: 1px solid #4f46e5; background: #fff; color: #4f46e5; cursor: pointer;
      border-radius: 10px; padding: 10px 16px; font-size: 14px; font-weight: 650; font-family: inherit; flex-shrink: 0;
    }
    .ff-so-url-btn:hover { background: rgba(79,70,229,.08); }
    .ff-so-url-btn:disabled { opacity: .45; cursor: default; }
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
      flex-shrink: 0; transition: box-shadow 0.13s;
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
    .ff-av-wrap { position: relative; overflow: hidden; }
    .ff-av-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 50%; }
    .ff-av-fb { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; color: #fff; font-weight: 700; border-radius: 50%; font-size: inherit; }
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
    .ff-mlist { display: flex; flex-direction: column; gap: 2px; margin-top: 3px; }
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

    /* ── tab navigation ── */
    .ff-tabs {
      display: flex; gap: 4px; padding: 0 14px; background: #fff;
      border-bottom: 1px solid #ececf3; flex-shrink: 0;
    }
    .ff-tab-btn {
      border: none; background: transparent; cursor: pointer; font-family: inherit;
      font-size: 14px; font-weight: 650; color: #9494a4; padding: 12px 8px 11px;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
      display: inline-flex; align-items: center; gap: 7px; transition: color 0.12s;
    }
    .ff-tab-btn svg { width: 16px; height: 16px; }
    .ff-tab-btn:hover { color: #5a5a6b; }
    .ff-tab-btn.ff-tab-active { color: #4f46e5; border-bottom-color: #4f46e5; }

    /* view containers */
    #ff-view-feeds, #ff-view-tracker { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

    /* ── tracker ── */
    #ff-tracker-scroll { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 11px; }
    .ff-tk-card { background: #fff; border: 1px solid #ececf3; border-radius: 14px; padding: 15px; }
    .ff-tk-card.ff-tk-pad { padding: 16px; }

    /* chain hero */
    .ff-tk-hero { display: flex; align-items: center; gap: 14px; }
    .ff-tk-flame { font-size: 34px; line-height: 1; flex-shrink: 0; }
    .ff-tk-hero-txt { flex: 1; min-width: 0; }
    .ff-tk-chain-n { font-size: 22px; font-weight: 800; color: #4f46e5; letter-spacing: -0.4px; }
    .ff-tk-chain-sub { font-size: 14px; font-weight: 600; margin-top: 2px; }
    .ff-tk-chain-sub.ff-on { color: #10b981; }
    .ff-tk-chain-sub.ff-off { color: #9494a4; }
    .ff-tk-shield {
      width: 50px; height: 50px; border-radius: 14px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    .ff-tk-shield.ff-on { background: rgba(16,185,129,.12); }
    .ff-tk-shield.ff-off { background: #f4f4f9; }
    .ff-tk-shield svg { width: 28px; height: 28px; }

    /* section label */
    .ff-tk-label { font-size: 12px; font-weight: 700; letter-spacing: 0.6px; color: #9494a4; text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 7px; }
    .ff-tk-label svg { width: 15px; height: 15px; flex-shrink: 0; }
    .ff-tk-label .ff-tk-info { cursor: help; color: #c0c0cc; display: inline-flex; }
    .ff-tk-label .ff-tk-info svg { width: 15px; height: 15px; }

    /* today's activity steppers */
    .ff-tk-metrics { display: flex; gap: 9px; }
    .ff-tk-metric { flex: 1; min-width: 0; text-align: center; }
    .ff-tk-metric-lbl { font-size: 13px; font-weight: 600; color: #5a5a6b; display: flex; align-items: center; justify-content: center; gap: 5px; margin-bottom: 8px; white-space: nowrap; }
    .ff-tk-metric-lbl svg { width: 14px; height: 14px; color: #9494a4; }
    .ff-tk-stepper {
      display: flex; align-items: center; border: 1px solid #ececf3;
      border-radius: 11px; overflow: hidden; background: #f7f7fb;
    }
    .ff-tk-step-btn {
      border: none; background: #fff; cursor: pointer; font-family: inherit;
      width: 34px; height: 42px; font-size: 20px; line-height: 1; color: #5a5a6b;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .ff-tk-step-btn:hover { background: #f4f4f9; color: #4f46e5; }
    .ff-tk-step-btn:active { background: #ececf3; }
    .ff-tk-step-val { flex: 1; text-align: center; font-size: 19px; font-weight: 750; color: #16161d; min-width: 0; }
    .ff-tk-met .ff-tk-step-val { color: #10b981; }

    /* chain visualization */
    .ff-tk-viz-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .ff-tk-range {
      border: 1px solid #ececf3; background: #f7f7fb; border-radius: 9px;
      padding: 6px 9px; font-size: 13px; font-family: inherit; color: #16161d;
      cursor: pointer; outline: none;
    }
    .ff-tk-range:focus { border-color: #4f46e5; }
    .ff-tk-viz-sub { font-size: 12px; color: #9494a4; margin-bottom: 12px; }
    .ff-tk-grid { display: flex; flex-wrap: wrap; gap: 5px; }
    .ff-tk-cell {
      width: 19px; height: 19px; border-radius: 5px; flex-shrink: 0;
      background: #ececf3;
    }
    .ff-tk-cell.ff-met { background: #10b981; }
    .ff-tk-cell.ff-today { box-shadow: 0 0 0 2px #fff, 0 0 0 4px #4f46e5; }
    .ff-tk-axis { display: flex; justify-content: space-between; margin-top: 9px; font-size: 11px; color: #9494a4; }
    .ff-tk-streaks { display: flex; justify-content: space-between; margin-top: 14px; padding-top: 13px; border-top: 1px solid #f4f4f9; }
    .ff-tk-streak { display: flex; align-items: center; gap: 7px; font-size: 14px; color: #5a5a6b; }
    .ff-tk-streak b { color: #16161d; font-weight: 750; }

    /* comparison */
    .ff-tk-cmp-grid { display: flex; flex-direction: column; gap: 11px; }
    .ff-tk-cmp { background: #f7f7fb; border: 1px solid #ececf3; border-radius: 12px; padding: 13px; }
    .ff-tk-cmp-head { display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 700; color: #4f46e5; margin-bottom: 10px; }
    .ff-tk-cmp-head svg { width: 15px; height: 15px; }
    .ff-tk-cmp-row { display: flex; align-items: center; font-size: 13px; padding: 4px 0; }
    .ff-tk-cmp-name { color: #5a5a6b; flex: 1; }
    .ff-tk-cmp-now { font-weight: 750; color: #16161d; width: 34px; text-align: right; }
    .ff-tk-cmp-vs { color: #9494a4; width: 56px; text-align: right; font-size: 12px; }
    .ff-tk-cmp-delta { width: 64px; text-align: right; font-weight: 700; display: inline-flex; align-items: center; justify-content: flex-end; gap: 2px; }
    .ff-tk-cmp-delta.ff-up { color: #10b981; }
    .ff-tk-cmp-delta.ff-down { color: #e5484d; }
    .ff-tk-cmp-delta.ff-flat { color: #9494a4; }

    /* goals editor */
    .ff-tk-goals { display: flex; flex-direction: column; gap: 10px; }
    .ff-tk-goal-row { display: flex; align-items: center; gap: 10px; }
    .ff-tk-goal-lbl { flex: 1; font-size: 14px; font-weight: 600; color: #16161d; display: flex; align-items: center; gap: 7px; }
    .ff-tk-goal-lbl svg { width: 15px; height: 15px; color: #9494a4; }
    .ff-tk-goal-stepper { display: flex; align-items: center; border: 1px solid #ececf3; border-radius: 9px; overflow: hidden; }
    .ff-tk-goal-stepper button {
      border: none; background: #fff; cursor: pointer; font-family: inherit;
      width: 30px; height: 34px; font-size: 17px; color: #5a5a6b;
    }
    .ff-tk-goal-stepper button:hover { background: #f4f4f9; color: #4f46e5; }
    .ff-tk-goal-val { width: 38px; text-align: center; font-size: 15px; font-weight: 700; color: #16161d; }
    .ff-tk-goal-hint { font-size: 12px; color: #9494a4; line-height: 1.5; margin-top: 4px; }

    /* footer buttons row inside tracker */
    .ff-tk-foot { display: flex; gap: 9px; }
    .ff-tk-foot-btn {
      flex: 1; border: 1px solid #ececf3; background: #fff; border-radius: 12px;
      padding: 13px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 650;
      color: #4f46e5; display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .ff-tk-foot-btn svg { width: 17px; height: 17px; }
    .ff-tk-foot-btn:hover { background: #f7f7fb; border-color: rgba(79,70,229,.3); }
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
        <div class="ff-search-wrap" id="ff-feeds-searchwrap">
          <svg class="ff-search-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input id="ff-q" type="text" placeholder="Search feeds…" autocomplete="off"/>
        </div>
        <button id="ff-btn-new">+ Feed</button>
      </header>
      <nav class="ff-tabs">
        <button class="ff-tab-btn ff-tab-active" id="ff-nav-feeds" data-act="nav" data-view="feeds">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          Feeds
        </button>
        <button class="ff-tab-btn" id="ff-nav-tracker" data-act="nav" data-view="tracker">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
          Tracker
        </button>
      </nav>

      <!-- ───── FEEDS VIEW ───── -->
      <div id="ff-view-feeds">
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
          <button class="ff-flink" id="ff-refresh-avatars" title="Re-fetch profile pictures that may have expired">Refresh pics</button>
        </footer>
      </div>

      <!-- ───── TRACKER VIEW ───── -->
      <div id="ff-view-tracker" class="ff-hidden">
        <div id="ff-tracker-scroll"></div>
      </div>

      <div id="ff-search-overlay" class="ff-hidden">
        <div class="ff-so-head">
          <button class="ff-so-back" data-act="search-close">←</button>
          <span class="ff-so-title" id="ff-so-title">Add people</span>
        </div>
        <div class="ff-so-searchbar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input id="ff-so-input" type="text" placeholder="Search by name (add company/title to narrow)…" autocomplete="off"/>
        </div>
        <div class="ff-so-urlsep">or paste profile URL</div>
        <div class="ff-so-urlwrap">
          <input id="ff-so-url" type="text" placeholder="https://www.linkedin.com/in/…" autocomplete="off"/>
          <button class="ff-so-url-btn" id="ff-so-url-btn" data-act="url-add">Add</button>
        </div>
        <div class="ff-sr-msg ff-hidden" id="ff-so-url-msg" style="margin:4px 16px 0;padding:7px 14px;font-size:13px;text-align:left;color:#5a5a6b;"></div>
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
    if (m.avatar) {
      // Real <img> so we can detect load failures. If the LinkedIn CDN URL has
      // expired, the onerror handler hides the broken image and reveals the
      // colored initials fallback.
      return `<div class="${cls} ff-av-wrap"><img class="ff-av-img" src="${esc(m.avatar)}" alt=""
              onerror="this.removeAttribute('onerror');this.style.display='none';var s=this.nextElementSibling;if(s)s.style.display='flex';"
              /><span class="ff-av-fb" style="background:${hue(m.name||m.id)}">${esc(ini(m.name||m.id))}</span></div>`;
    }
    return `<div class="${cls}" style="background:${hue(m.name||m.id)};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">${esc(ini(m.name||m.id))}</div>`;
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

  // ── add by LinkedIn profile URL ──────────────────────────────────────────
  async function addByUrl() {
    const raw = $("ff-so-url").value.trim();
    if (!raw) return;
    const vanity = (raw.match(/\/in\/([^/?#]+)/)?.[1] || raw).replace(/[<>{}]/g, "").slice(0, 100);
    if (!vanity) return;

    const btn = $("ff-so-url-btn");
    btn.disabled = true;
    btn.textContent = "…";

    try {
      const csrf = await getCsrf();
      if (!csrf) { showUrlMsg("Log in to LinkedIn first."); return; }

      const url = `https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&variables=(vanityName:${encodeURIComponent(vanity)})&queryId=voyagerIdentityDashProfiles.ee32334d3bd69a1900a077b5451c646a`;
      const r = await fetch(url, {
        method: "GET", credentials: "include",
        headers: { "csrf-token": csrf, "x-restli-protocol-version": "2.0.0", "content-type": "application/json" },
      });
      if (!r.ok) { showUrlMsg(r.status === 429 ? "LinkedIn rate-limited." : `LinkedIn error ${r.status}.`); return; }

      const json = await r.json();
      const el = json?.data?.identityDashProfilesByVanityName?.elements?.[0] ?? json?.data?.identityDashProfilesByMemberIdentity?.elements?.[0];
      if (!el) { showUrlMsg("Profile not found. Check the URL."); return; }

      const member = {
        id: el.entityUrn?.split(":").pop() ?? "",
        name: `${el.firstName ?? ""} ${el.lastName ?? ""}`.trim() || vanity,
        vanity: el.publicIdentifier ?? vanity,
        avatar: el.profilePicture?.displayImageReferenceResolutionResult?.vectorImage?.artifacts?.[0]?.fileIdentifyingUrlPathSegment ?? "",
      };
      if (!member.id) { showUrlMsg("Could not resolve profile ID."); return; }

      const f = FEEDS.find(x => x.id === searchFeedId);
      if (!f) { showUrlMsg("No feed selected."); return; }
      if (f.members.some(m => m.id === member.id)) { showUrlMsg("Already in this feed."); return; }

      f.members.push({ ...member, addedAt: Date.now() });
      f.updatedAt = Date.now();
      await setFeeds(FEEDS);
      $("ff-so-url").value = "";
      showUrlMsg(`Added ${member.name} ✓`);
      render();
    } catch (_) {
      showUrlMsg("Network error — try again.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Add";
    }
  }

  function showUrlMsg(msg) {
    const el = $("ff-so-url-msg");
    if (el) { el.textContent = msg; el.classList.remove("ff-hidden"); setTimeout(() => el.classList.add("ff-hidden"), 3000); }
  }

  // ── refresh expired avatars ────────────────────────────────────────────────
  // LinkedIn's voyager avatar URLs are session-signed and can expire, leaving
  // empty circles. This function re-resolves every member whose avatar is
  // missing or whose current URL fails a HEAD/GET probe, then updates storage.
  // Runs only when the user clicks "Refresh pics" — no background work.
  async function refreshAvatars() {
    const btn = $("ff-refresh-avatars");
    if (!btn || btn.disabled) return;

    // Collect unique members across all feeds (dedup by id).
    const seen = new Set();
    const targets = [];
    for (const f of FEEDS) {
      for (const m of (f.members || [])) {
        if (m && m.id && m.vanity && !seen.has(m.id)) {
          seen.add(m.id);
          targets.push(m);
        }
      }
    }
    if (!targets.length) { showUrlMsg("No members to refresh."); return; }

    const csrf = await getCsrf();
    if (!csrf) { showUrlMsg("Log in to LinkedIn first."); return; }

    btn.disabled = true;
    const originalLabel = btn.textContent;
    btn.textContent = "Refreshing…";

    let updated = 0, failed = 0;
    // Sequential with a small delay between requests to stay under LinkedIn's
    // rate limit. Up to 6 in flight to keep the UI responsive.
    const concurrency = 6;
    let cursor = 0;
    const worker = async () => {
      while (cursor < targets.length) {
        const i = cursor++;
        const m = targets[i];
        try {
          const url = `https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&variables=(vanityName:${encodeURIComponent(m.vanity)})&queryId=voyagerIdentityDashProfiles.ee32334d3bd69a1900a077b5451c646a`;
          const r = await fetch(url, {
            method: "GET", credentials: "include",
            headers: { "csrf-token": csrf, "x-restli-protocol-version": "2.0.0", "content-type": "application/json" },
          });
          if (!r.ok) { failed++; continue; }
          const json = await r.json();
          const el = json?.data?.identityDashProfilesByVanityName?.elements?.[0]
                  ?? json?.data?.identityDashProfilesByMemberIdentity?.elements?.[0];
          if (!el) { failed++; continue; }
          const vec = el.profilePicture?.displayImageReferenceResolutionResult?.vectorImage;
          const newAvatar = vec?.rootUrl && vec?.artifacts?.length
            ? vec.rootUrl + (vec.artifacts[0]?.fileIdentifyingUrlPathSegment || "") : "";
          if (newAvatar && newAvatar !== m.avatar) {
            m.avatar = newAvatar;
            updated++;
          }
        } catch (_) {
          failed++;
        }
        // Small breather between requests per worker
        await new Promise(r => setTimeout(r, 80));
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));

    if (updated > 0) await setFeeds(FEEDS);
    btn.disabled = false;
    btn.textContent = originalLabel;
    render();
    showUrlMsg(updated > 0
      ? `Refreshed ${updated} avatar${updated === 1 ? "" : "s"}${failed > 0 ? ` (${failed} failed)` : ""} ✓`
      : failed > 0 ? `Refresh failed for ${failed} profile${failed === 1 ? "" : "s"}.`
      : `All avatars already up to date.`);
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
    $("ff-so-url").value = "";
    const msg = $("ff-so-url-msg");
    if (msg) { msg.classList.add("ff-hidden"); }
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
      const av = p.avatar
        ? `<div class="ff-sr-av ff-av-wrap"><img class="ff-av-img" src="${esc(p.avatar)}" alt=""
              onerror="this.removeAttribute('onerror');this.style.display='none';var s=this.nextElementSibling;if(s)s.style.display='flex';"
              /><span class="ff-av-fb" style="background:${hue(p.name)}">${esc(ini(p.name))}</span></div>`
        : `<div class="ff-sr-av" style="background:${hue(p.name)};color:#fff;display:flex;align-items:center;justify-content:center">${esc(ini(p.name))}</div>`;
      return `
        <div class="ff-sr-item" data-act="sr-add" data-id="${esc(p.id)}"
             data-name="${esc(p.name)}" data-vanity="${esc(p.vanity)}" data-avatar="${esc(p.avatar)}">
          ${av}
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

    // tab navigation
    if (act === "nav") { switchView(el.dataset.view); return; }

    // tracker actions
    if (act === "tk-bump") { tkBump(el.dataset.m, Number(el.dataset.d)); return; }
    if (act === "tk-goal") { tkGoal(el.dataset.m, Number(el.dataset.d)); return; }


    // search overlay actions
    if (act==="search-close") { closeSearch(); return; }
    if (act==="url-add") { addByUrl(); return; }
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

  // tracker range selector (select fires 'change', not click)
  shadow.addEventListener("change", e => {
    const sel = e.target.closest('[data-act="tk-range"]');
    if (sel) tkSetRange(Number(sel.value));
  });

  $("ff-so-input").addEventListener("input", onSearchInput);
  $("ff-so-url").addEventListener("keydown", e => { if (e.key === "Enter") addByUrl(); });
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
    e.target.value="";
    const r=new FileReader(); r.onload=async()=>{
      try{const d=JSON.parse(r.result);if(!Array.isArray(d))throw 0;
        if(!FEEDS.length||confirm("Replace feeds with imported set?")){FEEDS=d;await setFeeds(FEEDS);render();}
      }catch{alert("Invalid export file.");}
    }; r.readAsText(file);
  });
  $("ff-refresh-avatars").addEventListener("click", refreshAvatars);

  // ── live sync (content.js post buttons write to same storage) ─────────────
  chrome.storage.onChanged.addListener((ch,area)=>{
    if(area!=="local") return;
    if(ch.feeds){FEEDS=ch.feeds.newValue||[];render();}
    if(ch.maxPerFeed){MAX=ch.maxPerFeed.newValue||28;render();}
    if(ch[TK_KEY] && ch[TK_KEY].newValue){
      const nv = ch[TK_KEY].newValue;
      TK.goals = { ...TK.goals, ...(nv.goals||{}) };
      TK.days = nv.days || {};
      TK.range = nv.range || TK.range;
      if (currentView === "tracker") renderTracker();
    }
  });

  // ── toggle from toolbar icon (via background.js) ──────────────────────────
  chrome.runtime.onMessage.addListener((msg)=>{
    if(msg?.type==="FF_TOGGLE") setOpen(!isOpen);
  });


  // ════════════════════════════════════════════════════════════════════════
  //  CONSISTENCY TRACKER
  //  Same drawer, complementary purpose: Feeds = who you engage, Tracker =
  //  how consistently. State lives under tracker:* keys, never touches `feeds`.
  // ════════════════════════════════════════════════════════════════════════

  // metric definitions — order matters for layout
  const TK_METRICS = [
    { key: "posts",       label: "Posts",             icon: "pen"     },
    { key: "comments",    label: "Comments",          icon: "comment" },
    { key: "connections", label: "Connections / DMs", icon: "send"    },
  ];

  // tracker icons (kept geometric, matching existing IC set)
  const TKIC = {
    pen:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>`,
    comment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
    send:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    shieldOn:`<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`,
    shieldOff:`<svg viewBox="0 0 24 24" fill="none" stroke="#9494a4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    clock:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    cal:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>`,
    bars:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/></svg>`,
    target:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    flame:   `🔥`, star: `⭐`, leaf: `🌱`,
  };

  // tracker state
  let TK = {
    goals: { posts: 1, comments: 5, connections: 3 },
    days: {},          // { "YYYY-MM-DD": { posts, comments, connections } }
    range: 30,         // chain viz window
  };

  const TK_KEY = "tracker_state";

  const getTracker = () => new Promise(r =>
    chrome.storage.local.get({ [TK_KEY]: null }, d => r(d[TK_KEY])));
  const setTracker = () => new Promise(r =>
    chrome.storage.local.set({ [TK_KEY]: TK }, r));

  // local date key (avoids UTC off-by-one)
  function dayKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  function dateFromKey(k) { const [y,m,d] = k.split("-").map(Number); return new Date(y, m-1, d); }
  function shiftDay(d, n) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }

  function todayCounts() {
    return TK.days[dayKey()] || { posts: 0, comments: 0, connections: 0 };
  }

  // a day "counts" (chain stays alive) when every goal with target>0 is met.
  function dayMet(counts) {
    if (!counts) return false;
    const active = TK_METRICS.filter(m => (TK.goals[m.key] || 0) > 0);
    if (!active.length) return false; // no goals set → nothing to meet
    return active.every(m => (counts[m.key] || 0) >= TK.goals[m.key]);
  }

  // walk backwards from today counting consecutive met days
  function currentStreak() {
    let n = 0, cur = new Date();
    // today only counts if met; otherwise streak is yesterday-anchored
    if (!dayMet(TK.days[dayKey(cur)])) cur = shiftDay(cur, -1);
    for (;;) {
      const k = dayKey(cur);
      if (dayMet(TK.days[k])) { n++; cur = shiftDay(cur, -1); } else break;
    }
    return n;
  }
  function longestStreak() {
    const keys = Object.keys(TK.days).filter(k => dayMet(TK.days[k])).sort();
    if (!keys.length) return 0;
    let best = 1, run = 1;
    for (let i = 1; i < keys.length; i++) {
      const prev = dateFromKey(keys[i-1]), cur = dateFromKey(keys[i]);
      const diff = Math.round((cur - prev) / 86400000);
      run = diff === 1 ? run + 1 : 1;
      if (run > best) best = run;
    }
    return Math.max(best, currentStreak());
  }

  // averages over the trailing N days (excluding today), for comparison card
  function trailingAvg(metricKey, days) {
    let sum = 0, count = 0;
    for (let i = 1; i <= days; i++) {
      const k = dayKey(shiftDay(new Date(), -i));
      sum += (TK.days[k]?.[metricKey] || 0); count++;
    }
    return count ? sum / count : 0;
  }
  function yesterdayCount(metricKey) {
    return TK.days[dayKey(shiftDay(new Date(), -1))]?.[metricKey] || 0;
  }

  function deltaHtml(now, base) {
    if (base === 0) {
      if (now === 0) return `<span class="ff-tk-cmp-delta ff-flat">—</span>`;
      return `<span class="ff-tk-cmp-delta ff-up">▲ new</span>`;
    }
    const pct = Math.round(((now - base) / base) * 100);
    if (pct === 0) return `<span class="ff-tk-cmp-delta ff-flat">▬ 0%</span>`;
    const cls = pct > 0 ? "ff-up" : "ff-down";
    const arr = pct > 0 ? "▲" : "▼";
    return `<span class="ff-tk-cmp-delta ${cls}">${arr} ${pct > 0 ? "+" : ""}${pct}%</span>`;
  }

  function fmtAvg(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }

  // ── tracker mutations ───────────────────────────────────────────────────
  async function tkBump(metricKey, delta) {
    const k = dayKey();
    if (!TK.days[k]) TK.days[k] = { posts: 0, comments: 0, connections: 0 };
    TK.days[k][metricKey] = Math.max(0, (TK.days[k][metricKey] || 0) + delta);
    await setTracker();
    renderTracker();
  }
  async function tkGoal(metricKey, delta) {
    TK.goals[metricKey] = Math.max(0, (TK.goals[metricKey] || 0) + delta);
    await setTracker();
    renderTracker();
  }
  async function tkSetRange(n) { TK.range = n; await setTracker(); renderTracker(); }

  // ── tracker rendering ─────────────────────────────────────────────────────
  function renderChainViz() {
    const cells = [];
    const total = TK.range;
    for (let i = total - 1; i >= 0; i--) {
      const d = shiftDay(new Date(), -i);
      const k = dayKey(d);
      const met = dayMet(TK.days[k]);
      const isToday = i === 0;
      cells.push(`<div class="ff-tk-cell ${met ? "ff-met" : ""} ${isToday ? "ff-today" : ""}" title="${k}"></div>`);
    }
    const startD = shiftDay(new Date(), -(total - 1));
    const midD = shiftDay(new Date(), -Math.floor(total / 2));
    const fmt = d => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `
      <div class="ff-tk-grid">${cells.join("")}</div>
      <div class="ff-tk-axis"><span>${fmt(startD)}</span><span>${fmt(midD)}</span><span>Today</span></div>`;
  }

  function renderComparison() {
    const today = todayCounts();
    const cmp = (title, icon, baseFn, baseFmt) => `
      <div class="ff-tk-cmp">
        <div class="ff-tk-cmp-head">${TKIC[icon]} ${title}</div>
        ${TK_METRICS.map(m => {
          const now = today[m.key] || 0;
          const base = baseFn(m.key);
          return `<div class="ff-tk-cmp-row">
            <span class="ff-tk-cmp-name">${m.label}</span>
            <span class="ff-tk-cmp-now">${now}</span>
            <span class="ff-tk-cmp-vs">vs ${baseFmt(base)}</span>
            ${deltaHtml(now, base)}
          </div>`;
        }).join("")}
      </div>`;
    return `
      <div class="ff-tk-cmp-grid">
        ${cmp("vs Yesterday", "clock", yesterdayCount, v => v)}
        ${cmp("vs 7-Day Average", "cal", k => trailingAvg(k, 7), fmtAvg)}
      </div>`;
  }

  function renderTracker() {
    const scroll = $("ff-tracker-scroll");
    if (!scroll) return;
    const today = todayCounts();
    const streak = currentStreak();
    const longest = longestStreak();
    const metToday = dayMet(today);
    const goalsSet = TK_METRICS.some(m => (TK.goals[m.key] || 0) > 0);

    scroll.innerHTML = `
      <!-- chain hero -->
      <div class="ff-tk-card ff-tk-pad">
        <div class="ff-tk-hero">
          <span class="ff-tk-flame">${streak > 0 ? TKIC.flame : TKIC.leaf}</span>
          <div class="ff-tk-hero-txt">
            <div class="ff-tk-chain-n">${streak} Day Chain</div>
            <div class="ff-tk-chain-sub ${metToday ? "ff-on" : "ff-off"}">
              ${metToday ? "Today's target completed! 🎉"
                : goalsSet ? "Hit your targets to extend the chain"
                : "Set goals below to start your chain"}
            </div>
          </div>
          <div class="ff-tk-shield ${metToday ? "ff-on" : "ff-off"}">
            ${metToday ? TKIC.shieldOn : TKIC.shieldOff}
          </div>
        </div>
      </div>

      <!-- today's activity -->
      <div class="ff-tk-card">
        <div class="ff-tk-label">Today's Activity</div>
        <div class="ff-tk-metrics">
          ${TK_METRICS.map(m => {
            const v = today[m.key] || 0;
            const goal = TK.goals[m.key] || 0;
            const met = goal > 0 && v >= goal;
            return `
              <div class="ff-tk-metric">
                <div class="ff-tk-metric-lbl">${TKIC[m.icon]} ${m.label}</div>
                <div class="ff-tk-stepper ${met ? "ff-tk-met" : ""}">
                  <button class="ff-tk-step-btn" data-act="tk-bump" data-m="${m.key}" data-d="-1">−</button>
                  <span class="ff-tk-step-val">${v}</span>
                  <button class="ff-tk-step-btn" data-act="tk-bump" data-m="${m.key}" data-d="1">+</button>
                </div>
              </div>`;
          }).join("")}
        </div>
      </div>

      <!-- chain visualization -->
      <div class="ff-tk-card">
        <div class="ff-tk-viz-head">
          <div class="ff-tk-label" style="margin-bottom:0"><span class="ff-tk-info" title="Each block is a day. Green = all active targets met.">${TKIC.bars}</span> Chain Visualization</div>
          <select class="ff-tk-range" data-act="tk-range">
            <option value="14" ${TK.range===14?"selected":""}>Last 14 Days</option>
            <option value="30" ${TK.range===30?"selected":""}>Last 30 Days</option>
            <option value="60" ${TK.range===60?"selected":""}>Last 60 Days</option>
            <option value="90" ${TK.range===90?"selected":""}>Last 90 Days</option>
          </select>
        </div>
        <div class="ff-tk-viz-sub">Each block is a day. Green = target met · Gray = missed</div>
        ${renderChainViz()}
        <div class="ff-tk-streaks">
          <span class="ff-tk-streak">${TKIC.flame} Current Streak: <b>${streak} days</b></span>
          <span class="ff-tk-streak">${TKIC.star} Longest: <b>${longest} days</b></span>
        </div>
      </div>

      <!-- comparison -->
      <div class="ff-tk-card">
        <div class="ff-tk-label">Comparison</div>
        ${renderComparison()}
      </div>

      <!-- goals (the requirement bar) -->
      <div class="ff-tk-card">
        <div class="ff-tk-label">${TKIC.target} Daily Goals</div>
        <div class="ff-tk-goals">
          ${TK_METRICS.map(m => `
            <div class="ff-tk-goal-row">
              <span class="ff-tk-goal-lbl">${TKIC[m.icon]} ${m.label}</span>
              <div class="ff-tk-goal-stepper">
                <button data-act="tk-goal" data-m="${m.key}" data-d="-1">−</button>
                <span class="ff-tk-goal-val">${TK.goals[m.key] || 0}</span>
                <button data-act="tk-goal" data-m="${m.key}" data-d="1">+</button>
              </div>
            </div>`).join("")}
        </div>
        <div class="ff-tk-goal-hint">A day joins your chain only when every goal above (with a target greater than 0) is met. Set a goal to 0 to ignore that metric.</div>
      </div>
    `;
  }

  // ── tab switching ───────────────────────────────────────────────────────
  let currentView = "feeds";
  function switchView(view) {
    currentView = view;
    const feeds = view === "feeds";
    $("ff-view-feeds").classList.toggle("ff-hidden", !feeds);
    $("ff-view-tracker").classList.toggle("ff-hidden", feeds);
    $("ff-feeds-searchwrap").classList.toggle("ff-hidden", !feeds);
    $("ff-btn-new").classList.toggle("ff-hidden", !feeds);
    $("ff-nav-feeds").classList.toggle("ff-tab-active", feeds);
    $("ff-nav-tracker").classList.toggle("ff-tab-active", !feeds);
    if (!feeds) renderTracker();
    chrome.storage.local.set({ ff_view: view });
  }

  // ── boot ──────────────────────────────────────────────────────────────────
  (async()=>{
    const d = await new Promise(r=>chrome.storage.local.get({feeds:[],maxPerFeed:28,ff_open:true,ff_view:"feeds"},r));
    FEEDS=d.feeds||[]; MAX=d.maxPerFeed||28;
    isOpen = d.ff_open!==false;

    // load tracker state (merge so new metric keys/defaults survive upgrades)
    const saved = await getTracker();
    if (saved) {
      TK.goals = { ...TK.goals, ...(saved.goals || {}) };
      TK.days  = saved.days || {};
      TK.range = saved.range || 30;
    } else {
      await setTracker(); // seed defaults on first run
    }

    render();
    if (d.ff_view === "tracker") switchView("tracker");
    if (!isOpen) panel.classList.add("ff-min");
  })();
})();
