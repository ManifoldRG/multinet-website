(() => {
  // Where the maze backend lives: Cloud Run, one always-on container in
  // us-central1 (MultiNet-v2.0/deploy/CLOUDRUN.md). It must stay https - an
  // http endpoint is blocked as mixed content from multinet.ai.
  //
  // `?api=` overrides it, which is how you point this page at a local server
  // during development:
  //   .../index.html?api=http://127.0.0.1:8000
  // That origin has to be in the backend's MULTINET_CORS_ORIGINS or the
  // browser blocks the call before it leaves the machine.
  const API_DEFAULT = "https://multinet-maze-629742132540.us-central1.run.app";
  const API = new URLSearchParams(location.search).get("api") || API_DEFAULT;
  const FACING = ["East", "South", "West", "North"];
  const FACING_ARROW = ["→", "↓", "←", "↑"];

  // ---------------------------------------------------------------------------
  // DemoSounds — cute / high web voicing (not desktop). Soft blips & chimes.
  // ---------------------------------------------------------------------------
  const SAMPLE_RATE = 22050;
  const MASTER_GAIN = 0.2;

  function envelope(n, attack, release) {
    const attackN = Math.max(1, Math.floor(n * attack));
    const releaseN = Math.max(1, Math.floor(n * release));
    const sustainN = Math.max(0, n - attackN - releaseN);
    const env = new Float32Array(n);
    for (let i = 0; i < attackN; i++) env[i] = i / attackN;
    for (let i = 0; i < sustainN; i++) env[attackN + i] = 1;
    for (let i = 0; i < releaseN; i++) env[attackN + sustainN + i] = 1 - i / releaseN;
    return env;
  }

  function applyEnv(wave, attack, release) {
    const env = envelope(wave.length, attack, release);
    for (let i = 0; i < wave.length; i++) wave[i] *= env[i];
    return wave;
  }

  function sine(freq, durationMs, volume = 1, attack = 0.05, release = 0.4) {
    const n = Math.max(1, Math.floor((SAMPLE_RATE * durationMs) / 1000));
    const wave = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      wave[i] = Math.sin(2 * Math.PI * freq * (i / SAMPLE_RATE)) * volume;
    }
    return applyEnv(wave, attack, release);
  }

  /** Soft triangle — rounder / cuter than square, less harsh than sine alone. */
  function tri(freq, durationMs, volume = 1, attack = 0.05, release = 0.4) {
    const n = Math.max(1, Math.floor((SAMPLE_RATE * durationMs) / 1000));
    const wave = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = (freq * (i / SAMPLE_RATE)) % 1;
      wave[i] = (t < 0.5 ? 4 * t - 1 : 3 - 4 * t) * volume;
    }
    return applyEnv(wave, attack, release);
  }

  /** Upward or downward frequency sweep (chirp). */
  function chirp(f0, f1, durationMs, volume = 1, attack = 0.05, release = 0.45) {
    const n = Math.max(1, Math.floor((SAMPLE_RATE * durationMs) / 1000));
    const wave = new Float32Array(n);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const f = f0 + ((f1 - f0) * i) / Math.max(1, n - 1);
      phase += (2 * Math.PI * f) / SAMPLE_RATE;
      wave[i] = Math.sin(phase) * volume;
    }
    return applyEnv(wave, attack, release);
  }

  function noise(durationMs, volume = 1, attack = 0.02, release = 0.5, seed = 0) {
    const n = Math.max(1, Math.floor((SAMPLE_RATE * durationMs) / 1000));
    const wave = new Float32Array(n);
    let s = (seed + 1) >>> 0;
    const rand = () => {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < n; i++) wave[i] = (rand() * 2 - 1) * volume;
    return applyEnv(wave, attack, release);
  }

  function lowpass(wave, alpha) {
    const out = new Float32Array(wave.length);
    let acc = 0;
    for (let i = 0; i < wave.length; i++) {
      acc = acc + alpha * (wave[i] - acc);
      out[i] = acc;
    }
    return out;
  }

  function mix(...parts) {
    let length = 0;
    for (const p of parts) length = Math.max(length, p.length);
    const out = new Float32Array(length);
    for (const part of parts) {
      for (let i = 0; i < part.length; i++) out[i] += part[i];
    }
    let peak = 0;
    for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(out[i]));
    if (peak > 1) {
      for (let i = 0; i < length; i++) out[i] /= peak;
    }
    return out;
  }

  function concatParts(...parts) {
    let length = 0;
    for (const p of parts) length += p.length;
    const out = new Float32Array(length);
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }

  function buildWaveLibrary() {
    // Soft footfall tick — bright, short, playful
    const step = mix(
      tri(1680, 42, 0.42, 0.01, 0.85),
      sine(2520, 28, 0.18, 0.01, 0.9),
    );
    // Tiny upward wink on turn
    const turn = mix(
      chirp(1500, 2100, 48, 0.38, 0.01, 0.8),
      sine(2400, 30, 0.12, 0.02, 0.9),
    );
    // Soft “bonk” — cute reject, not a thud
    const wall = mix(
      sine(340, 90, 0.38, 0.02, 0.7),
      chirp(720, 480, 70, 0.28, 0.02, 0.75),
      sine(1100, 45, 0.12, 0.03, 0.85),
    );
    // Sparkly pickup chime
    const pickup = mix(
      chirp(980, 1560, 110, 0.4, 0.02, 0.55),
      sine(1960, 140, 0.28, 0.08, 0.6),
      sine(2940, 100, 0.12, 0.12, 0.7),
    );
    // Door open — light rising shimmer, not a rumble
    const door = mix(
      chirp(620, 980, 160, 0.35, 0.03, 0.55),
      sine(1310, 120, 0.22, 0.08, 0.6),
      sine(1960, 90, 0.1, 0.12, 0.7),
    );
    // Crisp candy click
    const switchClick = mix(
      sine(2800, 28, 0.45, 0.005, 0.9),
      sine(1680, 36, 0.22, 0.01, 0.85),
      chirp(2200, 3200, 22, 0.15, 0.005, 0.95),
    );
    // Soft “nope” — higher, gentle
    const invalid = mix(
      chirp(620, 420, 100, 0.32, 0.04, 0.6),
      sine(840, 70, 0.12, 0.05, 0.7),
    );

    // Bright major sparkle: C6 → E6 → G6
    const noteMs = 120;
    const gap = Math.floor(SAMPLE_RATE * 0.028);
    const success = concatParts(
      mix(sine(1046.5, noteMs, 0.42, 0.03, 0.5), sine(1568, noteMs, 0.12, 0.08, 0.6)),
      new Float32Array(gap),
      mix(sine(1318.5, noteMs, 0.42, 0.03, 0.5), sine(1976, noteMs, 0.12, 0.08, 0.6)),
      new Float32Array(gap),
      mix(
        sine(1568, 180, 0.48, 0.03, 0.55),
        sine(2349, 180, 0.16, 0.1, 0.65),
        chirp(1568, 2093, 100, 0.12, 0.05, 0.7),
      ),
    );

    // Light restart whoosh — airy, high
    const whoosh = mix(
      chirp(1400, 480, 140, 0.28, 0.04, 0.55),
      lowpass(noise(130, 0.18, 0.03, 0.6, 6), 0.35),
      sine(2200, 50, 0.08, 0.05, 0.85),
    );

    // Soft page-flip navigate
    const navigate = mix(
      chirp(900, 1600, 90, 0.28, 0.03, 0.6),
      sine(1800, 55, 0.14, 0.04, 0.8),
      lowpass(noise(70, 0.1, 0.02, 0.75, 7), 0.4),
    );

    return {
      step,
      turn,
      wall,
      pickup,
      door,
      switch: switchClick,
      invalid,
      success,
      restart: whoosh,
      navigate,
    };
  }

  function buffersFromWaves(ctx, waves) {
    const outRate = ctx.sampleRate || SAMPLE_RATE;
    const buffers = {};
    for (const [name, wave] of Object.entries(waves)) {
      const outLen = Math.max(1, Math.round((wave.length * outRate) / SAMPLE_RATE));
      const buf = ctx.createBuffer(1, outLen, outRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < outLen; i++) {
        const srcPos = (i * (wave.length - 1)) / Math.max(1, outLen - 1);
        const i0 = Math.floor(srcPos);
        const i1 = Math.min(wave.length - 1, i0 + 1);
        const t = srcPos - i0;
        const sample = wave[i0] * (1 - t) + wave[i1] * t;
        data[i] = Math.max(-1, Math.min(1, sample * MASTER_GAIN));
      }
      buffers[name] = buf;
    }
    return buffers;
  }

  const sounds = {
    ctx: null,
    master: null,
    buffers: null,
    enabled: true,
    ready: null,
    async unlock() {
      if (!this.enabled) return false;
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) {
          this.enabled = false;
          return false;
        }
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 1;
        this.master.connect(this.ctx.destination);
        this.buffers = buffersFromWaves(this.ctx, buildWaveLibrary());
      }
      if (this.ctx.state === "suspended") {
        try {
          await this.ctx.resume();
        } catch (_) {
          return false;
        }
      }
      return this.ctx.state === "running";
    },
    async play(name) {
      if (!name || !this.enabled) return;
      const ok = await this.unlock();
      if (!ok || !this.buffers) return;
      const buf = this.buffers[name];
      if (!buf) return;
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.master || this.ctx.destination);
        src.start(0);
      } catch (_) {
        /* ignore */
      }
    },
  };

  const CONTROLS = [
    ["↑", "Move Forward", "MOVE_FORWARD", "move"],
    ["←", "Turn Left", "TURN_LEFT", "move"],
    ["→", "Turn Right", "TURN_RIGHT", "move"],
    ["Space", "Pickup Key", "PICKUP", "interact"],
    ["X", "Drop Key", "DROP", "interact"],
    ["T", "Toggle Switch / Open Door", "TOGGLE", "interact"],
    ["R", "Restart", null, "meta"],
  ];

  const MECH = {
    red: "#e6194b",
    green: "#3cb44b",
    blue: "#4363d8",
    purple: "#911eb4",
    yellow: "#ffe119",
    grey: "#a9a9a9",
    gray: "#a9a9a9",
  };

  const KEY_TO_ACTION = {
    w: "MOVE_FORWARD",
    arrowup: "MOVE_FORWARD",
    a: "TURN_LEFT",
    arrowleft: "TURN_LEFT",
    d: "TURN_RIGHT",
    arrowright: "TURN_RIGHT",
    " ": "PICKUP",
    x: "DROP",
    t: "TOGGLE",
    e: "TOGGLE",
    backspace: "DONE",
  };

  const els = {
    error: document.getElementById("error"),
    splash: document.getElementById("splash"),
    card: document.getElementById("card"),
    end: document.getElementById("end"),
    grid: document.getElementById("grid"),
    taskId: document.getElementById("task-id"),
    taskText: document.getElementById("task-text"),
    progress: document.getElementById("progress"),
    facing: document.getElementById("facing"),
    carrying: document.getElementById("carrying"),
    controls: document.getElementById("controls"),
    endTitle: document.getElementById("end-title"),
    endDesc: document.getElementById("end-desc"),
    endDiff: document.getElementById("end-diff"),
    endSteps: document.getElementById("end-steps"),
    endScore: document.getElementById("end-score"),
    endFrame: document.getElementById("end-frame"),
    endRows: document.getElementById("end-rows"),
    endDownload: document.getElementById("end-download"),
    pageTitle: document.getElementById("page-title"),
    pageDesc: document.getElementById("page-desc"),
    overlay: document.getElementById("overlay"),
    overlayTitle: document.getElementById("overlay-title"),
    overlayBody: document.getElementById("overlay-body"),
    overlayClose: document.getElementById("overlay-close"),
  };

  // ---------------------------------------------------------------------------
  // DemoFx — bounce, flash, fade, press, goal pulse
  // ---------------------------------------------------------------------------
  const fx = {
    layer: null,
    raf: 0,
    clear() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      if (els.grid) els.grid.style.transform = "";
      if (this.layer) this.layer.innerHTML = "";
    },
    ensureLayer() {
      if (this.layer || !els.grid) return;
      const stage = els.grid.parentElement;
      if (!stage) return;
      this.layer = document.createElement("div");
      this.layer.className = "fx-layer";
      this.layer.setAttribute("aria-hidden", "true");
      stage.appendChild(this.layer);
    },
    placeCell(effect) {
      const [cx, cy] = effect.cell || [0, 0];
      const gridW = Math.max(1, effect.gridW || 1);
      const gridH = Math.max(1, effect.gridH || 1);
      const el = document.createElement("div");
      el.className = "fx-cell";
      el.style.left = `${(cx / gridW) * 100}%`;
      el.style.top = `${(cy / gridH) * 100}%`;
      el.style.width = `${100 / gridW}%`;
      el.style.height = `${100 / gridH}%`;
      return el;
    },
    loadTile(img) {
      if (img.complete && img.naturalWidth) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    },
    play(effects) {
      this.clear();
      if (!effects || !effects.length) return Promise.resolve();
      this.ensureLayer();
      const waiters = [];
      for (const effect of effects) {
        if (effect.kind === "bounce") waiters.push(this.bounce(effect));
        else if (effect.kind === "pulse") waiters.push(this.pulse(effect));
        else if (effect.kind === "flash") waiters.push(this.flash(effect));
        else if (effect.kind === "fade") waiters.push(this.fade(effect));
        else if (effect.kind === "press") waiters.push(this.press(effect));
      }
      return Promise.all(waiters);
    },
    bounce(effect) {
      const dx = effect.dx || 0;
      const dy = effect.dy || 0;
      const duration = Math.max(1, effect.durationMs || 100);
      const start = performance.now();
      return new Promise((resolve) => {
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const amp = (1 - t) * (1 - t);
          els.grid.style.transform = `translate(${dx * amp}px, ${dy * amp}px)`;
          if (t < 1) this.raf = requestAnimationFrame(tick);
          else {
            els.grid.style.transform = "";
            resolve();
          }
        };
        this.raf = requestAnimationFrame(tick);
      });
    },
    pulse(effect) {
      if (!this.layer) return Promise.resolve();
      const cell = this.placeCell(effect);
      cell.classList.add("fx-pulse");
      this.layer.appendChild(cell);
      const duration = Math.max(1, effect.durationMs || 320);
      const start = performance.now();
      return new Promise((resolve) => {
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const amp = Math.sin(t * Math.PI);
          cell.style.background = `rgba(90, 220, 140, ${0.43 * amp})`;
          if (t < 1) requestAnimationFrame(tick);
          else {
            cell.remove();
            resolve();
          }
        };
        requestAnimationFrame(tick);
      });
    },
    async flash(effect) {
      if (!this.layer || !effect.tileImage) return;
      const cell = this.placeCell(effect);
      const img = document.createElement("img");
      img.src = effect.tileImage;
      img.alt = "";
      const white = document.createElement("div");
      white.className = "fx-flash-white";
      cell.appendChild(img);
      cell.appendChild(white);
      this.layer.appendChild(cell);
      await this.loadTile(img);
      const duration = Math.max(1, effect.durationMs || 140);
      const start = performance.now();
      await new Promise((resolve) => {
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          // Brief white flash, then fade the pre-pickup key out.
          if (t < 0.35) {
            white.style.opacity = String(0.55 * (t / 0.35));
            img.style.opacity = "1";
          } else {
            white.style.opacity = "0";
            img.style.opacity = String(1 - t);
          }
          if (t < 1) requestAnimationFrame(tick);
          else {
            cell.remove();
            resolve();
          }
        };
        requestAnimationFrame(tick);
      });
    },
    async fade(effect) {
      if (!this.layer || !effect.tileImage) return;
      const cell = this.placeCell(effect);
      const img = document.createElement("img");
      img.src = effect.tileImage;
      img.alt = "";
      cell.appendChild(img);
      this.layer.appendChild(cell);
      await this.loadTile(img);
      const duration = Math.max(1, effect.durationMs || 150);
      const start = performance.now();
      await new Promise((resolve) => {
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          img.style.opacity = String(1 - t);
          if (t < 1) requestAnimationFrame(tick);
          else {
            cell.remove();
            resolve();
          }
        };
        requestAnimationFrame(tick);
      });
    },
    async press(effect) {
      if (!this.layer) return;
      const cell = this.placeCell(effect);
      cell.classList.add("press");
      let img = null;
      if (effect.tileImage) {
        img = document.createElement("img");
        img.src = effect.tileImage;
        img.alt = "";
        cell.appendChild(img);
      }
      this.layer.appendChild(cell);
      if (img) await this.loadTile(img);
      const duration = Math.max(1, effect.durationMs || 80);
      const start = performance.now();
      await new Promise((resolve) => {
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const amp = Math.sin(t * Math.PI);
          const scale = 1 - 0.06 * amp;
          if (img) img.style.transform = `scale(${scale})`;
          if (t < 1) requestAnimationFrame(tick);
          else {
            cell.remove();
            resolve();
          }
        };
        requestAnimationFrame(tick);
      });
    },
  };

  const playHost = document.getElementById("play-host");
  const focusKeyboard = document.body.classList.contains("play-focus-keys");

  let gameId = null;
  let task = null;
  let view = null;
  let playing = false;
  let busy = false;
  let overlayMode = null; // "settings" | "model" | null
  let cachedSettings = null;
  let hostFocused = !focusKeyboard;
  let hostVisible = true;

  function keyboardActive() {
    if (!focusKeyboard) return true;
    return hostFocused && hostVisible;
  }

  function releaseGameKeys() {
    hostFocused = false;
    if (playHost && document.activeElement === playHost) playHost.blur();
  }

  if (playHost && focusKeyboard) {
    playHost.addEventListener("pointerdown", () => {
      hostFocused = true;
      playHost.focus({ preventScroll: true });
    });
    playHost.addEventListener("focusin", () => {
      hostFocused = true;
    });
    playHost.addEventListener("focusout", (ev) => {
      if (!playHost.contains(ev.relatedTarget)) hostFocused = false;
    });
    document.addEventListener("pointerdown", (ev) => {
      if (!playHost.contains(ev.target)) releaseGameKeys();
    });
    // Scrolling away keeps DOM focus on the board; release keys when mostly off-screen.
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        ([entry]) => {
          hostVisible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
          if (!hostVisible) releaseGameKeys();
        },
        { threshold: [0, 0.35, 0.7, 1] },
      );
      io.observe(playHost);
    }
  }

  function svgIcon(kind, color) {
    const c = color || "#c9ccd9";
    if (kind === "key") {
      return `<svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="12" r="4" fill="none" stroke="${c}" stroke-width="2"/><path d="M12 12h9M17 12v4M20 12v3" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/></svg>`;
    }
    if (kind === "bag") {
      return `<svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="9" width="12" height="10" rx="2" fill="none" stroke="${c}" stroke-width="2"/><path d="M9 9V7a3 3 0 0 1 6 0v2" fill="none" stroke="${c}" stroke-width="2"/></svg>`;
    }
    if (kind === "door") {
      return `<svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="1" fill="none" stroke="${c}" stroke-width="2"/><circle cx="14" cy="12" r="1.2" fill="${c}"/></svg>`;
    }
    if (kind === "switch") {
      return `<svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="9" width="16" height="6" rx="3" fill="none" stroke="${c}" stroke-width="2"/><circle cx="15" cy="12" r="2.5" fill="${c}"/></svg>`;
    }
    if (kind === "gate") {
      return `<svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V6l7-3 7 3v14" fill="none" stroke="${c}" stroke-width="2"/><path d="M9 20v-8h6v8" fill="none" stroke="${c}" stroke-width="2"/></svg>`;
    }
    if (kind === "goal") {
      return `<svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="4" width="10" height="8" rx="2" fill="none" stroke="${c}" stroke-width="2"/><path d="M12 12v5M9 20h6" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/></svg>`;
    }
    if (kind === "block") {
      return `<svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="${c}" stroke-width="2"/></svg>`;
    }
    return `<span class="play-icon bullet" style="background:${c}"></span>`;
  }

  function doReset() {
    withBusy(async () => {
      const data = await api(`/api/game/${gameId}/reset`, {});
      fx.clear();
      closeOverlay();
      await sounds.play(data.sfx);
      render(null, data.view);
    });
  }

  CONTROLS.forEach(([key, label, action, kind]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = kind;
    btn.innerHTML = `<span class="key">${key}</span><span class="desc">${label}</span>`;
    btn.onclick = () => {
      if (action === null) doReset();
      else sendAction(action);
    };
    els.controls.appendChild(btn);
  });

  async function api(path, body, method) {
    const opts = {
      method: method || (arguments.length >= 2 ? "POST" : "GET"),
      headers: {},
    };
    if (opts.method !== "GET") {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body ?? {});
    }
    const res = await fetch(API + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || res.statusText);
    }
    return res.json();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function closeOverlay() {
    overlayMode = null;
    if (!els.overlay) return;
    els.overlay.hidden = true;
    const card = els.overlay.querySelector(".play-overlay-card");
    if (card) card.classList.remove("model");
    if (els.overlayBody) els.overlayBody.innerHTML = "";
  }

  function renderSettingsBody(settings) {
    cachedSettings = settings;
    const editable = !!settings.editable;
    const rows = (settings.axes || [])
      .map((axis) => {
        const rowClass = editable ? "settings-row is-editable" : "settings-row";
        const title = editable ? ` title="Press ${escapeHtml(axis.key)} to cycle"` : "";
        return (
          `<div class="${rowClass}" data-setting-key="${escapeHtml(axis.key)}"${title}>` +
          `<span class="settings-key">${escapeHtml(axis.key)}</span>` +
          `<span class="settings-attr">${escapeHtml(axis.attr)} = <strong>${escapeHtml(
            String(axis.value),
          )}</strong></span>` +
          `</div>`
        );
      })
      .join("");
    let manifest = "";
    const row = settings.manifestRow;
    if (row) {
      const bits = [
        `experiment: ${row.experiment ?? "?"}`,
        `condition: ${row.condition ?? "?"}`,
      ];
      if (row.variant) bits.push(`variant: ${row.variant}`);
      const mechs = row.expected_mechanisms || [];
      manifest =
        `<div class="manifest-block"><h4>Manifest row</h4>` +
        `<p>${escapeHtml(bits.join(" · "))}</p>` +
        (mechs.length
          ? `<p>expected mechanisms: ${escapeHtml(mechs.join(", "))}</p>`
          : "") +
        (row.notes ? `<p>${escapeHtml(row.notes)}</p>` : "") +
        `</div>`;
    }
    return (
      `<p class="play-overlay-help">${escapeHtml(settings.help || "")}</p>` +
      rows +
      manifest
    );
  }

  function cycleSetting(key) {
    if (!gameId || !cachedSettings || !cachedSettings.editable) return;
    withBusy(async () => {
      const data = await api(`/api/game/${gameId}/setting`, { key: String(key) });
      if (data.settings) {
        els.overlayBody.innerHTML = renderSettingsBody(data.settings);
      }
      if (data.view) await render(null, data.view);
    });
  }

  function renderModelViewBody(data) {
    const sections = (data.sections || [])
      .map(
        (sec) =>
          `<div class="overlay-section">` +
          `<h4>${escapeHtml(sec.title)}</h4>` +
          `<pre>${escapeHtml(sec.text || "")}</pre>` +
          `</div>`,
      )
      .join("");
    return (
      `<p class="play-overlay-help">` +
      `observation=${escapeHtml(data.observation)} · ` +
      `context_window=${escapeHtml(data.contextWindow)}` +
      `</p>` +
      (sections || `<p class="play-overlay-help">No model-view sections yet.</p>`)
    );
  }

  async function openSettings() {
    if (!gameId || !els.overlay) return;
    overlayMode = "settings";
    els.overlay.hidden = false;
    const card = els.overlay.querySelector(".play-overlay-card");
    if (card) card.classList.remove("model");
    els.overlayTitle.textContent = "Settings";
    els.overlayBody.innerHTML = `<p class="play-overlay-help">Loading…</p>`;
    try {
      // Always refetch so editable/frozen and values stay in sync with the API.
      const settings = await api(`/api/game/${gameId}/settings`);
      els.overlayBody.innerHTML = renderSettingsBody(settings);
    } catch (err) {
      els.overlayBody.innerHTML = `<p class="play-overlay-help">${escapeHtml(
        err.message || err,
      )}</p>`;
    }
  }

  async function openModelView() {
    if (!gameId || !els.overlay) return;
    overlayMode = "model";
    els.overlay.hidden = false;
    const card = els.overlay.querySelector(".play-overlay-card");
    if (card) card.classList.add("model");
    els.overlayTitle.textContent = "Model view";
    els.overlayBody.innerHTML = `<p class="play-overlay-help">Loading…</p>`;
    try {
      const data = await api(`/api/game/${gameId}/model-view`);
      els.overlayBody.innerHTML = renderModelViewBody(data);
    } catch (err) {
      els.overlayBody.innerHTML = `<p class="play-overlay-help">${escapeHtml(
        err.message || err,
      )}</p>`;
    }
  }

  function toggleOverlay(mode) {
    if (overlayMode === mode) {
      closeOverlay();
      return;
    }
    if (mode === "settings") openSettings();
    else if (mode === "model") openModelView();
  }

  async function downloadTrajectory() {
    if (!gameId) return;
    withBusy(async () => {
      const data = await api(`/api/game/${gameId}/trajectory`);
      const taskId = (data.task_id || task?.taskId || "task").replace(
        /[^\w.-]+/g,
        "_",
      );
      const stamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "")
        .replace("T", "_")
        .slice(0, 15);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trajectory_${taskId}_${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  if (els.overlayClose) els.overlayClose.onclick = () => closeOverlay();
  if (els.overlay) {
    els.overlay.addEventListener("click", (ev) => {
      if (ev.target === els.overlay) closeOverlay();
    });
  }
  if (els.overlayBody) {
    els.overlayBody.addEventListener("click", (ev) => {
      const row = ev.target.closest("[data-setting-key]");
      if (!row || !cachedSettings || !cachedSettings.editable) return;
      cycleSetting(row.getAttribute("data-setting-key"));
    });
  }
  if (els.endDownload) els.endDownload.onclick = () => downloadTrajectory();

  function setStat(el, label, valueHtml) {
    el.innerHTML =
      `<span class="stat-label">${label}</span>` +
      `<span class="stat-value">${valueHtml}</span>`;
  }

  function renderProgress(progress) {
    els.progress.innerHTML = "";
    if (!progress.length) return;
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = "Progress";
    els.progress.appendChild(label);
    progress.forEach((p) => {
      const li = document.createElement("li");
      const color = (p.color && MECH[p.color]) || "#e2e5ee";
      li.innerHTML = svgIcon(p.icon, color);
      const text = document.createElement("span");
      text.className = "progress-text";
      const mech = document.createElement("span");
      mech.className = "mech";
      mech.textContent = p.objectPhrase;
      mech.style.color = color;
      text.append(p.prefix, mech, p.suffix);
      li.appendChild(text);
      els.progress.appendChild(li);
    });
    // Keep the latest milestone in view once the list overflows.
    requestAnimationFrame(() => {
      els.progress.scrollTop = els.progress.scrollHeight;
    });
  }

  function difficultyColor(tier) {
    if (tier >= 5) return "#ff4856";
    if (tier >= 3) return "#ffc430";
    return "#40ff8c";
  }

  function renderEnd(v) {
    const success = v.success;
    els.end.className = success ? "success show" : "fail show";
    els.endTitle.textContent = success
      ? "You solved it!"
      : v.endReason === "stalled"
        ? "Stalled"
        : "Out of steps";

    // The end screen is kept minimal: the maze description, the difficulty
    // tier and the trajectory download are all optional markup now, so guard
    // rather than assume. See the panel in index.html.
    if (els.endDesc) els.endDesc.textContent = task.description || "";

    const tier = task.difficultyTier || 0;
    if (els.endDiff) {
      if (tier) {
        els.endDiff.style.display = "";
        els.endDiff.innerHTML =
          `Maze difficulty: <span style="color:${difficultyColor(tier)}">${tier} / 6</span>`;
      } else {
        els.endDiff.style.display = "none";
      }
    }

    els.endSteps.textContent = success
      ? `Completed in ${v.stepCount} steps`
      : `Used ${v.stepCount} / ${v.maxSteps} steps`;

    // How the run compares to the oracle, as a sentence. No score: a
    // percentage invites optimising the number rather than reading the maze.
    const opt = v.comparison.optimalSteps;
    const over = v.stepCount - opt;
    els.endScore.textContent = !success
      ? `The optimal solution takes ${opt} steps.`
      : over > 0
        ? `You took ${over} ${over === 1 ? "step" : "steps"} more than the optimal steps required to solve this maze.`
        : "You matched the optimal steps required to solve this maze.";

    const models = v.comparison.models;
    const beatAll =
      success && models.every((m) => !m.success || v.stepCount < m.steps);
    const anySolved = models.some((m) => m.success);
    let frame;
    let frameClass = "neutral";
    if (success && beatAll) {
      frame = "You beat every model on this maze.";
      frameClass = "good";
    } else if (success && anySolved) {
      frame = "How you stacked up against the models";
    } else if (success) {
      frame = "None of the models solved this one.";
      frameClass = "good";
    } else {
      frame = "How the models did on this maze";
    }
    els.endFrame.textContent = frame;
    els.endFrame.className = frameClass;

    const youDetail = success
      ? `${v.stepCount} steps  -  solved`
      : `${v.stepCount} steps  -  failed`;
    const rows = [[ "You", youDetail, "you", success ? "ok-result" : "fail-result" ]].concat(
      models.map((m) => {
        let detail = `${m.steps} steps`;
        let resultClass = "fail-result";
        if (m.success) {
          resultClass = "ok-result";
          if (success && v.stepCount < m.steps) detail += "  -  you were faster";
          else if (success && v.stepCount === m.steps) detail += "  -  tied";
          else detail += "  -  solved";
        }
        return [m.displayName, detail, "", resultClass];
      }),
    );
    els.endRows.innerHTML = rows
      .map(
        ([name, detail, nameClass, resultClass]) =>
          `<tr><td class="${nameClass}">${name}</td><td class="${resultClass}">${detail}</td></tr>`,
      )
      .join("");
  }

  function syncUrl() {
    const url = new URL(location.href);
    url.searchParams.set("task", task.taskId);
    history.replaceState(null, "", url);
    document.title = `MultiNet · ${task.taskId}`;
  }

  function waitForGrid() {
    return new Promise((resolve) => {
      if (!els.grid) return resolve();
      if (els.grid.complete) {
        // Force a paint before FX so overlays aren't eaten by decode work.
        requestAnimationFrame(() => resolve());
        return;
      }
      const done = () => {
        els.grid.removeEventListener("load", done);
        els.grid.removeEventListener("error", done);
        requestAnimationFrame(() => resolve());
      };
      els.grid.addEventListener("load", done);
      els.grid.addEventListener("error", done);
    });
  }

  async function render(nextTask, nextView, opts = {}) {
    task = nextTask || task;
    view = nextView;
    els.taskId.textContent = `Task ${task.taskIndex + 1} / ${task.taskCount}`;
    els.taskText.textContent = task.instruction;
    if (els.pageTitle) {
      els.pageTitle.textContent = task.description || task.taskId;
    }
    if (els.pageDesc) {
      els.pageDesc.textContent = task.description
        ? `${task.taskId} · ${task.taskIndex + 1} / ${task.taskCount}`
        : task.instruction;
    }
    if (els.grid.src !== view.gridImage) {
      els.grid.src = view.gridImage;
      await waitForGrid();
    } else {
      await new Promise((r) => requestAnimationFrame(r));
    }

    const dir = FACING[view.facing];
    setStat(
      els.facing,
      "Facing",
      `<span class="facing-icon">${FACING_ARROW[view.facing]}</span> ${dir}`,
    );

    if (view.carrying) {
      const color = MECH[view.carrying] || "#ffba52";
      setStat(els.carrying, "Inventory", `${svgIcon("key", color)}`);
    } else {
      setStat(els.carrying, "Inventory", `${svgIcon("bag", "#989baa")}`);
    }

    renderProgress(view.progress);
    syncUrl();

    if (!view.done) {
      els.end.className = "";
      return;
    }

    // Defer success overlay so the goal pulse can play on the open grid.
    if (view.success && opts.deferEnd) {
      els.end.className = "";
      return;
    }

    renderEnd(view);
  }

  async function withBusy(fn) {
    if (busy || !gameId) return;
    busy = true;
    try {
      await fn();
    } catch (err) {
      els.error.style.display = "block";
      els.error.textContent = String(err.message || err);
    } finally {
      busy = false;
    }
  }

  function sendAction(action) {
    if (!playing || (view && view.done)) return;
    withBusy(async () => {
      const data = await api(`/api/game/${gameId}/action`, { action });
      await sounds.play(data.sfx);
      const effects = data.effects || [];
      const pulse = effects.find((e) => e.kind === "pulse");
      // Paint the new grid first (keep end overlay off during success pulse).
      await render(null, data.view, { deferEnd: !!pulse });
      await fx.play(effects);
      if (pulse && view && view.done && view.success) renderEnd(view);
    });
  }

  async function beginPlay() {
    await sounds.unlock();
    playing = true;
    els.splash.classList.remove("show");
    els.card.style.display = "block";
    if (playHost) playHost.focus({ preventScroll: true });
    // Confirm audio is live (same family as a turn click).
    await sounds.play("turn");
  }

  document.getElementById("splash-play").onclick = beginPlay;

  document.getElementById("prev").onclick = () =>
    withBusy(async () => {
      const data = await api(`/api/game/${gameId}/navigate`, { delta: -1 });
      fx.clear();
      closeOverlay();
      cachedSettings = null;
      await sounds.play(data.sfx);
      render(data.task, data.view);
    });

  document.getElementById("next").onclick = () =>
    withBusy(async () => {
      const data = await api(`/api/game/${gameId}/navigate`, { delta: 1 });
      fx.clear();
      closeOverlay();
      cachedSettings = null;
      await sounds.play(data.sfx);
      render(data.task, data.view);
    });

  const pagePrev = document.getElementById("page-prev");
  const pageNext = document.getElementById("page-next");
  if (pagePrev) pagePrev.onclick = () => document.getElementById("prev").click();
  if (pageNext) pageNext.onclick = () => document.getElementById("next").click();

  window.addEventListener("keydown", (ev) => {
    // The board is embedded in a long page, so every key it claims is a key the
    // page loses. Nothing is claimed unless the board is focused and on screen -
    // otherwise Space/Enter would stop scrolling the page before play begins.
    if (!keyboardActive()) return;

    // Splash: Enter/Space start play (matches on-screen copy).
    if (!playing) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        beginPlay();
      }
      return;
    }

    // Overlays: Esc closes; Tab/M toggle; number keys cycle settings when editable.
    if (overlayMode) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        closeOverlay();
        return;
      }
      if (ev.key === "Tab") {
        ev.preventDefault();
        toggleOverlay("settings");
        return;
      }
      if (ev.key === "m" || ev.key === "M") {
        ev.preventDefault();
        toggleOverlay("model");
        return;
      }
      if (
        overlayMode === "settings" &&
        cachedSettings &&
        cachedSettings.editable &&
        /^[1-9]$/.test(ev.key)
      ) {
        const axis = (cachedSettings.axes || []).find((a) => String(a.key) === ev.key);
        if (axis) {
          ev.preventDefault();
          cycleSetting(ev.key);
        }
        return;
      }
      return;
    }

    if (ev.key === "Tab") {
      ev.preventDefault();
      toggleOverlay("settings");
      return;
    }
    if (ev.key === "m" || ev.key === "M") {
      ev.preventDefault();
      toggleOverlay("model");
      return;
    }
    if (ev.key === "Escape") {
      return;
    }
    if (ev.key === "r" || ev.key === "R") {
      ev.preventDefault();
      doReset();
      return;
    }
    if (ev.key === "[") {
      ev.preventDefault();
      document.getElementById("prev").click();
      return;
    }
    if (ev.key === "]") {
      ev.preventDefault();
      document.getElementById("next").click();
      return;
    }
    const action = KEY_TO_ACTION[ev.key.toLowerCase()];
    if (!action) return;
    ev.preventDefault();
    sendAction(action);
  });

  (async () => {
    try {
      const params = new URLSearchParams(location.search);
      let taskId = params.get("task");
      if (!taskId) {
        const res = await fetch(API + "/api/game/tasks");
        const data = await res.json();
        taskId = data.tasks[0].taskId;
      }
      const data = await api("/api/game/start", { taskId });
      gameId = data.gameId;
      cachedSettings = data.settings || null;
      render(data.task, data.view);
      els.splash.classList.add("show");
    } catch (err) {
      // Visitor-facing. The operator detail goes to the console, not the page -
      // this text is what someone sees if the backend is down on launch day.
      els.error.style.display = "block";
      els.error.textContent =
        "The playable maze is unavailable right now. The failure replays above " +
        "show the same mazes being attempted by frontier models.";
      console.error(
        "[MultiNet demo] Could not reach the maze API at " + API + " - " + (err.message || err) +
        "\nRun one locally with: uvicorn demo.api.app:app --reload --app-dir ." +
        "\nThen load this page with ?api=http://127.0.0.1:8000",
      );
    }
  })();
})();
