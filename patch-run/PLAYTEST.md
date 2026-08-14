# PATCH//RUN Playtest Record

## 2026-08-13 — Motion Machine Verification

This section is automated and machine-observed verification, not a human playtest.

- **Exercised:** Same-position deterministic comparisons of idle breathing and walk gait; left/right locomotion; aim-driven blade orientation; fire recoil; Threadstep compression, smear and recovery; player hit recoil; Seed Husk emerge, alternating skitter, close-range anticipation, hit flash/recoil, and death collapse.
- **State parity:** `render_game_to_text` reports the presentation clock plus player/enemy animation state and frame. The motion E2E asserts frame changes and captures the corresponding visible poses.
- **Visual findings and fixes:** Initial gait changes were too subtle at gameplay scale, so mantle swing, foot displacement, mask lift, bob, squash and lean were increased. Enemy hit/death windows were lengthened for readable silhouettes. The top `NEXT INSCRIPTION` label was moved clear of the title.
- **Still requires a human playtest:** whether the new motion feels responsive rather than merely readable in screenshots; whether 145ms firing and 170ms Threadstep transitions feel right with a physical mouse/keyboard; and whether heavy enemy pressure obscures the articulated silhouettes.

## 2026-08-12 — Machine Verification

This section is automated and machine-observed verification, not a human playtest.

- **Exercised:** Updated silhouettes and arena depth; aim reticle; bullet trails; actual Space dash beside an enemy; EVADE indicator and unchanged health; normal 16-damage path; red impact overlay, knockback, loss text, and HUD update; large patch title plus rule explanation; persistent grown ricochet; death and clean restart.
- **Obvious confusion risks:** FRIENDLY FIRE remains unconventional terminology, but its installation card now explicitly says bounced bullets become armed against enemies.
- **Bugs discovered:** The earlier wall clamp moved only the bullet Game Object, not its Arcade body, so a bounced bullet existed for roughly one frame before a second wall check destroyed it. Very short automated Space presses could also fall between Phaser input frames.
- **Fixes applied:** Reset the Arcade body 14px inside the arena while preserving and reflecting velocity; automation now holds Space across multiple frames and asserts dash contact safety.
- **Still requires a human playtest:** Whether the new art reads as ships/drones rather than blocks; real-time patch-card comprehension; hit intensity; EVADE clarity under combat load; control feel; fullscreen behavior.

## 2026-08-11 — Machine Verification

This section records automated and machine-observed checks only. It is not a human playtest.

- **Exercised:** Vitest patch rules; production build; real browser load; canvas visibility; WASD movement; dash; mouse aim; held shooting; enemy pursuit and elimination; score update; debug-assisted 41/61-second patch states; enlarged ricochet capture; player death; R restart; clean health/time/patch reset; text-state parity; fatal page-error monitoring.
- **Obvious confusion risks:** FRIENDLY FIRE terminology may not immediately communicate that only bounced player shots become armed against enemies; the 60-second alert and active-patch row must carry this distinction.
- **Bugs discovered:** Headless WebGL captures were black; Vitest initially collected the Playwright spec; Phaser 4 changed the old tint-fill signature; shared machine ports 4173 and 4317 served other games; R restart could miss a frame-polled key edge; the death shade covered one quadrant; the death HUD retained its pre-hit value; a patch notice could obscure death; the growth interaction label clipped at a wall.
- **Fixes applied:** Switched the primitive renderer to Canvas 2D; scoped Vitest to source unit tests; used Phaser 4 tint mode; isolated E2E on free port 5471 without reuse; bound R directly; corrected overlay coordinates; refreshed HUD and hid patch alerts on death; clamped the interaction label inside the arena.
- **Still requires a human playtest:** Movement and dash feel, mouse-aim precision, combat readability under pressure, all three patch alerts at real-time pacing, RICOCHET × GROWTH comprehension, death/restart clarity, and fullscreen behavior.
