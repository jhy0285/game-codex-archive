# Chapter 3 — THE SPLIT ATRIUM, 어떻게 깨는가 (prose, 최신 디자인)

> 커밋 `e5b8553` (amplifier-lever) + `f6f6b5b` (2 facts 단순화) + `7963de2` (drop cooldown) 반영.
> 챕터 3 = "echo 시너지 + 공중 attack trajectory 제어" (챕터 1 echo 보조, 챕터 2 물리 운반과 다른 학습).

---

## 시작

챕터 3가 시작되면 플레이어는 상부 서쪽 선반 (y≈3.5m) 에 서 있다. 정면 동쪽 3m 지점에 memory-core가 떠 있다. echo는 **amplifier-lever** (atrium-lower 위 [1.5, 0.92, 1.6]) 근처에 자동 spawn 한다. amplifier-lever는 echo가 잡으면 throw trajectory를 core-receiver로 auto-aim 시키는 장치다.

## 챕터 3의 두 가지 동선

챕터 3에는 두 가지 길이 있다:

1. **echo 시너지 길** (쉬움): echo를 R+E로 amplifier-lever에 잡게 시킨다. 잡고 있는 동안 throw trajectory가 자동으로 core-receiver 쪽으로 향한다. pickup → throw → 끝.
2. **수동 길** (챕터 3의 차별점): echo를 안 쓰고, 공중에서 J 키 (attack) 으로 trajectory를 직접 receiver로 맞춘다. echo가 안 잡혀 있으면 throw는 free trajectory.

어느 쪽을 골라도 클리어할 수 있다. victoryFacts는 2개로 동일 (`core-redirected` + `core-in-receiver` + exit). echo는 보너스일 뿐 필수가 아니다.

---

## 동선 A: echo 시너지 길 (쉬움)

### A-1. echo를 amplifier-lever에 보낸다

echo는 spawn 시 amplifier-lever 근처에 있으므로 R 키로 녹화 시작 → echo가 거의 가만히 있는 상태에서 E 키로 amplifier-lever를 잡는다 (1초) → R 키로 녹화 종료. echo는 replay 동안 계속 lever를 잡고 있다. amplifier-lever가 active + actor=echo이면 throw trajectory가 core-receiver로 auto-aim 된다 (챕터 3 한정).

### A-2. memory-core를 pickup 한다

D 키로 동쪽 → memory-core 근처 2 unit 이내 → E 키 한 번. 손에 들린다. 챕터 3 픽스(eb9edbc) 이후 **E 다시 누르면 drop** (recentlyDropped 0.5초 cooldown으로 즉시 재 pickup 방지).

### A-3. 동쪽으로 throw

플레이어 정면을 동쪽 (D로 카메라 회전) 으로 향하게 한 뒤 K 키 (또는 우클릭) 로 던진다. **trajectory preview는 amplifier의 auto-aim 때문에 receiver로 곧장 향하는 점선이 그려진다.** 그대로 K (또는 우클릭 release) 로 release 한다. speed = 5.05, 수직 0.7.

### A-4. core가 core-receiver에 안착

throw 시 auto-aim 덕분에 core는 trajectory 그대로 receiver collider에 닿는다. `core-in-receiver` 사실이 true 가 되고 → atrium-door가 열린다. **공중 attack (J) 이 필요 없다.**

### A-5. exit

문 통과 → exit E.

---

## 동선 B: 수동 attack 길 (챕터 3의 차별점)

### B-1. echo는 가만히

echo를 R+E로 안 시키면 echo는 amplifier-lever에 가만히 서 있다 (잡고 있지 않으므로 amplifier는 inactive). throw trajectory는 free. **챕터 3의 차별점 = 공중 attack trajectory 제어.**

### B-2. memory-core pickup

D 로 memory-core 위치로 → E 로 pickup (동선 A 와 동일).

### B-3. 동쪽으로 throw

K (또는 우클릭) 로 던진다. echo가 amplifier를 안 잡고 있으므로 trajectory는 플레이어 정면 (동쪽) + 약간 위쪽. receiver [6.6, 0.88, 1.6] 까지 직선으로는 안 닿는다.

### B-4. 공중 attack (J) — 챕터 3의 핵심 학습

core가 공중에 떠 있는 동안 (throw 후 약 0.3~0.8초 사이) J 키 (또는 좌클릭) 로 attack 한다. attack이 들어가면 `redirectVelocity` 가 core의 velocity를 attack 방향으로 다시 잡고 `core-redirected` 사실이 true 가 된다. receiver 위치 방향으로 attack 하면 core가 receiver로 향한다.

attack이 빨간색 ring wave 와 함께 보이면 성공.

### B-5. core-receiver 안착

redirect된 core가 core-receiver collider에 닿으면 `core-in-receiver` 사실이 true. atrium-door 열림.

### B-6. exit

문 통과 → exit E.

---

## 자주 막히는 곳

**echo가 amplifier-lever를 안 잡음**: echoAnchor [1.5, 1.0, 1.6] (lever [1.5, 0.92, 1.6] 위 0.08 unit). R+E로 echo가 잡을 때 distance < 2.15 이면 잡힘. echo가 spawn 위치에서 너무 멀면 R+E로 WASD 이동 후 E. echo 잡고 있으면 throw preview 점선이 receiver를 향함.

**trajectory가 receiver를 안 향함**: echo가 amplifier-lever를 안 잡고 있을 가능성 큼. echo 상태를 확인하려면 화면에 echo가 lever를 잡고 있을 때 (handle 위로 회전) 보임. 안 잡고 있으면 throw 자유 → 동선 B 로.

**공중 attack (J) 타이밍**: 던지고 직후 0.2초 이내 너무 빠르면 안 맞음. 던지고 0.5~1.0초 사이가 안전. core 가 receiver 가까이 가서 attack 하면 trajectory 변경이 부족 → receiver에 못 닿음. air-borne 중 0.3~0.8초가 sweet spot.

**drop이 안 됨**: 챕터 3 픽스(7963de2)로 E 한 번 더 = drop 정상 작동. drop 직후 0.5초 동안 catch volume 재 pickup 안 됨 (recentlyDropped cooldown).

---

## 2 facts 한눈에

챕터 3 클리어 조건:

1. **core-redirected** — player가 공중에서 J (attack) 으로 throw trajectory 변경
2. **core-in-receiver** — core가 core-receiver collider에 안착
3. exit 도달 (objective `reach-exit`)

echo 시너지는 victoryFacts에 영향 없음 (보너스). amplifier-lever는 디바이스일 뿐 objective/victoryFacts에 없음.

---

## 챕터 3 vs 1 vs 2 — 챕터마다 다른 학습

| 챕터 | 메인 학습 | echo 활용 | 메커니즘 |
|------|----------|----------|----------|
| 1 | echo 보조 | echo가 plate 위에 → echo-plate 활성 | 단순 보조 |
| 2 | 물리 운반 | echo가 lever 잡음 → elevator 작동 | 들고-타고-내려놓기 |
| 3 | **공중 trajectory 제어** | **echo가 amplifier-lever 잡음 → throw auto-aim (보너스)** | **공중 attack (J) 으로 trajectory 변경** |

---

## 관련 커밋

- `e5b8553` — chapter 3 amplifier-lever + echo auto-aim (이 가이드)
- `f6f6b5b` — chapter 3 simplified to 2 facts (redirect + receiver) - air-control mechanic
- `7963de2` — dropCarried cooldown + mobile tutorial super-compact
- `eb9edbc` — chapter 3 memory-core E-drop + plate-like color on rotating-bridge (이전 디자인)
- `c444c3f` — chapter 1 echo-plate fix
- `58e237d` — chapter 2 weight-plate + elevator lights