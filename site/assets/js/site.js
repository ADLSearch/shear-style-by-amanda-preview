/* Shear Style by Amanda — vanilla JS: menu, header state, reveals, hours, analytics events. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");

  /* Mobile menu */
  var toggle = document.querySelector("[data-menu-toggle]");
  var drawer = document.getElementById("drawer");
  if (toggle && drawer) {
    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.querySelector(".sr-only").textContent = open ? "Close menu" : "Open menu";
      drawer.hidden = !open;
    };
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { setOpen(false); toggle.focus(); }
    });
    drawer.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    window.addEventListener("resize", function () { if (window.innerWidth > 1080) setOpen(false); });
  }

  /* Header state */
  var header = document.querySelector("[data-header]");
  if (header) {
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 12); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Scroll reveals — never leave content stuck at opacity 0 */
  var reveals = document.querySelectorAll(".reveal");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var show = function (el) { el.classList.add("is-in"); };
  if (!("IntersectionObserver" in window) || reduce) {
    reveals.forEach(show);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } });
    }, { rootMargin: "80px 0px 80px 0px", threshold: 0.01 });
    reveals.forEach(function (el) {
      io.observe(el);
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight + 80 && r.bottom > -80) show(el);
    });
    window.setTimeout(function () { reveals.forEach(show); }, 1200);
  }

  /* Hours: highlight today + open/closed status in San Diego time */
  function laNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
      return { day: map[o.weekday], mins: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
    } catch (e) { return null; }
  }
  function toMin(t) { var a = t.split(":"); return +a[0] * 60 + +a[1]; }
  function fmt(t) { var a = t.split(":"), h = +a[0], m = a[1]; return (h % 12 || 12) + ":" + m + (h < 12 ? " AM" : " PM"); }
  var names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  document.querySelectorAll("[data-hours]").forEach(function (wrap) {
    var hours, now = laNow();
    try { hours = JSON.parse(wrap.getAttribute("data-hours")); } catch (e) { return; }
    if (!now) return;
    var row = wrap.querySelector('tr[data-day="' + now.day + '"]');
    if (row) row.classList.add("today");
    var status = wrap.querySelector("[data-open-status]");
    if (!status) return;
    var today = hours[now.day], msg, open = false;
    if (today[0] && now.mins >= toMin(today[0]) && now.mins < toMin(today[1])) {
      open = true; msg = "Open now · until " + fmt(today[1]);
    } else {
      for (var i = 0; i < 8; i++) {
        var d = (now.day + i) % 7, h = hours[d];
        if (!h[0]) continue;
        if (i === 0 && now.mins >= toMin(h[0])) continue;
        msg = "Closed now · opens " + (i === 0 ? "today" : i === 1 ? "tomorrow" : names[d]) + " at " + fmt(h[0]);
        break;
      }
    }
    status.innerHTML = '<span class="dot" aria-hidden="true"></span>' + (msg || "");
    status.classList.toggle("is-open", open);
  });

  /* Hero photo montage — crossfade; pause on hover/focus; respect reduced motion */
  (function () {
    var root = document.querySelector("[data-hero-montage]");
    if (!root) return;
    var slides = Array.prototype.slice.call(root.querySelectorAll(".hero-slide"));
    if (slides.length < 2) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      slides.forEach(function (s, i) { s.classList.toggle("is-active", i === 0); });
      return;
    }
    var i = slides.findIndex(function (s) { return s.classList.contains("is-active"); });
    if (i < 0) { i = 0; slides[0].classList.add("is-active"); }
    var timer = null;
    var INTERVAL = 4500;
    var pause = false;
    var tick = function () {
      if (pause) return;
      slides[i].classList.remove("is-active");
      i = (i + 1) % slides.length;
      slides[i].classList.add("is-active");
    };
    var start = function () {
      if (timer || pause) return;
      timer = window.setInterval(tick, INTERVAL);
    };
    var stop = function () {
      if (timer) { window.clearInterval(timer); timer = null; }
    };
    var setPaused = function (p) { pause = p; if (p) stop(); else start(); };
    var visual = root.closest(".hero-visual") || root;
    visual.addEventListener("mouseenter", function () { setPaused(true); });
    visual.addEventListener("mouseleave", function () { setPaused(false); });
    visual.addEventListener("focusin", function () { setPaused(true); });
    visual.addEventListener("focusout", function () {
      if (!visual.contains(document.activeElement)) setPaused(false);
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else if (!pause) start();
    });
    start();
  })();

  /* Analytics events (ready for Cloudflare/GA4/GTM; no-op if none installed) */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-event]");
    if (!a) return;
    var payload = { event: a.getAttribute("data-event"), cta_text: (a.textContent || "").trim().slice(0, 60), cta_location: a.getAttribute("data-cta") || "", page_path: location.pathname };
    if (payload.event === "booking_click") { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: "primary_cta_click", cta_text: payload.cta_text, cta_location: payload.cta_location, page_path: payload.page_path }); }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    if (typeof window.gtag === "function") window.gtag("event", payload.event, payload);
  });
})();
