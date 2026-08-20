# Chapter 3 — THE SPLIT ATRIUM, 행위단위 Walkthrough

> 커밋 `e5b8553` (amplifier-lever) + `f6f6b5b` (2 facts) + `7963de2` (drop cooldown) 반영.
> production 자동화 캡처: https://echo-depths-3d.vercel.app
> 캡처 8장: `walkthrough/c3-*.png`

---

## 동선 (한 줄 요약)

1. **echo 시너지 길 (쉬움)**: R+E로 echo가 amplifier-lever 잡음 → pickup → throw → **trajectory가 auto-aim으로 receiver에 직송** → 끝
2. **수동 attack 길 (챕터 3의 차별점)**: echo 안 시킴 → pickup → throw → **공중에서 J (attack) 으로 trajectory 변경** → receiver → 끝

어느 쪽이든 2 facts + exit 으로 클리어. echo는 보너스일 뿐 필수가 아님.

---

## 행위 0: 챕터 3 시작

![][c3-00]

플레이어는 상부 서쪽 선반 (y≈3.5m) 에서 시작. 정면 동쪽 3m 지점에 memory-core가 떠 있다. 발밑 atrium-lower 위에 **amplifier-lever** 콘솔이 보임 — echo는 이 lever 근처에 자동 spawn. 한쪽 끝에는 core-receiver + 출구 (atrium-door + exit).

---

## 행위 1: echo R+E로 amplifier-lever 잡기

![][c3-01]

echo는 spawn 위치 [1.5, 1.0, 1.6]에서 amplifier-lever [1.5, 0.92, 1.6] 바로 위에 있다.

1. **R** 키 (녹화 시작)
2. **E** 키 (누르고 유지 — echo가 amplifier-lever를 잡음)
3. 화면에 lever handle이 위로 회전하고 screen/indicator가 밝게 발광
4. **R** 키 다시 (녹화 종료, E는 계속 hold)

이제 echo는 amplifier-lever를 잡고 있는 채로 replay 시작. `amplifiedThrowDirection()` helper가 활성화되어 throw trajectory가 core-receiver로 auto-aim 된다.

---

## 행위 2: echo replay 시작

![][c3-02]

녹화 종료 직후 echo가 replay를 시작. amplifier-lever를 잡고 있는 상태가 유지된다. 화면에 echo가 lever를 잡고 있는 모습이 보이고, lever가 cyan으로 발광 (챕터 1/2 plate-like 색 변화).

---

## 행위 3: memory-core로 이동

![][c3-03]

플레이어는 **D** 키 (동쪽) 로 memory-core [-3.0, 3.75, 1.6] 까지 이동. 약 1.5~2초. camera turn (Q/C) 으로 정면을 memory-core로 향하게 할 수도 있음.

---

## 행위 4: memory-core pickup

![][c3-04]

memory-core 근처 2 unit 이내에서 **E** 키 한 번. core가 손에 들린다.

> 챕터 3 픽스 (커밋 7963de2): **E 한 번 더 = drop**. drop 후 0.5초 동안 catch volume 재 pickup 방지 (recentlyDropped cooldown).

---

## 행위 5: throw preview (auto-aim trajectory)

![][c3-05]

카메라를 **동쪽 (D)** 으로 향하게 한 다음, **K** 키 (또는 우클릭) 를 **누르고 유지**. 점선 trajectory preview가 보임.

**핵심**: echo가 amplifier-lever를 잡고 있으므로 preview 점선이 **core-receiver (6.6, 0.88, 1.6) 방향**으로 곧장 향한다. throw direction을 정확히 안 맞춰도 된다. amplifier-lever의 auto-aim 효과.

---

## 행위 6: throw release

![][c3-06]

**K** (또는 우클릭) 를 떼면 throw. core가 auto-aim trajectory로 비행. **챕터 3에서 공중 attack (J) 이 필요 없다** (echo 시너지 길).

---

## 행위 7: core-receiver 안착 + door 열림

![][c3-07]

throw된 core가 core-receiver collider에 닿으면 receiver가 채워지고, `core-in-receiver` 사실이 true가 된다. 동시에 atrium-door가 열린다. **챕터 3 클리어**. 화면에 "CHAPTER SEALED" + "더 깊이 내려가기" 버튼.

---

## 2 facts 한눈에

1. **core-redirected** — player가 공중에서 J (attack) 으로 throw trajectory 변경 (수동 attack 길에서만)
2. **core-in-receiver** — core가 core-receiver collider에 안착
3. **exit 도달** — `reach-exit` objective

echo 시너지 길: throw → receiver 직송 (J 안 써도 됨) → `core-in-receiver` 1 fact + exit
수동 attack 길: throw + J → `core-redirected` + `core-in-receiver` 2 facts + exit

---

## 자주 막히는 곳

**trajectory가 receiver를 안 향함**: echo가 amplifier-lever를 안 잡고 있을 가능성. echo 상태 확인 — lever handle이 위로 회전해 있으면 잡고 있는 것. 안 잡고 있으면 throw 자유 → 동선 B (수동 attack) 로 전환.

**echo R+E가 안 됨**: echoAnchor [1.5, 1.0, 1.6] vs amplifier-lever [1.5, 0.92, 1.6]. 거의 바로 위. R+E 한 번이면 충분. R 누르고 echo가 E 잡을 때까지 0.5~1초 대기 → R 종료. R 종료 시점에 E 떼지 말 것.

**공중 attack (J) 타이밍 (수동 attack 길)**: throw 후 0.3~0.8초 사이가 sweet spot. 너무 빠르면 (0.1초) 안 맞음, 너무 늦으면 (1.5초+) receiver에 이미 너무 가까움 → trajectory 변경 폭 부족.

**drop 안 됨**: 챕터 3 픽스로 E 한 번 더 = drop. drop 직후 0.5초 cooldown. 던지고 바로 E 다시 누르면 drop 후 자동 pickup (안 됨).

---

## 챕터 3의 디자인 의도

챕터 1 = echo 보조 (단순)
챕터 2 = 물리 운반 (들고-타고-내려놓기)
챕터 3 = **공중 trajectory 제어** (챕터마다 다른 학습)

echo의 성질 활용: **거울 (player 따라함) + 공간 분리 (다른 위치에서 행동) + 지속 (replay 동안 amplifier 작동)**.

---

## 관련 커밋

- `e5b8553` — chapter 3 amplifier-lever + echo auto-aim (이 가이드)
- `f6f6b5b` — chapter 3 simplified to 2 facts (redirect + receiver) - air-control mechanic
- `7963de2` — dropCarried cooldown + mobile tutorial super-compact
- `eb9edbc` — chapter 3 memory-core E-drop + plate-like color on rotating-bridge (이전 디자인)

## 캡처 파일

[c3-00]: walkthrough/c3-00-spawn.png
[c3-01]: walkthrough/c3-01-echo-amplifier.png
[c3-02]: walkthrough/c3-02-echo-replay.png
[c3-03]: walkthrough/c3-03-moved-to-core.png
[c3-04]: walkthrough/c3-04-pickup.png
[c3-05]: walkthrough/c3-05-throw-preview.png
[c3-06]: walkthrough/c3-06-thrown.png
[c3-07]: walkthrough/c3-07-receiver-filled.png