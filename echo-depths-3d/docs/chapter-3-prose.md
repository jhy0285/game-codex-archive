# Chapter 3 — THE SPLIT ATRIUM (Echo 2.0 OBJECT TRANSFER)

> **목표:** 과거의 내가 던진 동일한 Core를 동쪽에서 받아 수신기에 전달한다.

Chapter 3은 복제 코어, 자동 수거, 순간이동 해법이 없는 OBJECT TRANSFER 챕터다.
기록을 확정하면 Player는 기록 종료 지점에 그대로 남고, 월드 동적 상태만 기록 시작
스냅샷으로 되감긴다. Echo는 같은 물리 월드 안에서 녹화된 입력과 경로를 재생한다.

## 공간 규칙

- **Memory Core / Echo anchor:** 서쪽 상부, `[-3.0, 3.75, 1.6]` 부근
- **Player-only crossing:** `z = -2.0`의 단방향 벽. 서쪽 Player만 통과시키고, Echo나
  Core는 이 벽을 열 수 없다.
- **Core transfer lane:** `z = 1.6` 부근의 셔터 차선. 가운데 분리벽이 두 통로를
  물리적으로 분리한다.
- **Temporal Gate:** `z = -2.0`의 화물 차단기. Player는 통과할 수 있지만 Core를 들고
  지나거나 Core를 던져 넘길 수 없다.
- **Catch rail:** Echo 투척 Core가 수신기에 곧바로 들어가지 않고 동쪽 수거 지점에
  멈추도록 하는 낮은 물리 레일이다.

## 실제 진행

1. 서쪽에서 `R`로 기록을 시작한다.
2. Memory Core를 `E`로 집는다.
3. 셔터 차선 중앙(`z ≈ 1.6`)에서 동쪽을 보고 `K`로 Core를 던진다. 이때 Player가
   서쪽에 있으므로 셔터는 닫혀 있고, 이 투척은 녹화에만 남는다.
4. 계단으로 내려가 `z = -2.0`의 Player-only crossing을 통해 동쪽으로 건넌다.
5. `R`로 기록을 확정한다. Player의 위치와 방향은 동쪽에 유지되고, Core는 서쪽의
   기록 시작 상태로 되감긴다.
6. 동쪽 Player가 있으므로 셔터가 내려가며 수거 차선이 열린다. Echo는 녹화된 경로로
   같은 Memory Core를 집어 차선을 통해 던지고, Core는 동쪽 catch rail 앞에 멈춘다.
7. Player가 그 **동일한 Core**를 `E`로 집고, 레일 남쪽을 돌아 수신기 방향으로 `K`로
   던진다.
8. `receiver-filled`가 발생해 문이 열리면, 바닥 위 동쪽에서 출구 센서에 접근해 `E`로
   챕터를 완료한다.

## 검증 불변식

- 기록 확정은 Player 위치/방향을 되감지 않는다.
- Core, 속도, 장치 상태 등 월드 동역학은 기록 시작 시점으로 되감긴다.
- `memory-core`는 한 개뿐이며 Echo와 Player가 번갈아 소유한다.
- Echo 재생은 기록 좌표로 텔레포트하지 않고 CharacterMotor 충돌 경로로 이동한다.
- 셔터는 **현재 Player**가 동쪽에 있을 때만 열리고, Echo는 단방향 벽을 열 수 없다.
- 승리 조건은 `CoreInAtriumReceiver`와 `PlayerAtExit`뿐이다.

## 막히는 경우

- Core를 든 채 temporal gate를 통과하려 하면 서쪽으로 떨어뜨려진다.
- Player 전용 차선으로 Core를 보내려 하면 gate/단방향 물리가 막는다.
- 셔터가 닫혀 있을 때 Echo가 아닌 Player 투척으로 동쪽을 우회할 수 없다.
- Echo 투척 뒤에는 타이밍 자동 수거가 없다. 동쪽에서 실제로 Core에 접근해 `E`를 눌러야 한다.
