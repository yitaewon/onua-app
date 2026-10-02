# ONUA 진행 도우미

One Night Ultimate Alien 오프라인 플레이용 밤 진행 도우미 웹앱.
카드 배분은 하지 않고, 실제 오프라인 카드로 플레이하면서 이 앱이 밤 단계 진행 순서와 지시문, 낮 타이머, 투표 결과에 따른 승리 판정을 도와줍니다.

## 로컬에서 바로 확인하기

`index.html` 파일을 더블클릭해서 브라우저로 열면 바로 동작합니다 (서버 필요 없음).

## GitHub Pages에 올리는 방법

1. 이 폴더를 컴퓨터에 원하는 위치(예: 바탕화면)에 저장합니다.
2. GitHub 웹사이트에서 새 저장소(repository)를 만듭니다. (Public으로 설정, README 추가 없이 생성)
3. 터미널(또는 명령 프롬프트)을 열고 이 폴더로 이동한 뒤 아래 명령어를 순서대로 입력합니다.

```bash
git init
git add .
git commit -m "ONUA 진행 도우미 초기 버전"
git branch -M main
git remote add origin https://github.com/사용자이름/저장소이름.git
git push -u origin main
```

4. GitHub 저장소 페이지에서 **Settings → Pages**로 이동합니다.
5. "Build and deployment" 항목에서 Source를 **Deploy from a branch**로, Branch를 **main / (root)**로 선택 후 저장합니다.
6. 몇 분 기다리면 `https://사용자이름.github.io/저장소이름/` 주소로 접속할 수 있습니다.

> 만약 터미널 명령어 대신 GitHub 웹사이트에서 직접 파일을 드래그해서 업로드하고 싶다면, 새 저장소 페이지의 "uploading an existing file" 링크를 눌러 이 폴더 안의 파일/폴더를 그대로 끌어다 놓으면 됩니다.

## 폴더 구조

```
onua-app/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── roles-data.js   # 역할 정의 데이터
│   ├── night-logic.js  # 역할별 랜덤 밤 지시 로직
│   ├── win-logic.js    # 최종 승리 판정 로직
│   └── game.js         # 화면 전환/렌더링
└── README.md
```

## 진행 순서

인원수 입력 → 역할 선택(인원+3장) → 밤 진행(역할별 랜덤 지시) → 낮 타이머 → 투표 결과 입력(처형자 번호+실제 역할) → 승리 팀 자동 판정

## 음성(TTS)용 스크립트

`voice-script.txt` 에 앱에서 사용하는 모든 고정 문구를 구분자(`===== [ID] =====`)와 함께 정리해뒀습니다. `{ }`로 표시된 부분은 게임마다 실시간으로 바뀌는 값이라 미리 녹음할 수 없고, 나머지 고정 문장은 그대로 TTS/녹음에 사용하면 됩니다.

## 캐릭터 사진

`js/game.js`의 밤 진행 화면에 200×274 크기의 사진 자리(placeholder)를 만들어뒀습니다. 사진을 구하시면 `.photo-placeholder`에 `<img>` 태그로 교체하면 됩니다.
