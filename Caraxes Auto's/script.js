(function () {
  "use strict";

  /* ---- Edit these ---------------------------------------------------- */
  var CONFIG = {
    WA_NUMBER: "", // WhatsApp number, digits only with country code, e.g. 2348012345678
    PHONE_LABEL: "+000 000 000 0000", // how the number is shown on the page
    ADDRESS: "Showroom address goes here",
  };
  /* The intro film is intro.mp4, kept in the same folder as this page.
   To add a showroom video, set data-src="your-video.mp4" (and optionally data-poster="your-image.jpg")
   on any element with class "vid". Keep clips short and compressed. */
  /* -------------------------------------------------------------------- */

  var root = document.documentElement;
  var $ = function (s, r) {
    return (r || document).querySelector(s);
  };
  var $$ = function (s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  };
  var reduced =
    window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("locked");

  /* Prepare the hero while the intro is playing, then start it when the
     main page is revealed. This gives the large background video time to
     buffer without delaying the first page render. */
  var heroVideo = $(".hero-video");
  function connectionInfo() {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  }
  function shouldSkipVideo() {
    var connection = connectionInfo();
    return !!(
      reduced ||
      (connection &&
        (connection.saveData ||
          connection.effectiveType === "slow-2g" ||
          connection.effectiveType === "2g"))
    );
  }
  function heroSource() {
    var mobile = matchMedia("(max-width: 767px)").matches;
    var webm = heroVideo.canPlayType('video/webm; codecs="vp9"') !== "";
    var format = webm ? "webm" : "mp4";
    return heroVideo.getAttribute(
      "data-" + (mobile ? "mobile" : "desktop") + "-" + format,
    );
  }
  function startHeroVideo(playNow) {
    if (!heroVideo || shouldSkipVideo()) return;
    if (!heroVideo.src) {
      var src = heroSource();
      if (!src) return;
      heroVideo.src = src;
      heroVideo.preload = "auto";
      heroVideo.load();
    }
    if (playNow) {
      var pr = heroVideo.play();
      if (pr && pr.catch) pr.catch(function () {});
    }
  }

  /* ---- contact details ------------------------------------------------ */
  $("#waNum").textContent = CONFIG.PHONE_LABEL;
  $("#addr").textContent = CONFIG.ADDRESS;

  /* ---- video slots ---------------------------------------------------- */
  $$(".vid").forEach(function (v) {
    var src = v.getAttribute("data-src"),
      label = v.getAttribute("data-label") || "Video";
    if (src) {
      var el = document.createElement("video");
      el.src = src;
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.autoplay = true;
      el.preload = "metadata";
      var poster = v.getAttribute("data-poster");
      if (poster) el.poster = poster;
      el.setAttribute("aria-label", label);
      v.appendChild(el);
      if (el.play) {
        var pr = el.play();
        if (pr && pr.catch) pr.catch(function () {});
      }
    } else {
      v.insertAdjacentHTML(
        "beforeend",
        '<span class="play"></span><span class="tag">Video slot · ' +
          label +
          "</span>",
      );
      v.setAttribute("role", "img");
      v.setAttribute("aria-label", label + " (video placeholder)");
    }
  });

  /* ---- enquiry form --------------------------------------------------- */
  $$("[data-interest]").forEach(function (a) {
    a.addEventListener("click", function () {
      var sel = $("#f-interest");
      if (sel) sel.value = a.getAttribute("data-interest");
    });
  });
  var form = $("#leadForm"),
    out = $("#leadOut");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var nameEl = $("#f-name"),
      name = nameEl.value.trim();
    if (!name) {
      nameEl.focus();
      nameEl.setAttribute("aria-invalid", "true");
      return;
    }
    nameEl.removeAttribute("aria-invalid");
    var phone = $("#f-phone").value.trim(),
      interest = $("#f-interest").value,
      msg = $("#f-msg").value.trim();
    var text =
      "Hello Caraxes Auto's, my name is " +
      name +
      ". I am interested in: " +
      interest +
      "." +
      (msg ? " " + msg : "") +
      (phone ? " You can reach me on " + phone + "." : "");
    $("#waText").value = text;
    $("#waLink").href =
      "https://wa.me/" + CONFIG.WA_NUMBER + "?text=" + encodeURIComponent(text);
    $("#copyNote").textContent = CONFIG.WA_NUMBER
      ? ""
      : "Pick the sales contact in WhatsApp, then send.";
    out.hidden = false;
    out.scrollIntoView({ block: "nearest" });
  });
  $("#copyBtn").addEventListener("click", function () {
    var ta = $("#waText"),
      note = $("#copyNote");
    function fallback() {
      ta.focus();
      ta.select();
      note.textContent =
        "Message selected. Copy it with your keyboard or long press.";
    }
    try {
      navigator.clipboard.writeText(ta.value).then(function () {
        note.textContent = "Copied.";
      }, fallback);
    } catch (err) {
      fallback();
    }
  });

  /* ---- road strip, speedometer, scroll depth -------------------------- */
  var sections = $$("main > section");
  var ticksEl = $("#ticks"),
    ticks = [];
  var tiltEls = $$(".tilt");
  var arc = $("#gArc"),
    gNum = $("#gNum"),
    gGear = $("#gGear");
  var ARC = 119.4,
    p = 0,
    shown = 0,
    lastY = window.scrollY,
    lastT = performance.now(),
    raf = 0;

  function buildTicks() {
    ticksEl.textContent = "";
    ticks = [];
    var max = root.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    sections.forEach(function (s) {
      var k = Math.min(
        1,
        Math.max(0, (s.getBoundingClientRect().top + window.scrollY) / max),
      );
      var t = document.createElement("i");
      t.className = "tick";
      t.style.setProperty("--t", k.toFixed(4));
      t.setAttribute("data-k", k);
      ticksEl.appendChild(t);
      ticks.push(t);
    });
  }
  function setGauge(s) {
    var k = Math.min(1, s / 240);
    arc.style.strokeDashoffset = (ARC * (1 - k)).toFixed(1);
    gNum.textContent = Math.round(s);
    gGear.textContent = s < 6 ? "N" : "D" + Math.min(6, 1 + Math.floor(s / 36));
  }
  function tilt() {
    if (reduced) return;
    var vh = window.innerHeight;
    tiltEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var d = (r.top + r.height / 2 - vh * 0.5) / (vh * 0.5);
      d = Math.max(-1.3, Math.min(1.3, d));
      el.style.transform =
        "perspective(1000px) rotateX(" +
        (d * 7).toFixed(2) +
        "deg) translateZ(" +
        (-Math.abs(d) * 36).toFixed(1) +
        "px)";
    });
  }
  function update(now) {
    raf = 0;
    var max = Math.max(1, root.scrollHeight - window.innerHeight),
      y = window.scrollY;
    p = Math.min(1, Math.max(0, y / max));
    var dt = Math.max(1, now - lastT),
      vel = ((y - lastY) / dt) * 1000;
    lastY = y;
    lastT = now;
    root.style.setProperty("--p", p.toFixed(4));
    root.style.setProperty("--roff", (-y * 0.5).toFixed(1) + "px");
    var target = p * 190 + Math.min(70, Math.abs(vel) * 0.045);
    shown += (target - shown) * 0.14;
    setGauge(shown);
    ticks.forEach(function (t) {
      t.classList.toggle(
        "on",
        p >= parseFloat(t.getAttribute("data-k")) - 0.001,
      );
    });
    tilt();
    if (Math.abs(target - shown) > 0.5 || Math.abs(vel) > 5)
      raf = requestAnimationFrame(update);
  }
  function kick() {
    if (!raf) raf = requestAnimationFrame(update);
  }
  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", function () {
    buildTicks();
    kick();
  });
  window.addEventListener("load", function () {
    buildTicks();
    kick();
  });
  buildTicks();
  tilt();

  /* ---- gate -> intro film -> site -------------------------------------- */
  var gate = $("#gate"),
    loader = $("#loader"),
    wipe = $("#wipe"),
    vid = $("#introVid"),
    amb = $("#amb");
  var started = false,
    entered = false,
    failed = false,
    soundOn = true,
    ambRaf = 0;
  var ambCtx = amb.getContext ? amb.getContext("2d") : null;
  var wide = window.matchMedia
    ? matchMedia("(min-width: 900px) and (min-aspect-ratio: 3/4)")
    : { matches: false };
  var msgs = [
    [0, "Assembling the engine"],
    [0.4, "Tightening the last bolts"],
    [0.82, "Almost there"],
  ];
  var SWEEP_MID = 460,
    SWEEP_END = 1000;

  function sweep(mid) {
    wipe.hidden = false;
    wipe.className = "wipe";
    void wipe.offsetWidth;
    wipe.classList.add("cover");
    setTimeout(function () {
      mid();
      wipe.classList.remove("cover");
      wipe.classList.add("uncover");
    }, SWEEP_MID);
    setTimeout(function () {
      wipe.hidden = true;
      wipe.className = "wipe";
    }, SWEEP_END);
  }
  function tickIntro() {
    if (entered) return;
    var d = vid.duration || 14.9,
      k = Math.min(1, vid.currentTime / d);
    $("#lbar").style.transform = "scaleX(" + k.toFixed(4) + ")";
    $("#lpct").textContent = Math.round(k * 100) + "%";
    var m = msgs[0][1];
    for (var i = 0; i < msgs.length; i++) if (k >= msgs[i][0]) m = msgs[i][1];
    $("#lmsg").textContent = m;
    if (ambCtx && wide.matches) {
      try {
        ambCtx.drawImage(vid, 0, 0, amb.width, amb.height);
      } catch (e) {}
    }
    ambRaf = requestAnimationFrame(tickIntro);
  }
  function showSite() {
    cancelAnimationFrame(ambRaf);
    try {
      vid.pause();
    } catch (e) {}
    loader.hidden = true;
    gate.hidden = true;
    startHeroVideo(true);
    root.classList.remove("locked");
    window.scrollTo({ top: 0, behavior: "instant" });
    root.classList.add("entered");
    buildTicks();
    update(performance.now());
  }
  function enter() {
    if (entered) return;
    entered = true;
    sweep(showSite);
  }
  function fail() {
    failed = true;
    if (started && !loader.hidden) enter();
  }
  function shouldSkipIntro() {
    return shouldSkipVideo();
  }

  vid.addEventListener("ended", enter);
  vid.addEventListener("error", fail);
  $("#skipBtn").addEventListener("click", enter);
  $("#soundBtn").addEventListener("click", function () {
    soundOn = !soundOn;
    vid.muted = !soundOn;
    this.textContent = soundOn ? "Sound on" : "Sound off";
    this.setAttribute("aria-pressed", String(soundOn));
  });
  $("#gateBtn").addEventListener("click", function () {
    if (started) return;
    started = true;
    if (shouldSkipIntro()) {
      entered = false;
      sweep(function () {
        entered = true;
        showSite();
      });
      return;
    }
    startHeroVideo(false);
    vid.muted = false;
    vid.volume = 0.07;
    try {
      vid.currentTime = 0;
    } catch (e) {}
    var pr = vid.play();
    if (pr && pr.catch)
      pr.catch(function () {
        /* sound was refused: try again muted, and show the Sound button as off */
        soundOn = false;
        vid.muted = true;
        $("#soundBtn").textContent = "Sound off";
        $("#soundBtn").setAttribute("aria-pressed", "false");
        var p2 = vid.play();
        if (p2 && p2.catch) p2.catch(fail);
      });
    entered = false;
    sweep(function () {
      if (failed) {
        entered = true;
        showSite();
        return;
      }
      gate.hidden = true;
      loader.hidden = false;
      tickIntro();
    });
  });
  setGauge(0);
})();
