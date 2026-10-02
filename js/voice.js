/**
 * voice.js
 * voice/ 폴더에 넣어둔 mp3 파일들을 순서대로 재생하는 작은 플레이어.
 *
 * - 보이스 ID가 숫자 문자열("3")이면 → voice/3.mp3 (1~10 번호 전용 음성)
 * - 그 외의 ID는 → voice/<id>.mp3  (예: "oracle.wake" → voice/oracle.wake.mp3)
 * - 해당 파일이 없거나 재생이 막히면(자동재생 차단 등) 조용히 다음 항목으로
 *   넘어간다 — 음성 파일이 아직 없어도 앱 자체는 평소처럼 동작해야 하므로.
 */

let currentVoiceAudio = null;

function voiceFileUrl(id) {
  return `voice/${id}.mp3`;
}

function stopVoice() {
  if (currentVoiceAudio) {
    currentVoiceAudio.onended = null;
    currentVoiceAudio.onerror = null;
    currentVoiceAudio.pause();
    currentVoiceAudio = null;
  }
}

/**
 * ids 배열을 순서대로 재생한다. 각 항목이 끝나면 다음 항목을 재생.
 * onDone은 전체 시퀀스가 끝난 뒤(또는 ids가 비어있을 때) 호출된다.
 *
 * 주의: 파일이 없을 때(404) 브라우저가 onerror 이벤트와 play()의 실패(Promise
 * reject)를 "둘 다" 발생시키는 경우가 있다. 아무 보호 장치 없이 둘 다 playNext를
 * 부르면 한 파일당 playNext가 두 번 호출되어 목록을 두 칸씩 건너뛰거나, 전체
 * 시퀀스가 끝나는 onDone(=카운트다운 시작)이 여러 번 겹쳐 불리면서 타이머가
 * 여러 개 동시에 돌고, 역할 단계가 통째로 순식간에 넘어가 버리는 문제가 있었다.
 * → "이번 항목은 이미 처리했다"는 상태(settled)를 둬서 항목당 정확히 한 번만
 *   다음으로 넘어가도록 막는다.
 *
 * 추가 안전장치(watchdog): 아주 가끔 파일을 불러오는 중 네트워크/디코딩이
 * 멈춰버려서(stalled) onended·onerror·play().catch 중 아무것도 발생하지
 * 않는 경우가 있다. 이때 아무 보호 장치가 없으면 다음으로 넘어갈 신호가
 * 영원히 오지 않아 — 특히 "눈을 감으세요" 음성 재생 중이면 그 화면에서
 * 앱이 완전히 멈춰버린 것처럼 보인다. 그래서 음성 하나당 최대
 * VOICE_WATCHDOG_MS(=8초)까지만 기다리고, 그래도 아무 신호가 없으면
 * 강제로 다음 항목으로 넘어간다.
 */
const VOICE_WATCHDOG_MS = 8000;

function playVoiceSequence(ids, onDone) {
  stopVoice();
  const list = (ids || []).filter(Boolean);
  let i = 0;
  let sequenceDone = false; // onDone도 전체 시퀀스 당 정확히 한 번만

  function finish() {
    if (sequenceDone) return;
    sequenceDone = true;
    currentVoiceAudio = null;
    if (onDone) onDone();
  }

  function playNext() {
    if (i >= list.length) {
      finish();
      return;
    }
    const id = list[i++];
    const audio = new Audio(voiceFileUrl(id));
    currentVoiceAudio = audio;

    let settled = false; // 이 audio 하나에 대해 한 번만 다음으로 넘어가게
    const watchdog = setTimeout(advance, VOICE_WATCHDOG_MS);
    function advance() {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      audio.onended = null;
      audio.onerror = null;
      playNext();
    }

    audio.onended = advance;
    audio.onerror = advance; // 파일이 없으면 조용히 다음으로
    audio.play().catch(advance); // 자동재생 차단 등도 조용히 다음으로
  }

  playNext();
}

function playVoice(id, onDone) {
  playVoiceSequence([id], onDone);
}

/**
 * 1~10 사이의 숫자를 "플레이어 번호" 전용 음성 ID로 변환 (voice/1.mp3 ~ voice/10.mp3).
 * 오라클이 지정한 플레이어 번호, 블롭/모티션이 가리키는 대상 플레이어 번호처럼
 * "몇 번 플레이어"를 말할 때만 쓴다.
 */
function numberVoiceId(n) {
  return String(n);
}

/**
 * 1~5 사이의 숫자를 "장수/인원수(개수)" 전용 음성 ID로 변환 (voice/1k.mp3 ~ voice/5k.mp3).
 * "카드 몇 장", "몇 명이 일부가 됩니다" 처럼 플레이어 번호가 아니라 랜덤하게 정해지는
 * 개수를 말할 때 쓴다 — 플레이어 번호용 1~10.mp3와는 다른 녹음본이다.
 */
function countVoiceId(n) {
  return `${n}k`;
}

/**
 * 배경음악: sound/backSound.mp3 를 페이지에 들어오면 계속 무한 반복 재생한다.
 * - 보이스 안내(playVoiceSequence 등)와는 별개의 <audio>라서 서로 끊기지 않는다.
 * - 브라우저 자동재생 정책 때문에 즉시 재생이 막히면, 페이지에서 처음 클릭/터치가
 *   발생하는 순간 바로 재생을 시작한다 (랜딩 화면 버튼 클릭으로 대부분 바로 시작됨).
 */
const bgMusic = new Audio("sound/backSound.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.4;

function startBgMusic() {
  if (!bgMusic.paused) return;
  bgMusic.play().catch(() => {
    // 자동재생이 막혔다면 첫 클릭/터치 때 다시 시도한다
    document.addEventListener("click", startBgMusic, { once: true });
    document.addEventListener("touchstart", startBgMusic, { once: true });
  });
}

startBgMusic();
