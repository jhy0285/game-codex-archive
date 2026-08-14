# 404 — Route Not Found

브라우저의 404를 세 막짜리 2D 액션 게임으로 바꾼 독창적인 Canvas 프로젝트입니다.

## 세 개의 막

- Act I · **The Lost Approach** — 무너진 경로에서 `4 · 0 · 4` 신호를 회수합니다.
- Act II · **The Redacted Choir** — 돌진형 Husk와 원거리 Redactor가 순차적으로 깨어나는 전투 통로입니다.
- Act III · **The Last Index** — 세 가지 공격 문구를 사용하는 최종 보스 Blind Archivist와 싸웁니다.

## 실행

```powershell
npm install
npm run dev
```

## 조작

- `A/D` 또는 방향키: 이동
- `W`, 위 방향키 또는 `Space`: 도약
- `Shift` 또는 `C`: 대시
- `X`, `J` 또는 캔버스 클릭: 공격
- `Esc`: 일시정지
- `R`: 전체 진행 재시작
- `F`: 전체화면

모바일에서는 화면 하단의 이동·도약·공격·대시 버튼을 사용합니다. 자동화와 접근 가능한 상태 확인을 위해 `window.render_game_to_text()`, `window.advanceTime(ms)`, `window.__gameTest`를 제공합니다.

## 배포

Production: <https://404-not-found-phi-seven.vercel.app>

게임 종료 화면의 세 링크는 각각 현재 공개된 Boss Forge, Echo Heist, Patch//Run 배포로 이동합니다.
