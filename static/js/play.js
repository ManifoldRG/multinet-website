(() => {
  const API = new URLSearchParams(location.search).get("api") || "http://127.0.0.1:8000";
  const FACING = ["East", "South", "West", "North"];
  const FACING_ARROW = ["→", "↓", "←", "↑"];

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
    ArrowUp: "MOVE_FORWARD",
    a: "TURN_LEFT",
    ArrowLeft: "TURN_LEFT",
    d: "TURN_RIGHT",
    ArrowRight: "TURN_RIGHT",
    " ": "PICKUP",
    x: "DROP",
    t: "TOGGLE",
    e: "TOGGLE",
    Backspace: "DONE",
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
    pageTitle: document.getElementById("page-title"),
    pageDesc: document.getElementById("page-desc"),
  };

  const playHost = document.getElementById("play-host");
  const focusKeyboard = document.body.classList.contains("play-focus-keys");

  let gameId = null;
  let task = null;
  let view = null;
  let playing = false;
  let busy = false;
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
      const data = await api(`/api/game/${gameId}/reset`);
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

  async function api(path, body) {
    const res = await fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || res.statusText);
    }
    return res.json();
  }

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
  }

  function scoreClass(pct) {
    if (pct >= 100) return "hi";
    if (pct >= 80) return "mid";
    if (pct >= 50) return "low";
    return "bad";
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
      ? "YOU SOLVED IT"
      : v.endReason === "stalled"
        ? "STALLED"
        : "OUT OF STEPS";
    els.endDesc.textContent = task.description || "";

    const tier = task.difficultyTier || 0;
    if (tier) {
      els.endDiff.style.display = "";
      els.endDiff.innerHTML =
        `Maze difficulty: <span style="color:${difficultyColor(tier)}">${tier} / 6</span>`;
    } else {
      els.endDiff.style.display = "none";
    }

    els.endSteps.textContent = success
      ? `Completed in ${v.stepCount} steps`
      : `Used ${v.stepCount} / ${v.maxSteps} steps`;

    const opt = v.comparison.optimalSteps;
    const score = Math.round(v.displayReward * 100);
    let optDetail = `Optimal (BFS): ${opt} steps`;
    if (success && v.stepCount <= opt) optDetail += "  -  you matched it";
    else if (success) optDetail += `  -  you were ${v.stepCount - opt} over`;
    els.endScore.innerHTML = success
      ? `${optDetail}<span class="score ${scoreClass(score)}">  -  Score: ${score}%</span>`
      : optDetail;

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
    const youColor = success ? "you" : "you";
    const rows = [[ "You", youDetail, youColor, success ? "ok-result" : "fail-result" ]].concat(
      models.map((m) => {
        let detail = m.summaryLine;
        let resultClass = "fail-result";
        if (m.success) {
          resultClass = "ok-result";
          if (success && v.stepCount < m.steps) {
            detail = `${m.steps} steps  -  you were faster`;
          } else if (success && v.stepCount === m.steps) {
            detail = `${m.steps} steps  -  tied`;
          } else {
            detail = `${m.steps} steps  -  solved`;
          }
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

  function render(nextTask, nextView) {
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
    els.grid.src = view.gridImage;

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

    if (view.done) renderEnd(view);
    else els.end.className = "";
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
      render(null, data.view);
    });
  }

  function beginPlay() {
    playing = true;
    els.splash.classList.remove("show");
    els.card.style.display = "block";
    if (playHost) playHost.focus({ preventScroll: true });
  }

  document.getElementById("splash-play").onclick = beginPlay;

  document.getElementById("prev").onclick = () =>
    withBusy(async () => {
      const data = await api(`/api/game/${gameId}/navigate`, { delta: -1 });
      render(data.task, data.view);
    });

  document.getElementById("next").onclick = () =>
    withBusy(async () => {
      const data = await api(`/api/game/${gameId}/navigate`, { delta: 1 });
      render(data.task, data.view);
    });

  const pagePrev = document.getElementById("page-prev");
  const pageNext = document.getElementById("page-next");
  if (pagePrev) pagePrev.onclick = () => document.getElementById("prev").click();
  if (pageNext) pageNext.onclick = () => document.getElementById("next").click();

  window.addEventListener("keydown", (ev) => {
    // Splash: Enter/Space always start play (matches on-screen copy).
    if (!playing) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        beginPlay();
      }
      return;
    }
    // After splash, content pages only take game keys while the board is focused.
    if (!keyboardActive()) return;
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
    const action = KEY_TO_ACTION[ev.key];
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
      render(data.task, data.view);
      els.splash.classList.add("show");
    } catch (err) {
      els.error.style.display = "block";
      els.error.textContent =
        "Could not reach API at " +
        API +
        "\n" +
        (err.message || err) +
        "\n\nStart it with:\nuvicorn demo.api.app:app --reload --app-dir .";
    }
  })();
})();
