/**
 * night-logic.js
 * 확정된 확률/규칙에 따라 각 역할의 "이번 게임 지시문"을 랜덤 생성한다.
 * 여기서 만들어진 내용은 game.js가 화면에 순서대로 보여주고, 음성(voice.js)으로도 재생한다.
 *
 * gameState.flags 에 저장되는 값들은 나중에 win-logic.js가 승리 판정에 사용한다.
 *
 * 음성 관련 규칙:
 * - 각 스텝은 voiceWakeId / voiceSleepId 를 가진다 (예: "oracle.wake", "oracle.sleep").
 * - render()가 돌려주는 view는 promptVoiceIds(배열)를 가질 수 있다 — 화면에 뜨는
 *   prompt 문장을 음성으로 재생할 때 순서대로 이어붙일 보이스 ID 목록.
 * - "몇 번 플레이어"처럼 플레이어 번호를 읽어줘야 하는 곳은 numberVoiceId(n)("1".."10",
 *   voice/1.mp3~10.mp3)를 쓴다.
 * - "카드 몇 장", "몇 명" 처럼 랜덤하게 정해지는 개수(장수/인원수)를 읽어줘야 하는 곳은
 *   countVoiceId(n)("1k".."5k", voice/1k.mp3~5k.mp3)를 쓴다 — 플레이어 번호용과는
 *   다른 녹음본이므로 절대 섞어 쓰지 않는다.
 * - choice 타입의 announce()는 { text, voiceIds } 형태를 돌려준다.
 * - number 타입의 onAnswer 결과 콜백은 resultCallback(text, voiceIds) 형태로 호출된다.
 */

/** weight 배열 중 하나를 랜덤 선택 ([{value, weight}, ...]) */
function weightedPick(options) {
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  let r = Math.random() * total;
  for (const o of options) {
    if (r < o.weight) return o.value;
    r -= o.weight;
  }
  return options[options.length - 1].value;
}

/** 1~n 중 자기 자신을 제외한 랜덤 플레이어 번호 */
function randomOtherPlayer(playerCount, exclude) {
  const pool = [];
  for (let i = 1; i <= playerCount; i++) {
    if (i !== exclude) pool.push(i);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------------------------------------------------------------
// 1. Oracle
// ---------------------------------------------------------------
function buildOracleStep(state) {
  // 리플(Ripple) 질문은 제외. "숫자 맞히기"는 약 5%로 드물게, 나머지는 홀짝/지정보기가 반반.
  const question = weightedPick([
    { value: "parity", weight: 47.5 },
    { value: "view", weight: 47.5 },
    { value: "guess", weight: 5 },
  ]);

  return {
    id: "oracle",
    title: "Oracle (예언자)",
    wakeName: "오라클",
    wakeAction: "질문에 답하세요",
    imageRoleIds: ["oracle"],
    voiceWakeId: "oracle.wake",
    sleepText: "오라클, 눈을 감으세요.",
    voiceSleepId: "oracle.sleep",
    question,
    render(state) {
      switch (question) {
        case "parity":
          return {
            prompt: "당신의 플레이어 번호는 홀수인가요, 짝수인가요?",
            promptVoiceIds: ["oracle.q.parity"],
            inputType: "choice",
            choices: [
              { label: "홀수", value: "odd" },
              { label: "짝수", value: "even" },
            ],
            onAnswer: (answer) => {
              state.flags.oracleParity = answer;
            },
            // 결과는 "홀수입니다." / "짝수입니다." 짧은 문장으로 모두에게 알려준다
            announce: (answer) => ({
              text: answer === "odd" ? "홀수입니다." : "짝수입니다.",
              voiceIds: [
                "oracle.q.parity.result",
                answer === "odd" ? "oracle.q.parity.odd" : "oracle.q.parity.even",
              ],
            }),
          };
        case "view": {
          return {
            prompt: "몇 번 플레이어의 카드를 보고 싶나요?",
            promptVoiceIds: ["oracle.q.view"],
            inputType: "number",
            min: 1,
            max: state.playerCount,
            onAnswer: (requestedNumber, resultCallback) => {
              const swapped = Math.random() < 0.2; // 20% 확률로 다른 번호로 바뀜
              const actualNumber = swapped
                ? randomOtherPlayer(state.playerCount, requestedNumber)
                : requestedNumber;
              state.flags.oracleViewedPlayer = actualNumber;
              resultCallback(
                `${actualNumber}번 플레이어의 카드를 확인하세요. (모두에게 이 번호가 공개됩니다)`,
                [numberVoiceId(actualNumber), "oracle.q.view.result"]
              );
            },
          };
        }
        case "guess":
        default: {
          const secretNumber = Math.floor(Math.random() * 10) + 1;
          return {
            prompt: "1부터 10 사이의 숫자를 하나 골라보세요.",
            promptVoiceIds: ["oracle.q.guess"],
            inputType: "number",
            min: 1,
            max: 10,
            onAnswer: (guess, resultCallback) => {
              const correct = Number(guess) === secretNumber;
              state.flags.oracleGuessResult = correct ? "correct" : "incorrect";
              resultCallback(
                correct
                  ? "정답입니다! 오라클은 밤새 깨어 있을 수 있습니다. (겉으로 티내지 마세요)"
                  : "오답입니다. 이제 모두의 목표는 오라클을 제거하는 것으로 바뀝니다. 오라클은 살아남아야 합니다. (겉으로 티내지 마세요)",
                [correct ? "oracle.q.guess.correct" : "oracle.q.guess.incorrect"]
              );
            },
          };
        }
      }
    },
  };
}

// ---------------------------------------------------------------
// 2. Alien 그룹 (Alien / Synthetic / Groob / Zerb / Cow)
// ---------------------------------------------------------------
const ALIEN_TARGET_CATEGORIES = [
  { id: "alien.category.1", text: "왼쪽 또는 오른쪽 이웃" },
  { id: "alien.category.2", text: "번호가 더 높은 플레이어" },
  { id: "alien.category.3", text: "번호가 더 낮은 플레이어" },
  { id: "alien.category.4", text: "홀수 번호 플레이어" },
  { id: "alien.category.5", text: "짝수 번호 플레이어" },
  { id: "alien.category.6", text: "가운데" },
];

function pickAlienTargetCategory() {
  return ALIEN_TARGET_CATEGORIES[
    Math.floor(Math.random() * ALIEN_TARGET_CATEGORIES.length)
  ];
}

function buildAlienGroupStep(state) {
  const hasCow = state.selectedRoles.includes("cow");
  const action = weightedPick([
    { value: "none", weight: 25 },
    { value: "individual", weight: 35 },
    { value: "shared", weight: 25 },
    { value: "minion", weight: 15 }, // 내부 값은 유지(= 한 명을 몰래 에일리언으로 만드는 행동)
  ]);

  let prompt = "에일리언들은 서로를 확인합니다.";
  const voiceIds = ["alien.base"];
  let category = null;
  switch (action) {
    case "none":
      prompt += " 추가 행동 없음.";
      voiceIds.push("alien.action.none");
      break;
    case "individual":
      category = pickAlienTargetCategory();
      prompt += ` 각 에일리언은 개별적으로 "${category.text}" 카드를 확인합니다.`;
      voiceIds.push("alien.action.individual", category.id, "alien.action.card");
      break;
    case "shared":
      category = pickAlienTargetCategory();
      prompt += ` 에일리언 전체가 같이 "${category.text}" 카드를 확인합니다.`;
      voiceIds.push("alien.action.shared", category.id, "alien.action.card");
      break;
    case "minion":
      prompt +=
        " 에일리언 모두가 주먹을 내밉니다. 에일리언들은 몰래 한 명을 태그해 에일리언으로 만드세요.";
      voiceIds.push("alien.action.alien");
      break;
  }
  if (hasCow) {
    prompt +=
      " (Cow: 에일리언 옆에 앉아 있다면, 에일리언 중 한 명이 Cow의 주먹을 태그해야 합니다.)";
    voiceIds.push("alien.cow-note");
  }

  return {
    id: "alien-group",
    title: "Alien / Synthetic / Groob / Zerb / Cow",
    wakeName: "에일리언 팀",
    wakeAction: "서로를 확인하세요",
    imageRoleIds: ["alien", "synthetic", "groob", "zerb", "cow"].filter((id) =>
      state.selectedRoles.includes(id)
    ),
    voiceWakeId: "alien.wake",
    sleepText: "에일리언 팀, 눈을 감으세요.",
    voiceSleepId: "alien.sleep",
    render() {
      return {
        prompt,
        promptVoiceIds: voiceIds,
        inputType: action === "minion" ? "number" : "none",
        min: 1,
        max: state.playerCount,
        inputLabel: "에일리언으로 지정된 플레이어 번호",
        onAnswer: (num) => {
          state.flags.alienAction = action;
          if (action === "minion") state.flags.alienMinionPlayer = Number(num);
        },
        skipInputFlagSet: () => {
          state.flags.alienAction = action;
        },
      };
    },
  };
}

// ---------------------------------------------------------------
// 4. Leader
// ---------------------------------------------------------------
// (※ 예전에 있던 "Groob & Zerb 재확인" 단계는 삭제했다. 에일리언 그룹이
//  처음 깨어날 때(buildAlienGroupStep) 이미 그루브/제르브도 같이 눈을 뜨고
//  서로를 포함한 에일리언 팀을 확인하므로, 따로 다시 눈을 뜨고 확인하는
//  단계가 불필요하게 중복이었음.)
function buildLeaderStep(state) {
  const groobZerbBoth =
    state.selectedRoles.includes("groob") && state.selectedRoles.includes("zerb");
  return {
    id: "leader",
    title: "Leader (리더)",
    wakeName: "리더",
    wakeAction: "에일리언 팀의 신호를 확인하세요",
    imageRoleIds: ["leader"],
    voiceWakeId: "leader.wake",
    sleepText: "리더, 눈을 감으세요.",
    voiceSleepId: "leader.sleep",
    render() {
      // 이 단계에서 눈을 뜨는 건 리더 혼자뿐이다. 그루브와 제르브는 눈을 감은 채
      // (이미 알고 있는) 서로를 가리키고, 나머지 에일리언 팀은 눈을 감은 채 엄지를
      // 들어보인다 — 리더는 그 모습을 보고 그루브/제르브가 누구인지 알아본다.
      const prompt = groobZerbBoth
        ? "리더, 눈을 뜹니다. 그루브와 제르브는 눈을 감은 채, 서로를 보았다면 서로를 가리킵니다. 나머지 에일리언 팀도 눈을 감은 채 엄지를 들어보입니다."
        : "리더가 눈을 뜹니다. 에일리언 팀 전원(미니언 포함)은 눈을 감은 채 엄지를 들어보입니다.";
      return {
        prompt,
        promptVoiceIds: [
          groobZerbBoth ? "leader.prompt.groobzerb" : "leader.prompt.default",
        ],
        // 에일리언 전원이 리더를 가리켰는지는 투표 결과 입력 화면에서 따로 체크한다
        // (리더 혼자만 아는 정보라 밤에 즉시 답하게 하면 응답 속도로 정체가 드러날 수 있어서 제외)
        inputType: "none",
      };
    },
  };
}

// ---------------------------------------------------------------
// 5. Psychic
// ---------------------------------------------------------------
// 큰 카테고리별 비중은 기존과 동일(이웃 20% / 좌우선택 20% / 높낮이 20% / 홀짝 20% / 가운데 20%).
// 다만 "이웃"과 "높낮이"와 "홀짝"은 내부적으로 둘 중 하나를 앱이 랜덤으로 결정해서
// 해당하는 보이스 파일(왼쪽/오른쪽, 높은/낮은, 홀수/짝수)을 정확히 재생한다.
const PSYCHIC_CATEGORIES = [
  { key: "neighbor_left", voiceId: "psychic.category.neighbor.left", text: "왼쪽의 플레이어", weight: 10 },
  { key: "neighbor_right", voiceId: "psychic.category.neighbor.right", text: "오른쪽의 플레이어", weight: 10 },
  { key: "leftright_choice", voiceId: "psychic.category.leftright", text: "좌/우 (본인이 선택)", weight: 20 },
  { key: "higher", voiceId: "psychic.category.higher", text: "번호가 높은", weight: 10 },
  { key: "lower", voiceId: "psychic.category.lower", text: "번호가 낮은", weight: 10 },
  { key: "odd", voiceId: "psychic.category.odd", text: "홀수", weight: 10 },
  { key: "even", voiceId: "psychic.category.even", text: "짝수 번호 플레이어", weight: 10 },
  { key: "center", voiceId: "psychic.category.center", text: "가운데", weight: 20 },
];

function buildPsychicStep(state) {
  const category = weightedPick(
    PSYCHIC_CATEGORIES.map((c) => ({ value: c, weight: c.weight }))
  );
  const cardCount = weightedPick([
    { value: 1, weight: 85 },
    { value: 2, weight: 15 },
  ]);

  return {
    id: "psychic",
    title: "Psychic (사이킥)",
    wakeName: "사이킥",
    wakeAction: "지정된 카드를 확인하세요",
    imageRoleIds: ["psychic"],
    voiceWakeId: "psychic.wake",
    sleepText: "사이킥, 눈을 감으세요.",
    voiceSleepId: "psychic.sleep",
    render() {
      return {
        // 조합: [카테고리] + [psychic.card: "카드를"] + [숫자] + [psychic.prompt: "장 확인하세요."]
        prompt: `${category.text} 카드를 ${cardCount}장 확인하세요.`,
        promptVoiceIds: [
          category.voiceId,
          "psychic.card",
          countVoiceId(cardCount), // 플레이어 번호가 아니라 "장수"라서 1k~5k 전용 음성 사용
          "psychic.prompt",
        ],
        inputType: "none",
      };
    },
  };
}

// ---------------------------------------------------------------
// 6. Rascal
// ---------------------------------------------------------------
// 빌리지 이디엇형은 더 이상 사용하지 않음 — 4가지 모드 중 25%씩 균등 랜덤.
const RASCAL_MODES = [
  {
    key: "robber",
    voiceId: "rascal.mode.robber",
    label: "로버형: 본인 카드와 다른 플레이어 한 명의 카드를 교환 후 그 카드를 확인하세요.",
  },
  {
    key: "troublemaker",
    voiceId: "rascal.mode.troublemaker",
    label:
      "트러블메이커형: 자신을 제외한 다른 플레이어 두 명의 카드를 서로 교환하세요. 카드는 확인하지 않습니다.",
  },
  {
    key: "witch",
    voiceId: "rascal.mode.witch",
    label: "위치형: 중앙의 카드 한 장을 확인 후 아무 플레이어 한 명의 카드와 교환하세요.",
  },
  {
    key: "drunk",
    voiceId: "rascal.mode.drunk",
    label: "드렁크형: 본인 카드와 중앙의 카드 한 장을 교환하세요. 카드는 확인하지 않습니다.",
  },
];

function buildRascalStep(state) {
  const mode = RASCAL_MODES[Math.floor(Math.random() * RASCAL_MODES.length)];
  return {
    id: "rascal",
    title: "Rascal (라스칼)",
    wakeName: "라스칼",
    wakeAction: "카드를 섞으세요",
    imageRoleIds: ["rascal"],
    voiceWakeId: "rascal.wake",
    sleepText: "라스칼, 눈을 감으세요.",
    voiceSleepId: "rascal.sleep",
    render() {
      return {
        prompt: mode.label,
        promptVoiceIds: [mode.voiceId],
        inputType: "none",
      };
    },
  };
}

// ---------------------------------------------------------------
// 7. Exposer
// ---------------------------------------------------------------
function buildExposerStep(state) {
  const count = weightedPick([
    { value: 1, weight: 85 },
    { value: 2, weight: 10 },
    { value: 3, weight: 5 },
  ]);
  return {
    id: "exposer",
    title: "Exposer (익스포저)",
    wakeName: "익스포저",
    wakeAction: "센터 카드를 공개하세요",
    imageRoleIds: ["exposer"],
    voiceWakeId: "exposer.wake",
    sleepText: "익스포저, 눈을 감으세요.",
    voiceSleepId: "exposer.sleep",
    render() {
      return {
        prompt: `중앙 카드 ${count}장을 뒤집어 공개하세요. (무조건 실행)`,
        promptVoiceIds: [countVoiceId(count), "exposer.prompt"], // 장수라서 1k~5k 전용 음성
        inputType: "none",
      };
    },
  };
}

// ---------------------------------------------------------------
// 8. Empath — 엠패스는 눈을 뜨고, 나머지는 눈을 감은 채 질문에 가리킨다.
// ---------------------------------------------------------------
const EMPATH_QUESTIONS = [
  { id: "empath.question.01", text: "이 중에서 엠패스는 누구일 것 같나요?" },
  { id: "empath.question.02", text: "제일 잘생기거나 예쁜 사람은 누구인가요?" },
  { id: "empath.question.03", text: "제일 의심스러운 사람은 누구인가요?" },
  { id: "empath.question.04", text: "냄새가 제일 좋을 것 같은 사람은 누구인가요?" },
  { id: "empath.question.05", text: "옷을 제일 잘 입은 사람은 누구인가요?" },
  { id: "empath.question.06", text: "제일 멋진 사람은 누구인가요?" },
  { id: "empath.question.07", text: "다른 사람들이 전부 가리킬 것 같은 사람은 누구인가요?" },
  { id: "empath.question.08", text: "제일 똑똑해 보이는 사람은 누구인가요?" },
  { id: "empath.question.09", text: "제일 친절한 사람은 누구인가요?" },
  { id: "empath.question.10", text: "제일 재미있는 사람은 누구인가요?" },
  { id: "empath.question.11", text: "이번 게임에서 이길 것 같은 사람은 누구인가요?" },
  { id: "empath.question.12", text: "개인적으로 마음에 드는 사람은 누구인가요?" },
  { id: "empath.question.13", text: "아무도 가리키지 않을 것 같은 사람은 누구인가요?" },
  { id: "empath.question.14", text: "제일 착한 사람은 누구인가요?" },
  { id: "empath.question.15", text: "제일 못생긴 사람은 누구인가요?" },
  { id: "empath.question.16", text: "제일 수상하게 생긴 사람은 누구인가요?" },
  { id: "empath.question.17", text: "제일 믿음직한 사람은 누구인가요?" },
  { id: "empath.question.18", text: "거짓말을 제일 잘할 것 같은 사람은 누구인가요?" },
  { id: "empath.question.19", text: "제일 조용한 사람은 누구인가요?" },
  { id: "empath.question.20", text: "지금 제일 당황한 표정인 사람은 누구인가요?" },
];

function buildEmpathStep(state) {
  const q = EMPATH_QUESTIONS[Math.floor(Math.random() * EMPATH_QUESTIONS.length)];
  return {
    id: "empath",
    title: "Empath (엠패스)",
    wakeName: "엠패스",
    wakeAction: "모두가 가리키는 모습을 지켜보세요",
    imageRoleIds: ["empath"],
    voiceWakeId: "empath.wake",
    sleepText: "엠패스, 눈을 감으세요.",
    voiceSleepId: "empath.sleep",
    render() {
      return {
        prompt: `엠패스는 눈을 뜨고 지켜봅니다. 나머지 플레이어는 눈을 감은 채, 다음 질문에 해당하는 사람을 가리켜주세요.\n"${q.text}"`,
        promptVoiceIds: ["empath.ask", q.id],
        inputType: "none",
      };
    },
  };
}

// ---------------------------------------------------------------
// 9. Blob
// ---------------------------------------------------------------
/** selfNumber에서 direction 방향으로 count명(자신 포함)의 플레이어 번호 그룹을 원형으로 계산 */
function getCircularGroup(selfNumber, direction, count, playerCount) {
  const group = [selfNumber];
  const step = direction === "오른쪽" ? 1 : -1;
  let current = selfNumber;
  while (group.length < count) {
    current = ((current - 1 + step + playerCount) % playerCount) + 1;
    group.push(current);
  }
  return group;
}

function buildBlobStep(state) {
  const direction = Math.random() < 0.5 ? "왼쪽" : "오른쪽";
  const directionVoiceId =
    direction === "왼쪽" ? "blob.direction.left" : "blob.direction.right";
  const count = weightedPick([
    { value: 1, weight: 55 },
    { value: 2, weight: 40 },
    { value: 3, weight: 5 },
  ]);
  return {
    id: "blob",
    title: "Blob (블롭)",
    wakeName: "블롭",
    wakeAction: "번호를 입력하세요",
    imageRoleIds: ["blob"],
    voiceWakeId: "blob.wake",
    sleepText: "블롭, 눈을 감으세요.",
    voiceSleepId: "blob.sleep",
    render() {
      return {
        prompt: `블롭 카드를 가진 사람은 자신의 번호를 입력하세요. (${direction}으로 ${count}명이 일부가 됩니다)`,
        // 블롭은 "누가" 일부인지는 숨기지만, 방향과 인원수는 블롭이 없을 때도
        // 모두에게 공개되는 정보라 음성으로 안내한다.
        // 조합: [방향] + [인원수(1k~5k)] + [blob.count.suffix]
        promptVoiceIds: [directionVoiceId, countVoiceId(count), "blob.count.suffix"],
        inputType: "number",
        min: 1,
        max: state.playerCount,
        onAnswer: (selfNumber, resultCallback) => {
          const group = getCircularGroup(
            Number(selfNumber),
            direction,
            count,
            state.playerCount
          );
          state.flags.blobGroupPlayers = group;
          resultCallback(
            `당신을 포함해 ${direction}으로 ${count}명(${group.join(
              ", "
            )}번)이 일부입니다. 이들을 지키세요.`,
            // 조합: [그룹 번호들({N} 여러 개)] + [blob.result.trail]
            [...group.map(numberVoiceId), "blob.result.trail"]
          );
        },
      };
    },
  };
}

// ---------------------------------------------------------------
// 10. Mortician
// ---------------------------------------------------------------
function buildMorticianStep(state) {
  const count = weightedPick([
    { value: 1, weight: 60 },
    { value: 2, weight: 40 },
  ]);
  const side = count === 1 ? (Math.random() < 0.5 ? "왼쪽" : "오른쪽") : "양쪽";
  const sideVoiceId =
    side === "왼쪽"
      ? "mortician.side.left"
      : side === "오른쪽"
      ? "mortician.side.right"
      : "mortician.side.both";

  return {
    id: "mortician",
    title: "Mortician (모티션)",
    wakeName: "모티션",
    wakeAction: "번호를 입력하세요",
    imageRoleIds: ["mortician"],
    voiceWakeId: "mortician.wake",
    sleepText: "모티션, 눈을 감으세요.",
    voiceSleepId: "mortician.sleep",
    render() {
      return {
        prompt: `모티션 카드를 가진 사람은 자신의 번호를 입력하세요. (${side} ${count}명의 카드를 확인합니다)`,
        // 조합: [방향/양쪽] + [인원수(1k~5k)] + [mortician.count.suffix]
        promptVoiceIds: [sideVoiceId, countVoiceId(count), "mortician.count.suffix"],
        inputType: "number",
        min: 1,
        max: state.playerCount,
        onAnswer: (selfNumber, resultCallback) => {
          const n = Number(selfNumber);
          const pc = state.playerCount;
          let group;
          if (count === 1) {
            // 자신 제외, 지정된 한쪽 이웃 1명만
            group = [
              side === "오른쪽" ? ((n % pc) + 1) : (((n - 2 + pc) % pc) + 1),
            ];
          } else {
            group = [((n % pc) + 1), (((n - 2 + pc) % pc) + 1)];
          }
          state.flags.morticianWatchPlayers = group;
          // 모티션 "자신"이 살아남아야 승리 조건이 성립하므로, 자신의 번호도 따로 저장한다.
          state.flags.morticianSelfNumber = n;
          // 실제 대상 플레이어 번호는 화면/음성 어디에도 알리지 않는다 — 모티션은
          // 이미 물리적으로 자기 왼쪽/오른쪽이 누구인지 알고 있고, 번호까지 다시
          // 불러주면 그 자리에서 다른 사람도 알게 될 위험이 있다 (모티션은 눈을
          // 뜨지만 옆 사람은 눈을 감고 있을 뿐, 완전히 격리된 상태가 아니므로).
          // 조합: [mortician.result.confirm: "카드를 확인하세요."]
          //     + [mortician.win-condition: 승리 조건 안내]
          resultCallback("카드를 확인하세요. 자신이 본 사람이 죽고, 자신이 살아남으면 승리합니다.", [
            "mortician.result.confirm",
            "mortician.win-condition",
          ]);
        },
      };
    },
  };
}

// ---------------------------------------------------------------
// 밤 진행 순서 빌더: 선택된 역할에 맞춰 실제 스텝 리스트를 만든다
// ---------------------------------------------------------------
function buildNightSteps(state) {
  const steps = [];
  const has = (id) => state.selectedRoles.includes(id);

  if (has("oracle")) steps.push(buildOracleStep(state));

  if (
    has("alien") ||
    has("synthetic") ||
    has("groob") ||
    has("zerb") ||
    has("cow")
  ) {
    steps.push(buildAlienGroupStep(state));
  }

  if (has("leader")) steps.push(buildLeaderStep(state));
  if (has("psychic")) steps.push(buildPsychicStep(state));
  if (has("rascal")) steps.push(buildRascalStep(state));
  if (has("exposer")) steps.push(buildExposerStep(state));
  if (has("empath")) steps.push(buildEmpathStep(state));
  if (has("blob")) steps.push(buildBlobStep(state));
  if (has("mortician")) steps.push(buildMorticianStep(state));

  return steps;
}
