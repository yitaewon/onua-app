/**
 * roles-data.js
 * One Night Ultimate Alien — 역할 정의 데이터
 * 각 역할은 id, 표시 이름(한글+영문 원어), 팀, 짧은 설명, 상세 툴팁, 카드 이미지를 가진다.
 *
 * wakeStep은 밤 진행 순서를 결정하는 정렬 키다 (작을수록 먼저). 실제 밤 순서는
 * night-logic.js의 buildNightSteps()가 역할별로 고정 배치하므로, 여기 wakeStep은
 * "몇 번째로 깨는가"를 문서화하는 참고용 숫자다 (아래 공식 순서 표기 기준):
 *   -9. 오라클 | 1-A 에일리언/신세틱 | 1-C 카우 | 1-D 그루브&제르브 재확인
 *   | 3-C 리더 | 5-G 사이킥 | 7-F 래스칼 | 10-B 익스포저 | 10-E 엠패스
 *   | 13 블롭 | 13-A 모티션
 *
 * image: "card/<파일명>.jpg" — 사용자가 card 폴더에 넣어둔 역할별 사진.
 *   Synthetic Alien은 아직 제공된 이미지가 없어 비워둔다
 *   (이미지가 없으면 화면에서 자동으로 뱃지 placeholder로 대체됨).
 */

const TEAM = {
  VILLAGE: "village",
  ALIEN: "alien",
  SYNTHETIC: "synthetic",
  GROOB: "groob",
  ZERB: "zerb",
  BLOB: "blob",
  MORTICIAN: "mortician",
};

const ROLES = {
  oracle: {
    id: "oracle",
    name: "Oracle",
    koName: "예언자",
    team: TEAM.VILLAGE,
    wakeStep: -9,
    summary: "앱의 질문에 대답한다.",
    tooltip:
      "밤에 가장 먼저 깨어나 앱의 질문에 답합니다. 질문은 매번 랜덤: 번호 홀짝 공개 / 특정 번호 카드 확인(20% 확률로 다른 번호로 바뀜) / 1~10 숫자 맞히기(약 5% 확률) 중 하나입니다. 숫자 맞히기에서 틀리면 모두의 목표가 '예언자 제거'로 바뀝니다.",
    badge: "👁",
    image: "card/Oracle.jpg",
  },
  alien: {
    id: "alien",
    name: "Alien",
    koName: "에일리언",
    team: TEAM.ALIEN,
    wakeStep: 1,
    summary: "다른 에일리언들과 서로를 확인한다.",
    tooltip:
      "신세틱/그루브/제르브와 함께 깨어나 서로를 확인합니다. 이후 앱이 정한 행동(아무것도 안 함 / 각자 카드 확인 / 다같이 같은 카드 확인 / 한 명을 몰래 에일리언으로 만들기) 중 하나를 수행합니다. 에일리언이 처형되면 마을 팀 승리.",
    countable: true,
    badge: "👽",
    image: "card/Alien.jpg",
  },
  synthetic: {
    id: "synthetic",
    name: "Synthetic Alien",
    koName: "신세틱 에일리언",
    team: TEAM.SYNTHETIC,
    wakeStep: 1,
    summary: "에일리언들과 함께 깨어난다. 자신이 죽어야 승리한다.",
    tooltip:
      "에일리언들과 함께 깨어납니다. 다른 에일리언과 달리 자신이 처형되어야 승리하며, 죽으면 다른 모든 팀은 패배합니다.",
    badge: "🤖",
  },
  cow: {
    id: "cow",
    name: "Cow",
    koName: "소",
    team: TEAM.VILLAGE,
    wakeStep: 1,
    summary: "에일리언들이 깨어있는 동안 주먹을 내민다.",
    tooltip:
      "에일리언들이 깨어있는 동안 함께 주먹을 내밉니다. 에일리언 옆에 앉아 있다면, 에일리언 중 한 명이 소의 주먹을 태그해야 합니다.",
    badge: "🐄",
    image: "card/Cow.jpg",
  },
  groob: {
    id: "groob",
    name: "Groob",
    koName: "그루브",
    team: TEAM.ALIEN,
    wakeStep: 1,
    summary: "에일리언들과 함께 깨어나 제르브를 포함한 에일리언 팀을 확인한다.",
    tooltip:
      "에일리언들과 함께 깨어나 제르브를 포함한 에일리언 팀을 확인합니다. 제르브와 둘 다 있으면 승리 조건이 '제르브는 죽고 자신은 생존'으로 바뀝니다. (나중에 리더가 깨어날 때는 눈을 감은 채 제르브를 가리킵니다.)",
    badge: "🟢",
    image: "card/Groob.jpg",
  },
  zerb: {
    id: "zerb",
    name: "Zerb",
    koName: "제르브",
    team: TEAM.ALIEN,
    wakeStep: 1,
    summary: "에일리언들과 함께 깨어나 그루브를 포함한 에일리언 팀을 확인한다.",
    tooltip:
      "에일리언들과 함께 깨어나 그루브를 포함한 에일리언 팀을 확인합니다. 그루브와 둘 다 있으면 승리 조건이 '그루브는 죽고 자신은 생존'으로 바뀝니다. (나중에 리더가 깨어날 때는 눈을 감은 채 그루브를 가리킵니다.)",
    badge: "🟣",
    image: "card/Zerb.jpg",
  },
  leader: {
    id: "leader",
    name: "Leader",
    koName: "리더",
    team: TEAM.VILLAGE,
    wakeStep: 3,
    summary: "눈을 뜨고, 에일리언 팀 전원이 (눈을 감은 채) 보내는 신호를 확인한다.",
    tooltip:
      "이 단계에서 눈을 뜨는 건 리더뿐입니다. 에일리언 팀 전원은 눈을 감은 채 기본적으로 엄지를 들어 보이고, 그루브·제르브가 둘 다 있으면 그 둘은 눈을 감은 채 서로를 가리킵니다. 그루브·제르브가 둘 다 있으면 리더는 '둘 다 생존'해야 승리. 에일리언 전원이 리더를 가리켰는지는 투표 결과 입력 화면에서 체크합니다.",
    badge: "🎖",
    image: "card/Leader.jpg",
  },
  psychic: {
    id: "psychic",
    name: "Psychic",
    koName: "사이킥",
    team: TEAM.VILLAGE,
    wakeStep: 5,
    summary: "앱이 지정한 카드를 확인한다.",
    tooltip:
      "앱이 정한 카테고리(이웃/좌우/번호 높낮이/홀짝/센터)의 카드를 1장(85%) 또는 2장(15%) 확인합니다.",
    badge: "🔮",
    image: "card/Psychic.jpg",
  },
  rascal: {
    id: "rascal",
    name: "Rascal",
    koName: "라스칼",
    team: TEAM.VILLAGE,
    wakeStep: 7,
    summary: "앱이 지정한 방식대로 카드를 섞는다.",
    tooltip:
      "앱이 정한 방식(로버형/트러블메이커형/위치형/드렁크형, 각 25%) 중 하나로 카드를 무조건 섞습니다.",
    badge: "🃏",
    image: "card/Rascal.jpg",
  },
  exposer: {
    id: "exposer",
    name: "Exposer",
    koName: "익스포저",
    team: TEAM.VILLAGE,
    wakeStep: 10,
    summary: "센터 카드 일부를 뒤집어 공개한다.",
    tooltip:
      "센터 카드 중 앱이 정한 장수(1장 85% / 2장 10% / 3장 5%)를 무조건 뒤집어 공개합니다.",
    badge: "🔦",
    image: "card/Exposer.jpg",
  },
  empath: {
    id: "empath",
    name: "Empath",
    koName: "엠패스",
    team: TEAM.VILLAGE,
    wakeStep: 10.5,
    summary: "눈을 뜨고, 다른 플레이어들이 질문에 가리키는 모습을 지켜본다.",
    tooltip:
      "엠패스는 눈을 뜨고 지켜봅니다. 나머지 플레이어들은 눈을 감은 채, 앱이 묻는 질문(예: '제일 수상한 사람은?')에 해당한다고 생각하는 사람을 가리킵니다. 엠패스는 누가 누구를 가리켰는지 전부 지켜본 뒤 다시 눈을 감습니다.",
    badge: "👐",
    image: "card/Empath.jpg",
  },
  blob: {
    id: "blob",
    name: "Blob",
    koName: "블롭",
    team: TEAM.BLOB,
    wakeStep: 13,
    summary: "깨어나지 않지만, 자신의 '일부'가 누구인지 알게 된다.",
    tooltip:
      "깨어나지 않지만, 자신을 포함한 '일부' 그룹(왼쪽 또는 오른쪽 방향, 인원수는 랜덤 1~3명)을 알게 됩니다. 이 그룹이 아무도 처형되지 않으면 블롭 승리 (다른 팀 승패와 별개).",
    badge: "🫧",
    image: "card/Blob.jpg",
  },
  mortician: {
    id: "mortician",
    name: "Mortician",
    koName: "모티션",
    team: TEAM.MORTICIAN,
    wakeStep: 13.5,
    summary: "왼쪽/오른쪽 중 지정된 사람의 카드를 확인한다.",
    tooltip:
      "왼쪽 또는 오른쪽(1명, 랜덤) 혹은 양쪽(2명) 중 지정된 플레이어의 카드를 확인합니다. 지정된 대상이 처형되면 모티션 승리 (다른 팀 승패와 별개).",
    badge: "⚰",
    image: "card/Mortician.jpg",
  },
};

// 참고용 공식 순서 표기 (실제 진행 순서는 night-logic.js의 buildNightSteps가 결정):
const NIGHT_STEP_ORDER = [-9, 1, 1.5, 3, 5, 7, 10, 10.5, 13, 13.5];

const ALL_ROLE_IDS = Object.keys(ROLES);
