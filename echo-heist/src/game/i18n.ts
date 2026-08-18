export type Language = 'en' | 'ko'

type UiCopy = Record<string, string>

const EN: UiCopy = {
  'language.title': 'SELECT LANGUAGE',
  'language.subtitle': 'Choose the interface language before the heist begins.',
  'language.english': 'ENGLISH',
  'language.korean': '한국어',
  'language.hint': '1 / ENGLISH    2 / 한국어',
  'title.tag': 'STEAL BACK THE SECONDS THEY TOOK',
  'title.concept': 'Record one route. Bind it into an echo.\nCooperate with your past self to breach the exit.',
  'title.goal': 'GOAL · OPEN THE MINT EXIT IN SIX ESCALATING CHAPTERS',
  'title.desktop': 'DESKTOP\n\nWASD / ARROWS  MOVE\nE  USE / CARRY\nJ / CLICK  PULSE / THROW\nSHIFT  PHASE DASH\nSPACE  BIND ECHO\nR  RESTART CHAPTER\nESC  PAUSE · F  FULLSCREEN',
  'title.mobile': 'MOBILE · LANDSCAPE\n\nD-PAD  MOVE\nUSE  CARRY / DROP\nPULSE  ATTACK / THROW\nDASH  PHASE\nECHO  BIND ROUTE\nHELP  PAUSE + RULES\nPORTRAIT AUTO-PAUSES SAFELY',
  'title.start': 'START THE HEIST',
  'title.fullscreen': 'FULLSCREEN',
  'title.soundOn': 'SOUND · ON',
  'title.soundOff': 'SOUND · OFF',
  'title.chapterSelect': 'CHAPTER SELECT',
  'hud.soundOn': 'SOUND ON',
  'hud.soundOff': 'SOUND OFF',
  'hud.help': 'HELP',
  'hud.fullscreen': 'FULL',
  'hud.loop': 'LOOP',
  'hud.echoLive': 'ECHO LIVE',
  'hud.recording': 'RECORDING',
  'hud.binds': 'BINDS',
  'world.launch': 'LAUNCH',
  'world.receiver': 'RECEIVER',
  'world.sentinel': 'SENTINEL · FIXED PATROL',
  'objective.alpha': 'ALPHA',
  'objective.cargo': 'CARGO',
  'objective.signal': 'SIGNAL',
  'objective.sentinel': 'SENTINEL',
  'objective.bypass': 'BYPASS',
  'prompt.escape': 'E / USE · ESCAPE',
  'prompt.dropThrow': 'E / USE · DROP     J / PULSE · THROW',
  'prompt.pickup': 'E / USE · PICK UP',
  'prompt.sentinel': 'FACE SENTINEL · J / PULSE',
  'message.syncLost': 'SYNC LOST · The second strike arrived too late.',
  'message.cargoLatched': 'CARGO NODE LATCHED',
  'message.signalCaptured': 'SIGNAL CAPTURED · Receiver latched.',
  'message.veilOpen': 'VEIL OPEN · Reach the exit and USE.',
  'message.laserContact': 'LASER CONTACT · Read violet, phase through red.',
  'message.sentinelBreached': 'SENTINEL BREACHED · Containment route clear.',
  'message.shieldExposed': 'SHIELD EXPOSED · Opposite self, 1.3 seconds.',
  'message.rejected': 'REJECTED · The second strike must come from your other self.',
  'message.deflected': 'DEFLECTED · Strike from the opposite side.',
  'message.loopExpired': 'LOOP EXPIRED · Last route bound automatically.',
  'message.echoBound': 'ECHO BOUND · Your past route is now live.',
  'message.chapterReset': 'CHAPTER RESET · All transient state cleared.',
  'overlay.breachComplete': 'BREACH COMPLETE',
  'overlay.time': 'TIME',
  'overlay.loops': 'LOOPS',
  'overlay.totalBinds': 'TOTAL BINDS',
  'overlay.next': 'NEXT',
  'overlay.continue': 'CONTINUE · E / ENTER',
  'overlay.paused': 'HEIST PAUSED',
  'overlay.pauseRules': 'YOUR ROUTE IS RECORDED ON FIXED TICKS.\nECHO REPLAYS MOVEMENT, USE, THROW, AND PULSE.\nA NEW BIND REPLACES THE OLD ECHO; LATCHED NODES STAY LIT.',
  'overlay.pauseControls': 'MOVE  WASD / D-PAD     USE  E / USE     PULSE  J / PULSE\nDASH  SHIFT / DASH     BIND  SPACE / ECHO     RESTART  R',
  'overlay.resume': 'RESUME',
  'overlay.resetChapter': 'RESET CHAPTER',
  'overlay.endingTitle': 'THE LAST SECOND IS YOURS',
  'overlay.endingText': 'The vault repeats an empty corridor.\nOutside it, two sets of footprints become one.',
  'overlay.escapeTime': 'ESCAPE TIME',
  'overlay.echoesBound': 'ECHOES BOUND',
  'overlay.fracturesSurvived': 'FRACTURES SURVIVED',
  'overlay.chapterResets': 'CHAPTER RESETS',
  'overlay.replay': 'REPLAY FROM START',
  'overlay.note': 'E / ENTER replays · Every system and score resets cleanly.',
  'overlay.chapterSelect': 'CHAPTER SELECT',
  'overlay.chapterSelectNote': 'Practice any breach. Selecting a chapter starts a fresh campaign state.',
  'overlay.back': 'BACK',
  'rank.perfect': 'RANK · PERFECT PARADOX',
  'rank.clean': 'RANK · CLEAN GETAWAY',
  'rank.time': 'RANK · TIME WELL STOLEN',
  'touch.use': 'USE',
  'touch.pulse': 'PULSE',
  'touch.dash': 'DASH',
  'touch.echo': 'ECHO',
  'rotate.title': 'ROTATE TO LANDSCAPE',
  'rotate.body': 'The heist pauses here. Turn your phone sideways to see the whole puzzle and full-size controls.',
}

const KO: UiCopy = {
  'language.title': '언어 선택',
  'language.subtitle': '습격을 시작하기 전에 게임 언어를 선택하세요.',
  'language.english': 'ENGLISH',
  'language.korean': '한국어',
  'language.hint': '1 / ENGLISH    2 / 한국어',
  'title.tag': '빼앗긴 시간을 되찾아라',
  'title.concept': '한 번의 경로를 기록하고 에코로 묶어라.\n과거의 나와 협력해 출구를 돌파하라.',
  'title.goal': '목표 · 6개의 단계별 챕터를 돌파하고 민트 출구를 열어라',
  'title.desktop': '데스크톱\n\nWASD / 방향키  이동\nE  사용 / 운반\nJ / 클릭  펄스 / 던지기\nSHIFT  페이즈 대시\nSPACE  에코 기록\nR  챕터 재시작\nESC  일시정지 · F  전체화면',
  'title.mobile': '모바일 · 가로 화면\n\nD-PAD  이동\n사용  운반 / 내려놓기\n펄스  공격 / 던지기\n대시  페이즈 이동\n에코  경로 기록\n도움말  일시정지 + 규칙\n세로 화면에서는 안전하게 일시정지',
  'title.start': '습격 시작',
  'title.fullscreen': '전체화면',
  'title.soundOn': '사운드 · 켜짐',
  'title.soundOff': '사운드 · 꺼짐',
  'title.chapterSelect': '챕터 선택',
  'hud.soundOn': '사운드 켜짐',
  'hud.soundOff': '사운드 꺼짐',
  'hud.help': '도움말',
  'hud.fullscreen': '전체',
  'hud.loop': '루프',
  'hud.echoLive': '에코 작동 중',
  'hud.recording': '기록 중',
  'hud.binds': '기록 횟수',
  'world.launch': '발사 지점',
  'world.receiver': '수신기',
  'world.sentinel': '센티널 · 고정 순찰',
  'objective.alpha': '알파',
  'objective.cargo': '화물',
  'objective.signal': '신호',
  'objective.sentinel': '센티널',
  'objective.bypass': '우회',
  'prompt.escape': 'E / 사용 · 탈출',
  'prompt.dropThrow': 'E / 사용 · 내려놓기     J / 펄스 · 던지기',
  'prompt.pickup': 'E / 사용 · 들어 올리기',
  'prompt.sentinel': '센티널을 바라보기 · J / 펄스',
  'message.syncLost': '동기화 실패 · 두 번째 공격이 너무 늦었습니다.',
  'message.cargoLatched': '화물 노드 고정',
  'message.signalCaptured': '신호 포착 · 수신기 고정.',
  'message.veilOpen': '장막 개방 · 출구로 가서 사용하라.',
  'message.laserContact': '레이저 접촉 · 보라색을 읽고 빨간 빛을 통과하라.',
  'message.sentinelBreached': '센티널 돌파 · 격리 경로가 열렸습니다.',
  'message.shieldExposed': '방어막 노출 · 반대편 에코가 1.3초 안에 공격하라.',
  'message.rejected': '거부됨 · 두 번째 공격은 다른 자신이 해야 합니다.',
  'message.deflected': '튕겨냄 · 반대편에서 공격하라.',
  'message.loopExpired': '루프 종료 · 마지막 경로가 자동으로 기록됐습니다.',
  'message.echoBound': '에코 기록 완료 · 과거의 경로가 작동합니다.',
  'message.chapterReset': '챕터 초기화 · 임시 상태를 모두 지웠습니다.',
  'overlay.breachComplete': '돌파 완료',
  'overlay.time': '시간',
  'overlay.loops': '루프',
  'overlay.totalBinds': '총 기록',
  'overlay.next': '다음',
  'overlay.continue': '계속 · E / ENTER',
  'overlay.paused': '습격 일시정지',
  'overlay.pauseRules': '경로는 고정된 시간 간격으로 기록됩니다.\n에코는 이동, 사용, 던지기, 펄스를 재현합니다.\n새 기록은 이전 에코를 교체하며, 고정된 노드는 유지됩니다.',
  'overlay.pauseControls': '이동  WASD / D-PAD     사용  E / 사용     펄스  J / 펄스\n대시  SHIFT / 대시     기록  SPACE / 에코     재시작  R',
  'overlay.resume': '계속하기',
  'overlay.resetChapter': '챕터 초기화',
  'overlay.endingTitle': '마지막 1초는 너의 것이다',
  'overlay.endingText': '금고는 텅 빈 복도를 반복합니다.\n금고 밖에서 두 쌍의 발자국은 하나가 됩니다.',
  'overlay.escapeTime': '탈출 시간',
  'overlay.echoesBound': '에코 기록',
  'overlay.fracturesSurvived': '생존한 균열',
  'overlay.chapterResets': '챕터 초기화',
  'overlay.replay': '처음부터 다시',
  'overlay.note': 'E / ENTER로 다시 시작 · 모든 시스템과 점수가 깨끗하게 초기화됩니다.',
  'overlay.chapterSelect': '챕터 선택',
  'overlay.chapterSelectNote': '원하는 돌파를 연습하세요. 챕터를 고르면 새 캠페인 상태로 시작합니다.',
  'overlay.back': '뒤로',
  'rank.perfect': '등급 · 완벽한 역설',
  'rank.clean': '등급 · 깔끔한 탈출',
  'rank.time': '등급 · 시간을 훔쳤다',
  'touch.use': '사용',
  'touch.pulse': '펄스',
  'touch.dash': '대시',
  'touch.echo': '에코',
  'rotate.title': '가로 화면으로 돌려주세요',
  'rotate.body': '습격을 잠시 멈췄습니다. 퍼즐 전체와 큰 조작 버튼을 보려면 휴대폰을 가로로 돌리세요.',
}

export const UI_KEYS = Object.freeze(Object.keys(EN))

export type StageCopy = {
  title: string
  subtitle: string
  objective: string
  hint: string
  tutorial: readonly string[]
  labels: Record<string, string>
}

const STAGE_COPY: Record<Language, Record<string, StageCopy>> = {
  en: {
    'first-cut': {
      title: 'FIRST CUT',
      subtitle: 'Teach the lock to remember you.',
      objective: 'Leave your echo on ALPHA, then cross the veil.',
      hint: 'Stand on ALPHA, press ECHO, then run to the mint exit.',
      tutorial: [
        'MOVE · Reach the amber ALPHA glyph.',
        'ECHO · Bind this route while standing on ALPHA.',
        'COOPERATE · Your past self holds the veil open.',
      ],
      labels: { alpha: 'ALPHA' },
    },
    'dead-weight': {
      title: 'DEAD WEIGHT',
      subtitle: 'Evidence opens doors when memory holds the line.',
      objective: 'Echo on ALPHA. Carry the cargo onto CARGO.',
      hint: 'E picks up or drops the amber crate. A carried crate snaps to the plate.',
      tutorial: [
        'USE · Tap E near cargo to carry it.',
        'PLACE · Drop cargo inside the amber CARGO ring.',
        'DIVIDE · Only the echo can hold ALPHA while you work.',
      ],
      labels: { alpha: 'ALPHA', cargo: 'CARGO' },
    },
    'cross-signal': {
      title: 'CROSS SIGNAL',
      subtitle: 'A message can turn a corner if two moments touch it.',
      objective: 'Record a core throw. Pulse it sideways into RECEIVER.',
      hint: 'Carry the core to LAUNCH, face up, and PULSE to throw. On replay, intercept it.',
      tutorial: [
        'THROW · PULSE while carrying sends the core forward.',
        'PREVIEW · The dotted line shows its fair, fixed trajectory.',
        'REDIRECT · Pulse the flying core from the side during echo replay.',
      ],
      labels: { launchPad: 'LAUNCH', receiver: 'RECEIVER' },
    },
    'sentinel-shift': {
      title: 'SENTINEL SHIFT',
      subtitle: 'One strike turns the shield. Two moments break it.',
      objective: 'Hit the sentinel from opposite sides with current + echo.',
      hint: 'Record a left-side pulse after a short wait. Bind, dash right, answer the echo.',
      tutorial: [
        'PULSE · J emits a directional knockback wave.',
        'SYNC · The shield stays exposed for 1.3 seconds.',
        'OPPOSE · Echo and current must strike from different sides.',
      ],
      labels: { guardian: 'SENTINEL · FIXED PATROL' },
    },
    'fracture-run': {
      title: 'FRACTURE RUN',
      subtitle: 'The beams never lie. Read, phase, move.',
      objective: 'Echo on BYPASS. Move cargo, dash the live beam, escape.',
      hint: 'Warning beams are violet; red is live. Shift/DASH grants a short safe phase.',
      tutorial: [
        'READ · Violet warns. Red burns. Dark cyan recovers.',
        'DASH · Shift phases through one short danger window.',
        'EXECUTE · Echo disables the first beam while you move cargo.',
      ],
      labels: { alpha: 'BYPASS', cargo: 'CARGO' },
    },
    'zero-hour': {
      title: 'ZERO HOUR',
      subtitle: 'Steal back every second they took from you.',
      objective: 'Latch CARGO, SIGNAL, and SENTINEL. Echo on ALPHA. Escape.',
      hint: 'Progress nodes persist between binds. Solve one clean breach at a time.',
      tutorial: [
        'BREACH · CARGO, SIGNAL, and SENTINEL nodes latch between binds.',
        'COMBINE · Carry, throw, redirect, sync-strike, then record ALPHA.',
        'ESCAPE · Phase the last beam while your echo holds the lock.',
      ],
      labels: { alpha: 'ALPHA', cargo: 'CARGO', launchPad: 'LAUNCH', receiver: 'RECEIVER', guardian: 'SENTINEL · FIXED PATROL' },
    },
  },
  ko: {
    'first-cut': {
      title: '첫 절단',
      subtitle: '자물쇠에게 너를 기억시키는 법.',
      objective: '알파에 에코를 남긴 뒤 장막을 통과하라.',
      hint: '알파 위에 서서 에코를 기록한 뒤 민트색 출구로 달려가라.',
      tutorial: [
        '이동 · 황금색 알파 문양에 도착하라.',
        '에코 · 알파 위에서 이 경로를 기록하라.',
        '협력 · 과거의 내가 장막을 열어 둔다.',
      ],
      labels: { alpha: '알파' },
    },
    'dead-weight': {
      title: '무거운 증거',
      subtitle: '기억이 버티면 증거가 문을 연다.',
      objective: '에코는 알파에. 화물을 들어 화물판에 올려라.',
      hint: '화물 근처에서 E를 눌러 들거나 내려놓아라. 들고 있는 화물은 판에 밀착된다.',
      tutorial: [
        '사용 · 화물 근처에서 E를 눌러 들어라.',
        '배치 · 황금색 화물 고리 안에 내려놓아라.',
        '분담 · 네가 작업하는 동안 알파는 에코만 지킬 수 있다.',
      ],
      labels: { alpha: '알파', cargo: '화물' },
    },
    'cross-signal': {
      title: '교차 신호',
      subtitle: '두 순간이 닿으면 메시지도 모퉁이를 돈다.',
      objective: '코어를 던지는 경로를 기록하고 신호기로 옆에서 밀어라.',
      hint: '코어를 발사 지점으로 옮겨 위를 보고 펄스하라. 재생 중 옆에서 가로채라.',
      tutorial: [
        '던지기 · 들고 펄스하면 코어를 앞으로 던진다.',
        '예측 · 점선이 정해진 궤적을 보여 준다.',
        '전환 · 에코 재생 중 날아가는 코어를 옆에서 펄스하라.',
      ],
      labels: { launchPad: '발사', receiver: '수신기' },
    },
    'sentinel-shift': {
      title: '센티널 전환',
      subtitle: '한 번의 공격이 방패를 돌리고 두 순간이 부순다.',
      objective: '현재와 에코로 센티널을 서로 반대편에서 공격하라.',
      hint: '잠깐 기다렸다가 왼쪽에서 펄스를 기록하라. 기록 후 오른쪽으로 대시해 응답하라.',
      tutorial: [
        '펄스 · J로 방향성 넉백 파동을 발사한다.',
        '동기화 · 방어막은 1.3초 동안 노출된다.',
        '반대편 · 에코와 현재의 나는 서로 다른 쪽에서 공격해야 한다.',
      ],
      labels: { guardian: '센티널 · 고정 순찰' },
    },
    'fracture-run': {
      title: '균열 질주',
      subtitle: '빛은 거짓말하지 않는다. 읽고, 통과하고, 움직여라.',
      objective: '에코는 우회판에. 화물을 옮기고 살아 있는 빛을 대시로 통과하라.',
      hint: '보라색 빛은 경고, 빨간 빛은 활성 상태다. SHIFT/대시로 잠깐 안전해진다.',
      tutorial: [
        '판독 · 보라색은 경고, 빨간색은 피해, 짙은 청록은 회복이다.',
        '대시 · SHIFT로 짧은 위험 구간을 통과하라.',
        '실행 · 에코가 첫 빛을 끄는 동안 화물을 옮겨라.',
      ],
      labels: { alpha: '우회', cargo: '화물' },
    },
    'zero-hour': {
      title: '제로 아워',
      subtitle: '그들이 빼앗은 모든 1초를 되찾아라.',
      objective: '화물·신호·센티널을 고정하고 에코는 알파에 둔 뒤 탈출하라.',
      hint: '진행 노드는 기록 사이에도 유지된다. 한 번에 하나씩 깔끔하게 돌파하라.',
      tutorial: [
        '돌파 · 화물, 신호, 센티널 노드는 기록 사이에도 고정된다.',
        '결합 · 운반, 던지기, 전환, 동기화 공격 후 알파를 기록하라.',
        '탈출 · 에코가 자물쇠를 잡는 동안 마지막 빛을 통과하라.',
      ],
      labels: { alpha: '알파', cargo: '화물', launchPad: '발사', receiver: '수신기', guardian: '센티널 · 고정 순찰' },
    },
  },
}

export const tr = (language: Language, key: string, values: Record<string, string | number> = {}) => {
  const source = language === 'ko' ? KO : EN
  let value = source[key] ?? EN[key] ?? key
  for (const [name, replacement] of Object.entries(values)) {
    value = value.replaceAll(`{${name}}`, String(replacement))
  }
  return value
}

export const getStageCopy = (language: Language, stageId: string): StageCopy =>
  STAGE_COPY[language][stageId] ?? STAGE_COPY.en[stageId]

export const stageLabel = (language: Language, stageId: string, id: string) =>
  getStageCopy(language, stageId).labels[id] ?? tr(language, `objective.${id}`)

export const applyDocumentLanguage = (language: Language) => {
  document.documentElement.lang = language
  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (description) {
    description.content = language === 'ko'
      ? 'ECHO HEIST — 과거의 나와 협력해 네온 시간 금고를 탈출하는 퍼즐 액션 게임.'
      : 'ECHO HEIST — record a route, bind an echo, and escape a neon time vault with your past self.'
  }
  const rotateTitle = document.querySelector<HTMLElement>('#rotate-title')
  const rotateBody = document.querySelector<HTMLElement>('#rotate-body')
  if (rotateTitle) rotateTitle.textContent = tr(language, 'rotate.title')
  if (rotateBody) rotateBody.textContent = tr(language, 'rotate.body')
}
