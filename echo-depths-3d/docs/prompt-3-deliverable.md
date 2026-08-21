# Codex Prompt 3 — Deliverable Report

> 커밋: `954276a` (chapter 3 rebuild) + 이후 Ch3 tests 추가
> Production: https://echo-depths-3d.vercel.app

## 1. Final Chapter 3 player flow

**Ch 3 = OBJECT TRANSFER**: "**과거의 내가 던진 같은 코어를 현재의 내가 이어받는다**"

### 7 steps, 1 recording (~10 seconds)

1. **R** (녹화 시작)
2. **D** (동쪽) — memory-core 위치로 이동
3. **E** — memory-core pickup
4. **S + K** — 남쪽으로 throw (큰 opening 통해 EAST receiver basin으로)
5. **S** — stairs 따라 atrium-lower로 내려감
6. **D** (동쪽) — temporal gate 통과, atrium-east로
7. **R** (녹화 종료)

### Echo System 2.0 (자동)

- Player: **EAST에 유지** (되감기 X)
- Memory Core: **WEST에 rewind** (녹화 시작 시점으로)
- Echo: **WEST spawn** (memory-core 옆 [-2.0, 3.75, 1.6])

### Echo Replay (자동)

- Echo가 memory-core로 이동 (path-replay)
- Echo가 **memory-core pickup** + **throw toward EAST basin**
- Core가 EAST catch basin에 떨어짐

### Player receives

- Player가 **E**로 core pickup
- Player가 **K**로 throw toward receiver
- Core in receiver → door open
- **E** at exit → clear

## 2. Why Echo is physically mandatory (no `EchoUsed` flag)

- **Temporal gate** (purple posts + scanner beam) blocks any carried core/crate
  - If Player tries to cross gate with core → gate drops core + adds `temporal-gate-rejected` fact
- **No alternative path** for Core to reach EAST:
  - Direct carry across gate → rejected
  - Throw from WEST side without echo → core falls into atrium-lower (not into basin)
  - Need echo to throw from the WEST side over the gate into EAST basin
- The only valid Core→Receiver path requires Echo to pick it up and throw it

## 3. New / removed devices

### Added

- **temporal-gate** (new device kind `'gate'`)
  - Position: `[0.0, 0.9, -2.0]`, size: `[3.0, 2.2, 0.6]`
  - Visual: two purple posts + scanner beam + base
  - Physics: sensor (lets actors pass, rejects carried dynamic)
  - Behavior: when actor + carried core/crate enter together → drop the dynamic at west edge, add `temporal-gate-rejected` fact
- **echoAnchor updated**: `[1.5, 1.0, 1.6]` → `[-2.0, 3.75, 1.6]` (WEST side, next to memory-core)

### Removed

- ❌ `amplifier-lever` (device)
- ❌ `amplifiedThrowDirection` (DungeonWorld method)
- ❌ `CoreRedirectedByAttack` (victory fact)
- ❌ `core-thrown-by-echo` (fact)
- ❌ `core-caught` (fact)
- ❌ ch3 catch timing / postCatchFlightArmed / redirectedCurrentFlight / catch cooldown logic
- ❌ `feedbackAmplifierActive` (i18n)

## 4. Files changed

| File | Change |
|------|--------|
| `src/game/chapters.ts` | Ch3 mechanics simplified, victoryFacts = `[CoreInAtriumReceiver, PlayerAtExit]`, added `cross-gate` objective |
| `src/levels/layouts.ts` | Removed `amplifier-lever`, added `temporal-gate`, echoAnchor updated |
| `src/world/DungeonWorld.ts` | Removed `amplifiedThrowDirection`, removed ch3 throwOrDrop catch branch, removed ch3 attack condition filter, added `updateTemporalGates` method, added `gate` buildDevice case |
| `src/physics/RapierWorld.ts` | Added `gate` to `PhysicsEntityKind` and `createSensor` kind union |
| `src/game/i18n.ts` | Added `chapter.atrium.subtitle` ("Take it from your past self"), updated `chapter.atrium.objective/hint`, added `objective.atrium.transfer`, added `objective.atrium.crossGate` |
| `src/game/chapters.test.ts` | Relaxed objectives/facts count to `>= 2` (Ch3 is simpler by design) |
| `src/world/DungeonWorld.test.ts` | Added 5 Ch3 tests (A, B, E, I, J) + 1 crossGate i18n key |
| `docs/chapter-3-prose.md` | Rewrote for OBJECT TRANSFER design |
| `docs/walkthrough/c3-00~c3-06.png` | 7 captured frames from production |

## 5. Victory facts

- `CoreInAtriumReceiver` — Core in core-receiver
- `PlayerAtExit` — Player reaches exit

**Echo 2.0 generic temporal system** (no chapter-specific hack):
- Snapshot captures Core position + carriedBy + receiver state
- Rewind restores Core to recording-start position
- Echo throws the SAME real `DynamicRecord` (no spectral copy)

## 6. Old Ch3 mechanics removed

- `amplifier-lever` (echo-hold throw auto-aim) — removed
- Throw auto-aim via `amplifiedThrowDirection` — removed
- Mandatory air-attack redirect (`CoreRedirectedByAttack`) — removed
- Catch timing (`core-caught`, `isWithinCatchVolume`) — removed (Ch3 no longer needs catch)
- `postCatchFlightArmed` and `redirectedCurrentFlight` ch3 branches — removed (fields kept for Ch5)
- `recentlyDropped` ch3 cooldown — kept (used by Ch5)

## 7. Tests added

`src/world/DungeonWorld.test.ts`:

- **Ch3 A**: Core cannot cross Player gate while carried (gate drops core + adds rejected fact)
- **Ch3 B**: Player can cross gate to EAST without cargo (no rejected fact)
- **Ch3 E**: Echo replays pickup of the SAME real Core object (map key preserved in snapshot)
- **Ch3 I**: Receiver triggers `receiver-filled` directly (real Core → receiver, no provenance flag)
- **Ch3 J**: victory requires exactly `[CoreInAtriumReceiver, PlayerAtExit]` (2 facts)

Total tests: **106/106 passed** (was 101 before Ch3 rebuild).

## 8. Test/Build results

```
Test Files  16 passed (16)
     Tests  106 passed (106)
  Duration  ~1.7s
```

Build: passed (vite + tsc -b).

## 9. Remaining gameplay risks

| Risk | Mitigation |
|------|-----------|
| Echo path-replay accuracy at temporal-gate location | The gate is at `[0, 0.9, -2.0]` (mid-stairs); path-replay guides Echo to throw from above-the-stairs position — visual feedback only on rejection |
| Player's first-attempt Core pickup may fail if Player stands behind memory-core (spawn) | Memory-core at `[-3.0, 3.75, 1.6]`, Player spawn at `[-6, 4.1, 5]`; D moves 3 units east — pickup is 2 unit radius |
| Echo throw direction may overshoot basin | Throw speed 5.05 horizontal, 0.7 vertical; basin is 2.8u wide at `[7.0, 0, -0.5]` — well within reach |
| Core falls off stairs (atrium-lower east edge) | Stairs extend south of upper floor; player descends to atrium-lower naturally |
| Echo continues holding objects after replay ends | Existing `holding` state in echoTape — preserved for Ch2/Ch3 compatibility |

## 10. Manual playtest checklist

### Pre-conditions

- [ ] Fresh game start (or chapter select → Chapter 3)
- [ ] Language = Korean (or English — both work)
- [ ] Audio enabled (recommended for throw/release cues)

### Step-by-step

1. **Spawn** — Player on upper-west ledge, Memory Core visible east of player
2. **R** — Record starts, echo marker visible
3. **D** (1.5-2s) — Player moves east to memory-core
4. **E** — Core picks up (core hovers in front of camera)
5. **S + K** (hold K briefly) — Throw preview line visible, release → core flies south
6. **S** (1.5s) — Player walks down 3 stairs to atrium-lower
7. **D** (2-3s) — Player walks east, passes through temporal-gate (no cargo, so passes freely)
8. **R** — Record ends. World rewinds (Core back to WEST, Player stays EAST)
9. **Echo spawns at WEST** (next to Core), then replays: pickup Core, throw Core
10. **Core lands in EAST basin** (visible after ~1 second)
11. **E** — Player picks up Core
12. **K** (or D + K for direction) — Player throws Core at receiver
13. **Core in receiver** → atrium-door opens
14. **E at exit** → CHAPTER SEALED → next chapter unlocked

### Edge cases to test

- [ ] Try to carry Core through gate (without echo) → Core dropped + "temporal-gate-rejected" feedback
- [ ] Throw Core directly at receiver from WEST (no echo) → Core hits gate or falls in lower
- [ ] Skip echo (no R record) → no replay → no Core transfer → exit impossible
- [ ] Record but skip pickup → Echo picks up nothing → no transfer
- [ ] Multiple R records (overwrite) → only latest works
- [ ] Mobile / touch input — same flow works with touch joystick
