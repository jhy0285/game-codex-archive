# HANDOFF — Echo Depths 3D

> 작성: 2026-08-28 (opencode가 Codex 세션 이어받음)
> 이 문서는 **이 폴더의 소스코드를 유일한 기준**으로 삼는다. 이전 채팅 기억이나 추측에 의존하지 말 것.

## 1. 세션 흐름 (무엇이 일어났나)

- **2026-08-25**: Codex가 `feat/ch4-ch5-temporal-mastery` 브랜치에서 Chapter 4~5 temporal-mastery 리비전을 구현하고 `main`에 배포 커밋 2개(`1e7e780`, `523dade`)를 남김. 이 로컬 소스는 그 `main` 스냅샷 + `node_modules`가 설치된 상태.
- **2026-08-27 (추정)**: Codex가 `outputs/` 에 플레이테스트 캡처(`ch5-production`, `chapter4-floor-polish-final` 등)를 생성. 직후 **Codex 한도 만료**로 세션 종료.
- **2026-08-28**: opencode가 세션을 이어받아 상태 진단 → 전체 검증 → 본 문서 작성.

## 2. 현재 상태 (한 줄 요약)

Chapter 1~5 + 엔딩 **전부 구현 완료**. 빌드, 단위 테스트(126/126), 브라우저 e2e(25/25) **모두 통과**. 코드 레벨 작업은 끝났고, 남은 것은 사람 검수(human-review)와 선택적 재배포뿐.

## 3. 검증 기록 (2026-08-28, opencode)

| 게이트 | 명령 | 결과 |
| --- | --- | --- |
| 단위 테스트 | `npm test -- --run` | Vitest **126/126** (17 파일) |
| 프로덕션 빌드 | `npm run build` | strict TypeScript + Vite 통과 |
| 브라우저 e2e | 외부 Vite + `PLAYWRIGHT_BASE_URL` | Playwright **25/25** (18.9분) |

## 4. ⚠️ 반드시 지킬 환경 규칙 (이 Windows PC)

### 4.1 `npm run test:e2e` 는 이 환경에서 실패한다

Playwright가 자동으로 띄우는 webServer(Vite)에서 게임이 브라우저 초기화에 실패하여 `window.echoDepthsDebug` 가 노출되지 않고, 모든 테스트가 `waitForFunction` 타임아웃으로 떨어진다. **게임 코드 자체는 정상**이며, Vite를 수동 기동하면 정상 동작한다(진단 완료).

원인은 Playwright webServer 런처 환경(Windows 셸/경로) 문제로 판단. 해결책: **Playwright가 자체 webServer를 기동하지 않도록 외부 서버를 지정**한다.

```bat
REM 터미널 1 — Vite 수동 기동
set VITE_E2E_DEBUG_API=1
node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4537 --strictPort

REM 터미널 2 — 외부 서버 지정으로 e2e 실행 (webServer 스킵)
set PLAYWRIGHT_BASE_URL=http://127.0.0.1:4537
node ./node_modules/@playwright/test/cli.js test
```

- `npm` 은 PowerShell 실행 정책으로 차단되므로 `cmd /c "..."` 로 감싸 실행한다.
- CI/다른 PC에서는 원래 `npm run test:e2e` 가 정상일 수 있음(기록상 25/25). 이 PC 한정 이슈.
- 포트 4537 이 이미 점유되어 있으면 Vite가 자동으로 다음 포트로 넘어가 baseURL 과 어긋나므로, 실행 전 `Get-NetTCPConnection -LocalPort 4537` 점유 프로세스를 정리할 것.

### 4.2 브라우저 아티팩트 커밋 금지

`test-results/`, `dist/`, `node_modules/` 는 커밋하지 않는다(AGENTS.md 규정).

## 5. 배포 상태

- **2026-08-28 Vercel 프로덕션 배포 완료.** 인증(`vercel whoami` → `jhy0285-3816`) 후 `vercel link --project echo-depths-3d --scope ai-build3` → `vercel deploy --prod --yes` 로 원격 빌드 배포.
- Production deployment: `dpl_4AUimczFvTmQD7TNx37u4QxHZMm5`, alias **https://echo-depths-3d.vercel.app** (READY). 상세는 `DEPLOYMENT.md` §"2026-08-28 Vercel production deployment".
- 배포 대상은 `echo-depths-3d` Vercel 프로젝트만. sibling 프로젝트(`404-not-found`, `boss-forge`, `echo-heist`, `patch-run`)는 식별자·alias 모두 보호.
- **폴더 구조 변경**: 게임 트리를 `sites-source-echo-depths-20260825/echo-depths-3d/` 하위로 이동시켜 Vercel Root Directory `echo-depths-3d` 가 정상 해석되도록 함. git 저장소 루트도 이동 후 위치로 갱신됨.

## 6. 다음 작업 (상세는 TASKS.md / progress.md / CODEX_LOG.md)

1. **Human-review** (자동화 불가): 물리 키보드 조작감, 실기기 터치 ergonomics, 모션 쾌적함, 주관적 난이도/퍼즐 발견성, 이중언어 뉘앙스, 애니메이션 폴리시, 오디오 밸런스, 전반적 재미.
2. **선택적 재배포**: 사용자 Vercel 승인 → candidate 검증 → promotion → production URL 재검증.
3. **문서 동기화**: README/AGENTS/이 문서를 material 변경 시 항상 일치시킬 것.

## 7. 다른 모델이 읽어야 할 순서

1. 본 `HANDOFF.md`
2. `AGENTS.md` (작업 전 규칙)
3. `PLAN.md` → `GAME.md` (제품/퍼즐 계약)
4. `CODEX_LOG.md` → `progress.md` → `TASKS.md`
5. `DEPLOYMENT.md` → `TEST.md` → `ASSET_CREDITS.md`
