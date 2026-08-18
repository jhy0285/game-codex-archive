# New Codex Handoff Prompt

새 PC의 Codex 앱에서 아래 프롬프트를 그대로 사용하세요.

```text
이전 Codex 작업을 이어받아야 한다.

비공개 GitHub 저장소:
https://github.com/jhy0285/game-codex-archive

아직 로컬에 없다면 jhy0285 GitHub 계정으로 인증한 뒤 저장소를 `game` 폴더로 clone하고, 그 폴더를 Codex 작업 루트로 열어라. 이미 clone되어 있다면 현재 저장소를 사용해라.

이 저장소의 코드와 문서가 유일한 기준이다. 이전 채팅 기억을 추측하지 마라. 파일을 수정하거나 배포하기 전에 다음을 수행해라.

1. 루트 `AGENTS.md`, `MIGRATION_HANDOFF.md`, `PROJECT_INDEX.md`, `MACHINE_SETUP.md`, `DEPLOYMENTS.md`를 전부 읽어라.
2. `git status --short --branch`, 최근 커밋, 현재 브랜치를 확인해라.
3. `404-not-found`, `boss-forge`, `echo-heist`, `patch-run` 각각의 `progress.md`, `TEST.md`, `TASKS.md`, `ASSET_CREDITS.md`, `CODEX_LOG.md`, `GAME.md`, `AGENTS.md` 중 존재하는 파일을 읽어라.
4. 네 게임의 현재 기능, 기술 스택, 테스트 상태, 남은 사람 검수 항목, Vercel production URL을 프로젝트별로 요약해라.
5. `.env`, 토큰, Vercel 로그인 정보는 이전되지 않았다고 가정해라. 배포가 필요할 때 내가 새 PC에서 Vercel 로그인을 승인한다.
6. 기존 게임 메커닉, 좌표, 타이밍, 퍼즐 해법, production alias를 임의로 바꾸지 마라. Hollow Knight의 코드·캐릭터·에셋을 복제하지 말고 문서화된 일반 표현 기법과 현재의 독창적 아트 방향만 유지해라.
7. 첫 응답에서는 파일을 수정하거나 배포하지 말고, 읽은 근거를 바탕으로 현재 상태와 다음 권장 작업만 보고해라. 내가 다음 작업을 지정하면 그때 구현과 검증을 시작해라.

참고로 이전 PC의 migration 검증에서는 다음이 통과했다.
- 404-not-found: build PASS, Playwright 7/7
- boss-forge: Vitest 5/5, build PASS, Playwright 5/5
- echo-heist: Vitest 6/6, build PASS, Playwright 9/9
- patch-run: Vitest 5/5, build PASS, Playwright 3/3

이제 위 문서를 읽고 현재 상태를 요약해라.
```

