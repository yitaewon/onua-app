/**
 * game.js
 * 화면 전환과 렌더링을 담당하는 메인 스크립트.
 * 순서: landing → setup → roleSelect → night(여러 스텝) → day → resultInput → results
 */

const state = {
  screen: "landing",
  playerCount: 5,
  selectedRoles: [],
  nightSteps: [],
  currentStepIndex: 0,
  flags: {},
  dayMinutes: 5,
  roleTimeoutSeconds: 6,
  killedPlayers: [], // [{number, role}]
};

const app = document.getElementById("app");

function render() {
  app.innerHTML = "";
  switch (state.screen) {
    case "landing":
      renderLanding();
      break;
    case "tooltipHub":
      renderHeader();
      renderTooltipHub();
      break;
    case "setup":
      renderHeader();
      renderSetup();
      break;
    case "roleSelect":
      renderHeader();
      renderRoleSelect();
      break;
    case "eyesClosedIntro":
      renderHeader();
      renderEyesClosedIntro();
      break;
    case "night":
      renderHeader();
      renderNightStep();
      break;
    case "day":
      renderHeader();
      renderDay();
      break;
    case "resultInput":
      renderHeader();
      renderResultInput();
      break;
    case "results":
      renderHeader();
      renderResults();
      break;
  }
}

// ---------------------------------------------------------------
// 공통: 상단 헤더 (타이머 버튼 포함)
// ---------------------------------------------------------------
function renderHeader() {
  const header = el("div", "app-header");
  header.appendChild(el("div", "app-header-title", "ONUA"));
  const timerBtn = el("button", "timer-fab", "⏱");
  timerBtn.onclick = openTimerModal;
  header.appendChild(timerBtn);
  app.appendChild(header);
}

// ---------------------------------------------------------------
// 화면 0: 랜딩(타이틀) 화면
// ---------------------------------------------------------------
function renderLanding() {
  const section = el("section", "screen landing-screen");

  const poster = el("div", "poster");
  const glow = el("div", "poster-glow");
  poster.appendChild(glow);
  const silhouette = el("div", "poster-silhouette", "👽");
  poster.appendChild(silhouette);
  section.appendChild(poster);

  const titleWrap = el("div", "landing-title-wrap");
  titleWrap.appendChild(el("div", "landing-title-one", "ONE NIGHT"));
  titleWrap.appendChild(el("div", "landing-title-ultimate", "ULTIMATE"));
  titleWrap.appendChild(el("div", "landing-title-alien", "ALIEN"));
  section.appendChild(titleWrap);

  section.appendChild(
    el("p", "landing-subtitle", "오프라인 카드 플레이용 진행 도우미")
  );

  const enterBtn = el("button", "btn btn-primary btn-large", "게임 도우미 시작");
  enterBtn.onclick = () => {
    state.screen = "setup";
    render();
  };

  const tooltipBtn = el(
    "button",
    "btn btn-secondary btn-large",
    "역할 툴팁 보기"
  );
  tooltipBtn.onclick = () => {
    state.screen = "tooltipHub";
    render();
  };

  section.append(enterBtn, tooltipBtn);
  app.appendChild(section);
}

// ---------------------------------------------------------------
// 화면 0-B: 역할 툴팁 화면 (탭하면 해당 역할 설명 모달)
// ---------------------------------------------------------------
function renderTooltipHub() {
  const section = el("section", "screen role-select-screen");

  const backBtn = el("button", "btn btn-secondary", "← 처음으로");
  backBtn.onclick = () => {
    state.screen = "landing";
    render();
  };
  section.appendChild(backBtn);

  section.appendChild(el("h1", "title", "역할 툴팁"));
  section.appendChild(
    el("p", "subtitle", "역할을 탭하면 상세 설명을 볼 수 있어요.")
  );

  const grid = el("div", "role-grid");
  ALL_ROLE_IDS.forEach((id) => {
    const role = ROLES[id];
    const tile = el("button", "role-tile");
    tile.appendChild(el("div", "role-tile-badge", role.badge || "❔"));
    tile.appendChild(el("div", "role-tile-name", role.koName));
    tile.appendChild(el("div", "role-tile-name-en", role.name));
    tile.onclick = () => openInfoModal(`${role.koName} (${role.name})`, role.tooltip);
    grid.appendChild(tile);
  });
  section.appendChild(grid);
  app.appendChild(section);
}

// ---------------------------------------------------------------
// 공용 정보(툴팁) 모달
// ---------------------------------------------------------------
function openInfoModal(title, bodyText) {
  closeInfoModal();
  const overlay = el("div", "modal-overlay");
  overlay.id = "info-modal";
  const panel = el("div", "modal-panel");

  const closeBtn = el("button", "modal-close", "×");
  closeBtn.onclick = closeInfoModal;

  panel.append(
    closeBtn,
    el("h2", "modal-title", title),
    el("p", "modal-body-text", bodyText)
  );
  overlay.appendChild(panel);
  overlay.onclick = (e) => {
    if (e.target === overlay) closeInfoModal();
  };
  document.body.appendChild(overlay);
}

function closeInfoModal() {
  const existing = document.getElementById("info-modal");
  if (existing) existing.remove();
}

// ---------------------------------------------------------------
// 화면 1: 인원수 입력
// ---------------------------------------------------------------
function renderSetup() {
  const section = el("section", "screen");
  section.appendChild(el("h1", "title", "인원수 입력"));
  section.appendChild(
    el("p", "subtitle", "몇 명이서 플레이하나요? (3~10명)")
  );

  const label = el("label", "field-label", "플레이어 수");
  const input = document.createElement("input");
  input.type = "number";
  input.min = 3;
  input.max = 10;
  input.value = state.playerCount;
  input.className = "number-input";

  const timeoutLabel = el(
    "label",
    "field-label",
    "역할별 대기 시간 (초) — 카드가 센터에 숨어있어 아무도 없을 수도 있어요"
  );
  const timeoutInput = document.createElement("input");
  timeoutInput.type = "number";
  timeoutInput.min = 5;
  timeoutInput.max = 60;
  timeoutInput.value = state.roleTimeoutSeconds;
  timeoutInput.className = "number-input";

  const btn = el("button", "btn btn-primary", "다음: 역할 선택 →");
  btn.onclick = () => {
    const n = Number(input.value);
    if (n < 3 || n > 10) {
      alert("3명에서 10명 사이로 입력해주세요.");
      return;
    }
    const t = Number(timeoutInput.value);
    if (t < 5 || t > 60) {
      alert("대기 시간은 5~60초 사이로 입력해주세요.");
      return;
    }
    state.playerCount = n;
    state.roleTimeoutSeconds = t;
    state.screen = "roleSelect";
    render();
  };

  section.append(label, input, timeoutLabel, timeoutInput, btn);
  app.appendChild(section);
}

// ---------------------------------------------------------------
// 화면 2: 역할 선택 (그리드, 탭해서 선택/해제)
// ---------------------------------------------------------------
function renderRoleSelect() {
  const needed = state.playerCount + 3;
  const section = el("section", "screen role-select-screen");
  section.appendChild(el("h1", "title", "역할 선택"));
  section.appendChild(
    el("p", "subtitle", `${state.playerCount}명 플레이 → 카드 ${needed}장 필요`)
  );

  const grid = el("div", "role-grid");
  ALL_ROLE_IDS.forEach((id) => {
    const role = ROLES[id];
    const selected = state.selectedRoles.includes(id);
    const card = el("button", `role-tile${selected ? " selected" : ""}`);
    card.appendChild(el("div", "role-tile-badge", role.badge || "❔"));
    card.appendChild(el("div", "role-tile-name", role.koName));
    card.appendChild(el("div", "role-tile-name-en", role.name));
    card.onclick = () => {
      if (selected) {
        const idx = state.selectedRoles.indexOf(id);
        state.selectedRoles.splice(idx, 1);
      } else {
        state.selectedRoles.push(id);
      }
      render();
    };
    grid.appendChild(card);
  });
  section.appendChild(grid);
  app.appendChild(section);

  const bar = el("div", "select-bar");
  const count = el(
    "div",
    "select-count",
    `${state.selectedRoles.length} / ${needed} 선택됨`
  );
  const startBtn = el("button", "btn btn-primary", "시작");
  startBtn.onclick = () => {
    if (state.selectedRoles.length !== needed) {
      alert(`카드는 정확히 ${needed}장이어야 합니다.`);
      return;
    }
    state.flags = {};
    state.nightSteps = buildNightSteps(state);
    state.currentStepIndex = 0;
    state.screen = "eyesClosedIntro";
    render();
  };
  bar.append(count, startBtn);
  app.appendChild(bar);
}

// ---------------------------------------------------------------
// 화면 2-B: "모두 눈을 감아주세요" 인트로
// ---------------------------------------------------------------
function renderEyesClosedIntro() {
  const section = el("section", "screen eyes-closed-screen");
  section.appendChild(el("div", "eyes-closed-text", "모두 눈을 감아주세요."));
  section.appendChild(
    el("p", "subtitle", "기기를 중앙에 두거나, 진행자가 들고 다음을 눌러주세요.")
  );
  const startBtn = el("button", "btn btn-primary btn-large", "밤 시작하기");
  startBtn.onclick = () => {
    state.screen = "night";
    render();
  };
  section.appendChild(startBtn);
  app.appendChild(section);

  playVoice("system.eyes-closed");
}

// ---------------------------------------------------------------
// 화면 3: 밤 진행 (스텝별, 순서대로 자동 진행)
// ---------------------------------------------------------------
/**
 * 밤 스텝 화면.
 * - 카드 3장은 센터에 숨겨지므로 선택된 역할이라도 실제로 가진 플레이어가 없을 수 있다.
 * - 그래서 사람이 답하든 안 하든, 설정된 대기 시간(state.roleTimeoutSeconds)이
 *   다 지나야만 다음으로 넘어간다 (답을 일찍 해도 화면은 끝까지 기다린다 — 그래야
 *   "누가 답을 빨리 했다"는 사실 자체가 정체를 드러내지 않는다).
 * - 시간이 다 지났는데 아무 답도 없었다면, 앱이 조용히 대신 랜덤으로 답을 골라
 *   화면에는 사람이 답한 것과 똑같은 모습으로 보여준다.
 */
/** imageRoleIds에 해당하는 역할 카드 이미지들을 200×274 자리에 나란히 보여준다.
 *  이미지가 없거나 로드에 실패하면 뱃지 placeholder로 자동 대체된다. */
function buildPhotoRow(imageRoleIds) {
  const row = el("div", "photo-row");
  const ids = imageRoleIds && imageRoleIds.length ? imageRoleIds : [];
  if (ids.length === 0) {
    const ph = el("div", "photo-placeholder");
    ph.appendChild(el("span", "photo-placeholder-label", "사진\n200 × 274"));
    row.appendChild(ph);
    return row;
  }
  ids.forEach((roleId) => {
    const role = ROLES[roleId];
    if (!role) return;
    if (role.image) {
      const wrap = el("div", "photo-frame");
      const img = document.createElement("img");
      img.className = "photo-img";
      img.src = role.image;
      img.alt = role.koName;
      img.onerror = () => {
        wrap.innerHTML = "";
        wrap.appendChild(el("span", "photo-placeholder-badge", role.badge || "❔"));
        wrap.appendChild(el("span", "photo-placeholder-label", role.koName));
      };
      wrap.appendChild(img);
      row.appendChild(wrap);
    } else {
      const ph = el("div", "photo-frame photo-placeholder");
      ph.appendChild(el("span", "photo-placeholder-badge", role.badge || "❔"));
      ph.appendChild(el("span", "photo-placeholder-label", role.koName));
      row.appendChild(ph);
    }
  });
  return row;
}

function renderNightStep() {
  if (state.currentStepIndex >= state.nightSteps.length) {
    state.screen = "day";
    render();
    return;
  }
  const step = state.nightSteps[state.currentStepIndex];
  const view = step.render(state);

  const section = el("section", "screen night-step-screen");

  const countdownBadge = el(
    "div",
    "countdown-badge",
    `⏳ ${state.roleTimeoutSeconds}`
  );
  section.appendChild(countdownBadge);
  section.appendChild(
    el(
      "div",
      "step-counter",
      `밤 ${state.currentStepIndex + 1} / ${state.nightSteps.length}`
    )
  );
  section.appendChild(
    el("div", "wake-text", `${step.wakeName}, 일어나세요.`)
  );
  if (step.wakeAction) {
    section.appendChild(el("div", "wake-action", `${step.wakeAction}.`));
  }

  section.appendChild(buildPhotoRow(step.imageRoleIds));

  section.appendChild(el("p", "prompt", view.prompt));

  const inputArea = el("div", "input-area");
  section.appendChild(inputArea);
  app.appendChild(section);

  let answered = view.inputType === "none"; // none 타입은 입력 대기 대상이 아님
  let timeLeft = state.roleTimeoutSeconds;
  let intervalId = null;
  let countdownStarted = false; // 혹시라도 voice.js의 onDone이 중복 호출돼도 타이머가 2개 생기지 않도록 방어

  function disableInputs() {
    inputArea
      .querySelectorAll("button, input")
      .forEach((elm) => (elm.disabled = true));
  }

  function showResultLine(text, voiceIds) {
    if (text) {
      section.insertBefore(
        el("p", "prompt result-text", text),
        inputArea.nextSibling
      );
    }
    if (voiceIds && voiceIds.length) {
      playVoiceSequence(voiceIds);
    }
  }

  function markAnswered(result) {
    if (answered) return;
    answered = true;
    disableInputs();
    if (result) {
      if (typeof result === "string") {
        showResultLine(result);
      } else {
        showResultLine(result.text, result.voiceIds);
      }
    }
    section.appendChild(
      el("p", "waiting-text", "⏳ 대기 중... 시간이 다 될 때까지 기다려주세요.")
    );
  }

  // --- 입력 UI 구성 (답해도 다음으로 넘어가지 않고 markAnswered만 호출) ---
  if (view.inputType === "none") {
    if (view.skipInputFlagSet) view.skipInputFlagSet();
  } else if (view.inputType === "yesno") {
    if (view.inputLabel) {
      inputArea.appendChild(el("label", "field-label", view.inputLabel));
    }
    const row = el("div", "btn-row");
    const yesBtn = el("button", "btn btn-primary", "예");
    const noBtn = el("button", "btn btn-secondary", "아니오");
    yesBtn.onclick = () => {
      if (answered) return;
      view.onAnswer("yes");
      markAnswered();
    };
    noBtn.onclick = () => {
      if (answered) return;
      view.onAnswer("no");
      markAnswered();
    };
    row.append(yesBtn, noBtn);
    inputArea.appendChild(row);
  } else if (view.inputType === "choice") {
    const row = el("div", "btn-row");
    view.choices.forEach((c) => {
      const b = el("button", "btn btn-secondary", c.label);
      b.onclick = () => {
        if (answered) return;
        view.onAnswer(c.value);
        markAnswered(view.announce ? view.announce(c.value) : null);
      };
      row.appendChild(b);
    });
    inputArea.appendChild(row);
  } else if (view.inputType === "number") {
    const input = document.createElement("input");
    input.type = "number";
    input.className = "number-input";
    input.min = view.min || 1;
    input.max = view.max || state.playerCount;
    if (view.inputLabel) {
      inputArea.appendChild(el("label", "field-label", view.inputLabel));
    }
    inputArea.appendChild(input);

    const confirmBtn = el("button", "btn btn-primary", "확인");
    confirmBtn.onclick = () => {
      if (answered) return;
      const val = input.value;
      if (val === "") {
        alert("값을 입력해주세요.");
        return;
      }
      if (view.onAnswer.length >= 2) {
        view.onAnswer(val, (text, voiceIds) => markAnswered({ text, voiceIds }));
      } else {
        view.onAnswer(val);
        markAnswered();
      }
    };
    inputArea.appendChild(confirmBtn);
  }

  // --- 시간 종료 시 자동 처리: 아무도 답하지 않았으면 앱이 대신 랜덤으로 답함 ---
  function autoAnswerIfNeeded() {
    if (answered) return false;
    let hadResult = false;
    if (view.inputType === "yesno") {
      view.onAnswer(Math.random() < 0.5 ? "yes" : "no");
    } else if (view.inputType === "choice") {
      const c = view.choices[Math.floor(Math.random() * view.choices.length)];
      view.onAnswer(c.value);
      if (view.announce) {
        const result = view.announce(c.value);
        showResultLine(result.text, result.voiceIds);
        hadResult = true;
      }
    } else if (view.inputType === "number") {
      const min = view.min || 1;
      const max = view.max || state.playerCount;
      const v = Math.floor(Math.random() * (max - min + 1)) + min;
      if (view.onAnswer.length >= 2) {
        view.onAnswer(v, (text, voiceIds) => {
          showResultLine(text, voiceIds);
        });
        hadResult = true;
      } else {
        view.onAnswer(v);
      }
    }
    answered = true;
    disableInputs();
    return hadResult;
  }

  function goToSleepPhase() {
    clearInterval(intervalId);
    section.innerHTML = "";
    section.className = "screen night-step-screen sleep-phase";
    section.appendChild(el("div", "sleep-text", step.sleepText));
    // "~, 눈을 감으세요" 음성이 실제로 다 끝난 뒤 1초를 쉬고서야 다음 역할을 호명한다.
    // (예전엔 음성 길이와 무관하게 고정 1.6초 뒤 바로 다음으로 넘어가서, 음성이 길면
    //  "눈을 감으세요"가 끝나기도 전에 다음 역할 "일어나세요" 음성이 겹쳐버렸다.)
    playVoice(step.voiceSleepId, () => {
      setTimeout(() => {
        state.currentStepIndex += 1;
        render();
      }, 1000);
    });
  }

  // --- 대기 시간(countdown)은 "~, 일어나세요" + prompt 음성이 다 끝난 뒤부터 센다 ---
  // (음성이 재생되는 동안에도 카운트다운이 같이 돌면, 설정한 대기 시간 중 몇 초가
  //  음성 재생에 먼저 소모되어버려서 실제로 답할 수 있는 시간이 확 줄어든다 —
  //  "5초로 해놨는데 순식간에 지나간다"는 문제의 원인이 바로 이것이었다.)
  function startCountdown() {
    if (countdownStarted) return; // 중복 호출 방어 — 타이머가 2개 돌면 체감 속도가 2배로 빨라짐
    countdownStarted = true;
    // 음성이 재생되는 동안 이미 답을 했더라도, 대기 시간만큼은 그대로 다 채워야 한다
    // (빨리 답했다는 사실 자체가 "이 역할을 가진 사람이 있다"는 티가 나면 안 되므로).
    intervalId = setInterval(() => {
      timeLeft -= 1;
      countdownBadge.textContent = `⏳ ${timeLeft}`;
      if (timeLeft <= 0) {
        clearInterval(intervalId);
        const hadResultVoice = autoAnswerIfNeeded();
        if (hadResultVoice) {
          setTimeout(goToSleepPhase, 2200); // 자동 선택 결과 음성이 끊기지 않도록 약간 대기
        } else {
          goToSleepPhase();
        }
      }
    }, 1000); // 1000ms = 실제 1초. 카운트다운 숫자 1칸 = 정확히 1초.
  }

  playVoiceSequence(
    [step.voiceWakeId, ...(view.promptVoiceIds || [])].filter(Boolean),
    startCountdown
  );
}

// ---------------------------------------------------------------
// 화면 4: 낮 (토론) 단계
// ---------------------------------------------------------------
function renderDay() {
  const section = el("section", "screen");
  section.appendChild(el("h1", "title", "낮 (토론) 단계"));
  section.appendChild(
    el("p", "prompt", "토론을 시작하세요. 오른쪽 위 타이머 버튼으로 시간을 잴 수 있어요.")
  );

  const openBtn = el("button", "btn btn-secondary", "타이머 열기");
  openBtn.onclick = openTimerModal;

  const nextBtn = el("button", "btn btn-primary", "투표로 넘어가기 →");
  nextBtn.onclick = () => {
    state.screen = "resultInput";
    render();
  };

  section.append(openBtn, nextBtn);
  app.appendChild(section);

  playVoice("system.day-intro");
}

// ---------------------------------------------------------------
// 공용 타이머 모달 (모든 화면에서 접근 가능, document.body에 붙임)
// ---------------------------------------------------------------
const timerState = {
  totalSeconds: 300,
  remaining: 300,
  interval: null,
  running: false,
};

function formatTime(totalSeconds) {
  const m = Math.floor(Math.max(totalSeconds, 0) / 60);
  const s = Math.max(totalSeconds, 0) % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function openTimerModal() {
  closeTimerModal(); // 중복 방지

  const overlay = el("div", "modal-overlay");
  overlay.id = "timer-modal";
  const panel = el("div", "modal-panel");

  const closeBtn = el("button", "modal-close", "×");
  closeBtn.onclick = closeTimerModal;

  const display = el("div", "timer-display", formatTime(timerState.remaining));

  const presetRow = el("div", "btn-row");
  [1, 3, 5, 10].forEach((min) => {
    const b = el("button", "btn btn-secondary small", `${min}분`);
    b.onclick = () => {
      pauseTimer();
      timerState.totalSeconds = min * 60;
      timerState.remaining = min * 60;
      display.textContent = formatTime(timerState.remaining);
    };
    presetRow.appendChild(b);
  });

  const controlRow = el("div", "btn-row");
  const startPauseBtn = el(
    "button",
    "btn btn-primary",
    timerState.running ? "일시정지" : "시작"
  );
  startPauseBtn.onclick = () => {
    if (timerState.running) {
      pauseTimer();
      startPauseBtn.textContent = "시작";
    } else {
      startTimer(() => {
        display.textContent = formatTime(timerState.remaining);
        if (timerState.remaining <= 0) {
          startPauseBtn.textContent = "시작";
        }
      });
      startPauseBtn.textContent = "일시정지";
    }
  };
  const resetBtn = el("button", "btn btn-secondary", "리셋");
  resetBtn.onclick = () => {
    pauseTimer();
    timerState.remaining = timerState.totalSeconds;
    display.textContent = formatTime(timerState.remaining);
    startPauseBtn.textContent = "시작";
  };
  controlRow.append(startPauseBtn, resetBtn);

  panel.append(closeBtn, el("h2", "modal-title", "타이머"), display, presetRow, controlRow);
  overlay.appendChild(panel);
  overlay.onclick = (e) => {
    if (e.target === overlay) closeTimerModal();
  };
  document.body.appendChild(overlay);
}

function startTimer(onTick) {
  if (timerState.interval) return;
  timerState.running = true;
  timerState.interval = setInterval(() => {
    timerState.remaining -= 1;
    onTick();
    if (timerState.remaining <= 0) {
      pauseTimer();
    }
  }, 1000);
}

function pauseTimer() {
  timerState.running = false;
  if (timerState.interval) {
    clearInterval(timerState.interval);
    timerState.interval = null;
  }
}

function closeTimerModal() {
  const existing = document.getElementById("timer-modal");
  if (existing) existing.remove();
}

// ---------------------------------------------------------------
// 화면 5: 투표 결과 입력
// ---------------------------------------------------------------
function renderResultInput() {
  const section = el("section", "screen");
  section.appendChild(el("h1", "title", "투표 결과 입력"));
  section.appendChild(
    el("p", "subtitle", "처형된 플레이어의 번호와 실제 역할을 입력하세요.")
  );

  const rows = el("div", "kill-rows");
  const rowsData = state.killedPlayers.length
    ? state.killedPlayers
    : [{ number: 1, role: state.selectedRoles[0] }];

  function renderRows() {
    rows.innerHTML = "";
    rowsData.forEach((row, idx) => {
      const rowEl = el("div", "kill-row");

      const numInput = document.createElement("input");
      numInput.type = "number";
      numInput.min = 1;
      numInput.max = state.playerCount;
      numInput.value = row.number;
      numInput.className = "number-input small";
      numInput.onchange = () => (row.number = Number(numInput.value));

      const roleSelect = document.createElement("select");
      roleSelect.className = "role-select";
      state.selectedRoles.forEach((rid) => {
        const opt = document.createElement("option");
        opt.value = rid;
        opt.textContent = `${ROLES[rid].koName} (${ROLES[rid].name})`;
        if (rid === row.role) opt.selected = true;
        roleSelect.appendChild(opt);
      });
      roleSelect.onchange = () => (row.role = roleSelect.value);

      const removeBtn = el("button", "btn btn-secondary small", "삭제");
      removeBtn.onclick = () => {
        rowsData.splice(idx, 1);
        renderRows();
      };

      rowEl.append(numInput, roleSelect, removeBtn);
      rows.appendChild(rowEl);
    });
  }
  renderRows();

  const addBtn = el("button", "btn btn-secondary", "+ 처형된 사람 추가");
  addBtn.onclick = () => {
    rowsData.push({ number: 1, role: state.selectedRoles[0] });
    renderRows();
  };

  // 리더가 선택되었다면, "에일리언 전원이 리더를 가리켰는지"를 여기서 직접 체크한다.
  // (리더 혼자만 아는 정보라 밤에 즉시 답하게 하면 응답 속도로 정체가 드러날 수 있어 뺐음)
  let leaderCheckbox = null;
  let leaderRow = null;
  if (state.selectedRoles.includes("leader")) {
    leaderRow = el("label", "leader-check-row");
    leaderCheckbox = document.createElement("input");
    leaderCheckbox.type = "checkbox";
    leaderCheckbox.checked = !!state.flags.leaderAllAliensPointed;
    leaderRow.append(
      leaderCheckbox,
      el("span", "leader-check-label", "에일리언 팀 전원이 리더를 가리켰나요? (리더만 체크)")
    );
  }

  const noOneBtn = el("button", "btn btn-secondary", "아무도 안 죽음");
  noOneBtn.onclick = () => {
    state.killedPlayers = [];
    if (leaderCheckbox) state.flags.leaderAllAliensPointed = leaderCheckbox.checked;
    showResults();
  };

  const confirmBtn = el("button", "btn btn-primary", "결과 확인 →");
  confirmBtn.onclick = () => {
    state.killedPlayers = rowsData;
    if (leaderCheckbox) state.flags.leaderAllAliensPointed = leaderCheckbox.checked;
    showResults();
  };

  function showResults() {
    state.screen = "results";
    render();
  }

  section.append(rows, addBtn);
  if (leaderRow) section.appendChild(leaderRow);
  section.append(noOneBtn, confirmBtn);
  app.appendChild(section);
}

// ---------------------------------------------------------------
// 화면 6: 결과
// ---------------------------------------------------------------
function renderResults() {
  const section = el("section", "screen");
  section.appendChild(el("h1", "title", "결과"));

  const results = computeResults(state, state.killedPlayers);
  const list = el("div", "result-list");
  results.forEach((r) => {
    const item = el("div", `result-item ${r.won ? "win" : "lose"}`);
    item.appendChild(el("div", "result-label", r.label));
    item.appendChild(el("div", "result-status", r.won ? "승리" : "패배"));
    item.appendChild(el("div", "result-reason", r.reason));
    list.appendChild(item);
  });
  section.appendChild(list);

  const restartBtn = el("button", "btn btn-primary", "새 게임 시작");
  restartBtn.onclick = () => {
    state.screen = "landing";
    state.selectedRoles = [];
    state.flags = {};
    state.killedPlayers = [];
    render();
  };
  section.appendChild(restartBtn);
  app.appendChild(section);
}

// ---------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------
function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

render();
