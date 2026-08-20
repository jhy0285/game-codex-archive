# Chapter 3 — THE SPLIT ATRIUM, 어떻게 깨는가 (Echo 2.0)

> 커밋 미정 (로컬 변경 후 push). Echo 2.0 기반 OBJECT TRANSFER 디자인.
> 챕터 3 = "**과거의 내가 던진 같은 코어를 현재의 내가 이어받는다**"

---

## 챕터 3의 새로운 메커니즘: OBJECT TRANSFER

- **Ch 1**: POSITION — echo가 가만히 서 있음
- **Ch 2**: INTERACTION — echo가 lever 잡음 (player는 cargo 운반)
- **Ch 3**: **OBJECT TRANSFER** — echo가 core 줍고 player 쪽으로 던짐, player가 받음

---

## 챕터 3의 동선 (한 번의 R 녹화, 7~12초)

### 1단계: 시작
- Player: 상부 서쪽 [-6, 4.1, 5]
- Memory Core: 상부 동쪽 [-3.0, 3.75, 1.6]
- Echo Anchor: WEST (memory-core 옆) [-2.0, 3.75, 1.6]
- Temporal Gate: 가운데 [0.0, 0.9, -2.0] — Player는 통과, Core는 통과 못 함
- Core Receiver: 동쪽 [6.6, 0.88, 1.6]
- Atrium Door + Exit: 동쪽 끝

### 2단계: 녹화 (R 1번 → R 2번)

R 1번 → **녹화 시작**

1. **D** (동쪽) — memory-core로 이동 (≈ 1초)
2. **E** — memory-core pickup (들림)
3. **S** + **K** — 남쪽으로 throw (큰 opening 통해 EAST receiver 쪽으로)
4. **S** (남쪽) — 계단 따라 atrium-lower로 내려감
5. **D** (동쪽) — temporal gate 통과, atrium-east로
6. R 2번 → **녹화 종료**

### 3단계: Echo System 2.0 (R 2번 시 자동 발생)

- Player: **EAST에 유지** (되감기 X)
- Memory Core: **WEST에 rewind** (녹화 시작 시점으로)
- Echo: **WEST spawn** (녹화 시작 위치, memory-core 옆)

### 4단계: Echo Replay (자동)

- Echo가 memory-core로 이동 (path-replay)
- Echo가 **memory-core pickup** (R+E에 녹화된 대로)
- Echo가 **throw** (player EAST receiver 쪽으로)
- Core가 EAST catch basin에 떨어짐 (generous)
- Echo는 그대로

### 5단계: Player가 받음 (시너지)

- Player는 이미 EAST
- Player가 **E**로 core pickup (들림)
- Player가 **K**로 core를 receiver 방향으로 throw
- Core가 **core-receiver**에 안착 → **receiver-filled** + door 열림

### 6단계: Exit

- **E** (exit) → 챕터 3 클리어 (CHAPTER SEALED)

---

## Facts (victory)

- `CoreInAtriumReceiver` — core가 core-receiver에 안착
- `PlayerAtExit` — player가 exit에 도달

**Echo는 필수** (gate physics 구조):
- Temporal gate가 core-carry 시 reject
- Echo 없이 core를 EAST로 보낼 방법 없음 (직접 carry 시 gate 막힘)
- Echo는 같은 real core를 줍고 던짐 (Object Transfer)

---

## 자주 막히는 곳

- **Core 들고 gate 통과 시도** → gate가 core drop (visual + audio feedback)
- **Echo throw가 receiver 못 맞춤** → generous basin이라 거의 항상 받음
- **Catch timing** → 없음. Echo throw 후 core가 basin에 떨어짐, player가 pickup
- **너무 짧게 녹화** → 7초 이상 권장 (memory-core pickup + throw + stairs + cross)

---

## Echo 2.0 Properties 사용

- **거울**: Echo는 player input 그대로 따라함
- **공간 분리**: Echo는 WEST, player는 EAST (다른 위치에서 동시 행동)
- **시간 분리**: Echo는 녹화된 시간 후 등장 (snapshot 시점)
- **Persistent object**: Echo가 던진 core는 **같은 real object** (spectral copy 아님)
