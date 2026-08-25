export const LANGUAGES = ['en', 'ko'] as const

export type Language = (typeof LANGUAGES)[number]
export const LANGUAGE_STORAGE_KEY = 'echo-depths-language'

const ENGLISH = {
  loadingEyebrow: 'TEMPORAL VAULT // INITIALIZING',
  loading: 'Synchronizing the descent…',
  loadingDetail: 'Synchronizing resource',
  loadingAria: 'Dungeon loading progress',
  titleEyebrow: 'TEMPORAL VAULT // DESCENT PROTOCOL',
  titleHook: 'Outwit the vault with the only partner who moves exactly as you did.',
  titleRule: 'Record a route. Release your echo. Cooperate across height, machinery, and time.',
  start: 'Begin descent',
  chapterSelect: 'Chapter select',
  settings: 'Settings',
  settingsEyebrow: 'VAULT CONFIGURATION',
  settingsTitle: 'Settings',
  settingsBody: 'Adjust language, sound, and display without losing your current descent.',
  settingsLanguage: 'Language',
  settingsSound: 'Sound',
  settingsDisplay: 'Display',
  settingsControls: 'PC controls',
  settingsBack: 'Back',
  controlMove: 'Move',
  controlCamera: 'Orbit camera · drag up/down to adjust height',
  controlJump: 'Jump',
  controlInteract: 'Use, lift, or set down · carried objects stay ahead of the camera',
  controlEcho: 'Start / release echo recording',
  controlAttack: 'Directional strike',
  controlThrow: 'Preview / throw carried core',
  controlDash: 'Dash',
  controlSystem: 'Pause / fullscreen',
  languageEnglish: 'English',
  languageKorean: 'Korean · 한국어',
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit fullscreen',
  soundOn: 'Sound · On',
  soundOff: 'Sound · Off',
  controls: 'Controls and echo rule',
  controlsDesktop:
    'WASD / arrows move · drag horizontally to orbit and vertically to adjust camera height · Q/C rotates · Space jumps · E uses or carries · J / click attacks · K / right click throws · Shift dashes.',
  controlsEcho:
    'Press R to begin recording. Press R again to rewind the room and release one echo that repeats your fixed-step inputs and actions.',
  tutorialEyebrow: 'ORIENTATION CHAMBER // 00',
  tutorialName: 'Learn the descent',
  tutorialBody: 'Complete the PC drills in this safe room. Your first real chamber begins when you are ready.',
  tutorialStepMove: 'Move through the room.',
  tutorialStepCamera: 'Rotate the camera.',
  tutorialStepJump: 'Jump once.',
  tutorialStepInteract: 'Activate the console with E.',
  tutorialStepCarry: 'Lift the practice crate with E. It stays in front of the camera.',
  tutorialStepEcho: 'Press R to record, move, then press R again to release an echo.',
  tutorialContinue: 'Enter the first descent',
  tutorialSkip: 'Skip practice',
  feedbackTutorialReady: 'Orientation complete. Enter the first descent when ready.',
  feedbackTutorialComplete: 'Orientation complete. The first descent is open.',
  objective: 'Objective',
  paused: 'TEMPORAL HOLD',
  pauseTitle: 'The vault is waiting.',
  resume: 'Resume',
  restartChapter: 'Restart chapter',
  returnTitle: 'Return to title',
  chapterComplete: 'CHAPTER SEALED',
  continue: 'Descend deeper',
  endingEyebrow: 'THE LOOP OPENS',
  endingTitle: 'You escaped with your past intact.',
  rank: 'Final rank',
  replay: 'Begin again',
  rotateTitle: 'Turn toward the horizon',
  rotateBody: 'ECHO DEPTHS uses a wide view for the dungeon and touch controls. Rotate your device to landscape; your run is safely paused.',
  errorEyebrow: 'TEMPORAL FAULT',
  errorTitle: 'The descent could not continue.',
  reload: 'Reload the vault',
  jump: 'Jump',
  use: 'Act',
  pickup: 'Pick up',
  drop: 'Drop',
  attack: 'Strike',
  throw: 'Throw',
  dash: 'Dash',
  echo: 'Echo',
  languageName: 'English',
  chapterSelectTitle: 'Choose a descent',
  chapterSelectHint: 'Completed chapters remain open for practice.',
  chapterLocked: 'Locked',
  chapterAvailable: 'Available',
  chapterCleared: 'Cleared',
  chapterOneName: 'THE FIRST DESCENT',
  chapterOneObjective: 'Leave an echo on the lower plate, then climb and cross the open gate.',
  chapterOneComplete: 'You taught the vault to remember your weight.',
  chapterTwoName: 'COUNTERWEIGHT HALL',
  chapterTwoObjective: 'Keep the lower mechanism alive, ride upward, and lower the crate onto the weight plate.',
  chapterTwoComplete: 'Past hands held the lever while present hands tipped the balance.',
  chapterThreeName: 'THE SPLIT ATRIUM',
  chapterThreeObjective: 'Cross south to open the east shutter; receive the same Core through the north lane.',
  chapterThreeComplete: 'Past hands passed the same core to present hands across the gate.',
  chapterFourName: "THE WATCHER'S GALLERY",
  chapterFourObjective: 'Let the Echo ring the bell, then take the ramp to the high rear flank.',
  chapterFourComplete: 'The watcher followed a memory into the dark.',
  chapterFiveName: 'THE PARADOX WELL',
  chapterFiveObjective: 'In one recording, throw one Core east and continue to the lower seal.',
  chapterFiveComplete: 'Two versions of one pilgrim opened the final seal.',
  objectiveFirstLever: 'Open the approach lever.',
  objectiveFirstEchoPlate: 'Leave the echo on the lower pressure seal.',
  objectiveReachExit: 'Reach the open passage.',
  objectiveCounterweightPower: 'Let the echo hold the lower lift lever.',
  objectiveCounterweightRide: 'Ride the elevator to the upper gallery.',
  objectiveCounterweightCargo: 'Carry the counterweight to the edge and set it down onto the lower plate.',
  objectiveAtriumBridge: 'Record: carry the same Core to the north lane, throw east, then release the Echo.',
  objectiveAtriumCatch: 'Present Player: cross the player-only south passage to open the shutter.',
  objectiveAtriumRedirect: 'Collect the same Core from the east basin and place it in the receiver.',
  objectiveWatcherLure: 'Record a safe route to the bell and let the Echo ring it.',
  objectiveWatcherHazard: 'Use cover, walk up the ramp, and strike from the high rear flank.',
  objectiveParadoxCore: 'Record once: throw the same Core east, continue to the lower seal, then cross south and power the platform.',
  objectiveParadoxGuardian: 'Let the Echo hold the lower route and draw the Guardian; strike from the high rear flank.',
  objectiveParadoxSync: 'Hold the upper seal while the Echo remains on the lower seal.',
  objectiveParadoxEscape: 'Reach the passage before the temporal seal closes.',
  echoIdle: 'Echo dormant',
  echoRecording: 'Recording',
  echoReady: 'Echo route ready',
  echoReplaying: 'Echo replay',
  echoHolding: 'Echo holding',
  timerLabel: 'Time',
  interactUse: 'Use mechanism',
  interactLever: 'Activate lever',
  interactCarry: 'Lift object',
  interactDrop: 'Set down',
  interactCatch: 'Receive core',
  interactExit: 'Enter passage',
  interactSynchronize: 'Synchronize',
  feedbackRecordStart: 'Recording begun. Your next actions will become the route.',
  feedbackRecordEnd: 'Echo released. Move on.',
  feedbackEchoReplaced: 'The previous echo has dissolved.',
  feedbackPlateActive: 'Pressure seal engaged.',
  feedbackLeverActive: 'Mechanism held.',
  feedbackFirstLeverActive: 'Entry lever latched. Press R, walk to the cyan pressure seal, then press R again so the echo remains there.',
  feedbackDoorOpen: 'Gate unsealed.',
  feedbackCoreCaught: 'Core received from your past self.',
  feedbackTransferLaneOpen: 'The east-side transfer shutter is open. Receive the Echo\'s Core in the catch basin.',
  feedbackCoreRedirected: 'Core transferred to the receiver.',
  feedbackWatcherLured: 'Watcher attention transferred to the echo.',
  feedbackGuardianOpen: 'Guardian shield exposed.',
  feedbackGuardianShield: 'Its armored gaze faces you. Break attention, then strike from the rear high flank.',
  feedbackEscapeOpen: 'Final passage open. Run.',
  failureFall: 'The Depths reclaimed you. The chapter resets.',
  failureSeen: 'The watcher fixed on the present. Break its sight line.',
  failureTrap: 'The vault mechanism closed around you.',
  failureGuardian: 'The guardian struck while its shield still faced you.',
  failureTimeout: 'The synchronizers fell out of phase.',
  failureCoreLost: 'The core fell beyond recovery.',
  failureEchoDesync: 'The echo route could not complete its required action.',
  failureDefeat: 'Your present form broke. The chapter resets.',
  statPlayTime: 'Total play time',
  statEchoes: 'Echoes created',
  statFailures: 'Failures',
  statRestarts: 'Chapter restarts',
  statChapters: 'Chapters cleared',
  statusSoundOn: 'Sound enabled',
  statusSoundOff: 'Sound muted',
  statusFullscreen: 'Fullscreen',
  statusWindowed: 'Windowed view',
  statusPause: 'Pause',
  touchControls: 'Touch controls',
  moveControl: 'Movement joystick',
  cameraControl: 'Camera drag area',
  errorWebgl: 'This browser could not create the required 3D graphics context.',
  errorAssets: 'The dungeon resources did not finish loading. Check the connection and reload.',
  errorPhysics: 'The physics world could not be initialized safely.',
  errorInitialization: 'The temporal vault could not be initialized. Reload to try again.',
  errorUnknown: 'An unexpected temporal fault interrupted the game.',
} as const

export type TranslationKey = keyof typeof ENGLISH

const KOREAN = {
  loadingEyebrow: '시간 금고 // 초기화 중',
  loading: '심층 구역을 동기화하는 중…',
  loadingDetail: '리소스 동기화 중',
  loadingAria: '던전 불러오기 진행률',
  titleEyebrow: '시간 금고 // 하강 프로토콜',
  titleHook: '과거의 나와 정확히 협력해 시간 금고를 돌파하세요.',
  titleRule: '경로를 기록하고 에코를 해방해, 높이와 장치와 시간을 함께 넘으세요.',
  start: '하강 시작',
  chapterSelect: '챕터 선택',
  settings: '설정',
  settingsEyebrow: '금고 환경 설정',
  settingsTitle: '설정',
  settingsBody: '현재 하강 진행을 잃지 않고 언어, 사운드, 화면을 조정할 수 있습니다.',
  settingsLanguage: '언어',
  settingsSound: '사운드',
  settingsDisplay: '화면',
  settingsControls: 'PC 조작법',
  settingsBack: '뒤로',
  controlMove: '이동',
  controlCamera: '카메라 궤도 회전 · 위/아래 드래그로 높이 조절',
  controlJump: '점프',
  controlInteract: '사용·들기·내려놓기 · 든 물체는 카메라 앞에 유지',
  controlEcho: '에코 기록 시작 / 해방',
  controlAttack: '방향 공격',
  controlThrow: '들고 있는 코어 궤적 / 투척',
  controlDash: '대시',
  controlSystem: '일시정지 / 전체화면',
  languageEnglish: '영어 · English',
  languageKorean: '한국어',
  fullscreen: '전체화면',
  exitFullscreen: '전체화면 종료',
  soundOn: '사운드 · 켜짐',
  soundOff: '사운드 · 꺼짐',
  controls: '조작법과 에코 규칙',
  controlsDesktop:
    'WASD / 방향키 이동 · 가로 드래그 카메라 회전 · 세로 드래그 카메라 높이 · Q/C 회전 · Space 점프 · E 사용/운반 · J/클릭 공격 · K/우클릭 투척 · Shift 대시',
  controlsEcho:
    'R로 기록을 시작하고 다시 R을 누르세요. 에코가 과거 자리에 남고, 현재의 당신은 계속 움직일 수 있습니다.',
  tutorialEyebrow: '조작 연습실 // 00',
  tutorialName: '하강 준비',
  tutorialBody: '안전한 연습실에서 PC 조작을 익히세요. 준비가 되면 첫 번째 챕터로 들어갑니다.',
  tutorialStepMove: '방 안을 이동하세요.',
  tutorialStepCamera: '카메라를 회전하세요.',
  tutorialStepJump: '한 번 점프하세요.',
  tutorialStepInteract: '콘솔 앞에서 E를 누르세요.',
  tutorialStepCarry: '연습 상자 앞에서 E를 눌러 드세요. 든 물체는 카메라 앞에 유지됩니다.',
  tutorialStepEcho: 'R로 기록한 뒤 움직이고, 다시 R을 눌러 에코를 해방하세요.',
  tutorialContinue: '첫 번째 하강 시작',
  tutorialSkip: '연습 건너뛰기',
  feedbackTutorialReady: '조작 연습을 마쳤습니다. 준비되면 첫 번째 하강으로 들어가세요.',
  feedbackTutorialComplete: '조작 연습 완료. 첫 번째 하강이 열렸습니다.',
  objective: '목표',
  paused: '시간 정지',
  pauseTitle: '금고가 기다리고 있습니다.',
  resume: '계속하기',
  restartChapter: '챕터 다시 시작',
  returnTitle: '타이틀로 돌아가기',
  chapterComplete: '챕터 봉인 완료',
  continue: '더 깊이 내려가기',
  endingEyebrow: '루프가 열리다',
  endingTitle: '과거를 잃지 않고 탈출했습니다.',
  rank: '최종 등급',
  replay: '처음부터 다시',
  rotateTitle: '화면을 가로로 돌려주세요',
  rotateBody: 'ECHO DEPTHS는 던전과 터치 조작을 넓게 보여줍니다. 기기를 가로로 돌려주세요. 진행 상태는 안전하게 일시정지됩니다.',
  errorEyebrow: '시간 오류',
  errorTitle: '하강을 계속할 수 없습니다.',
  reload: '금고 다시 불러오기',
  jump: '점프',
  use: '동작',
  pickup: '들기',
  drop: '내려놓기',
  attack: '공격',
  throw: '투척',
  dash: '대시',
  echo: '에코',
  languageName: '한국어',
  chapterSelectTitle: '하강 지점 선택',
  chapterSelectHint: '완료한 챕터는 연습을 위해 계속 열려 있습니다.',
  chapterLocked: '잠김',
  chapterAvailable: '입장 가능',
  chapterCleared: '완료',
  chapterOneName: '첫 번째 하강',
  chapterOneObjective: '아래층 압력판에 에코를 남긴 뒤 계단을 올라 열린 문을 통과하세요.',
  chapterOneComplete: '금고가 당신의 무게를 기억하기 시작했습니다.',
  chapterTwoName: '균형추 회랑',
  chapterTwoObjective: '에코로 아래층 장치를 유지하고 승강기를 타고 올라가 균형추를 압력판으로 내리세요.',
  chapterTwoComplete: '과거의 손이 레버를 잡고 현재의 손이 균형을 바꿨습니다.',
  chapterThreeName: '갈라진 아트리움',
  chapterThreeObjective: '남쪽 길을 건너 동쪽 셔터를 열고, 북쪽 통로로 동일한 Core를 받으세요.',
  chapterThreeComplete: '과거의 손이 같은 코어를 지금의 손에 건넸습니다.',
  chapterFourName: '감시자의 회랑',
  chapterFourObjective: 'Echo가 종을 울리게 한 뒤 경사로를 따라 높은 후방으로 이동하세요.',
  chapterFourComplete: '감시자는 기억을 따라 어둠 속으로 사라졌습니다.',
  chapterFiveName: '역설의 우물',
  chapterFiveObjective: '한 번의 기록에서 Core 하나를 동쪽으로 던지고 아래 봉인까지 계속 이동하세요.',
  chapterFiveComplete: '한 순례자의 두 시간이 마지막 봉인을 열었습니다.',
  objectiveFirstLever: '진입 레버를 여세요.',
  objectiveFirstEchoPlate: '에코를 아래층 압력 봉인에 남기세요.',
  objectiveReachExit: '열린 통로에 도달하세요.',
  objectiveCounterweightPower: '에코가 아래층 승강기 레버를 유지하게 하세요.',
  objectiveCounterweightRide: '승강기를 타고 위층 회랑으로 이동하세요.',
  objectiveCounterweightCargo: '균형추를 가장자리로 옮겨 아래층 압력판 위에 내려놓으세요.',
  objectiveAtriumBridge: '기록: 동일한 Core를 북쪽 통로로 옮겨 동쪽으로 던진 뒤 Echo를 해제하세요.',
  objectiveAtriumCatch: '현재 Player: Player 전용 남쪽 길을 건너 셔터를 여세요.',
  objectiveAtriumRedirect: '동쪽 수거장의 동일한 Core를 들어 수신기에 놓으세요.',
  objectiveWatcherLure: '안전한 종 경로를 기록하고 Echo가 종을 울리게 하세요.',
  objectiveWatcherHazard: '엄폐를 이용해 경사로를 걸어 올라가 높은 후방에서 공격하세요.',
  objectiveParadoxCore: '한 번 기록: 동일한 Core를 동쪽으로 던지고 아래 봉인까지 간 뒤, 남쪽 길을 건너 플랫폼을 작동시키세요.',
  objectiveParadoxGuardian: 'Echo가 아래 경로를 유지해 수호자를 끌게 하고 높은 후방에서 공격하세요.',
  objectiveParadoxSync: 'Echo가 아래 봉인을 밟는 동안 위 봉인을 유지하세요.',
  objectiveParadoxEscape: '시간 봉인이 닫히기 전에 통로에 도달하세요.',
  echoIdle: '에코 대기',
  echoRecording: '기록 중',
  echoReady: '에코 경로 준비',
  echoReplaying: '에코 재생',
  echoHolding: '에코 유지 중',
  timerLabel: '시간',
  interactUse: '장치 사용',
  interactLever: '레버 작동',
  interactCarry: '물체 들기',
  interactDrop: '내려놓기',
  interactCatch: '코어 전달받기',
  interactExit: '통로 진입',
  interactSynchronize: '동기화',
  feedbackRecordStart: '기록을 시작했습니다. 다음 행동이 에코 경로가 됩니다.',
  feedbackRecordEnd: '에코가 해방되었습니다. 계속 이동하세요.',
  feedbackEchoReplaced: '이전 에코가 사라졌습니다.',
  feedbackPlateActive: '압력 봉인이 작동했습니다.',
  feedbackLeverActive: '장치가 유지됩니다.',
  feedbackFirstLeverActive: '진입 레버가 고정되었습니다. R을 누른 뒤 청록색 압력 봉인까지 이동하고 다시 R을 눌러 에코를 그곳에 남기세요.',
  feedbackDoorOpen: '문이 열렸습니다.',
  feedbackCoreCaught: '과거의 나로부터 코어를 전달받았습니다.',
  feedbackTransferLaneOpen: '동쪽 전송 셔터가 열렸습니다. 수거장에 도착한 Echo의 Core를 받으세요.',
  feedbackCoreRedirected: '코어를 수신기에 보냈습니다.',
  feedbackWatcherLured: '감시자의 주의가 에코로 향했습니다.',
  feedbackGuardianOpen: '수호자의 방패가 열렸습니다.',
  feedbackGuardianShield: '장갑의 시선이 당신을 향합니다. 주의를 끊은 뒤 높은 후면에서 공격하세요.',
  feedbackEscapeOpen: '마지막 통로가 열렸습니다. 달리세요.',
  failureFall: '심층 구역으로 추락했습니다. 챕터가 리셋됩니다.',
  failureSeen: '감시자가 현재의 당신을 발견했습니다. 시야를 끊으세요.',
  failureTrap: '금고 장치가 당신을 덮쳤습니다.',
  failureGuardian: '수호자의 방패가 향한 상태에서 공격받았습니다.',
  failureTimeout: '동기화 장치의 위상이 어긋났습니다.',
  failureCoreLost: '코어가 회수할 수 없는 곳으로 떨어졌습니다.',
  failureEchoDesync: '에코 경로가 필요한 행동을 완료하지 못했습니다.',
  failureDefeat: '현재의 형체가 무너졌습니다. 챕터가 리셋됩니다.',
  statPlayTime: '전체 플레이 시간',
  statEchoes: '생성한 에코',
  statFailures: '실패 횟수',
  statRestarts: '챕터 재시작',
  statChapters: '완료한 챕터',
  statusSoundOn: '사운드 켜짐',
  statusSoundOff: '사운드 꺼짐',
  statusFullscreen: '전체화면',
  statusWindowed: '창 모드',
  statusPause: '일시정지',
  touchControls: '터치 조작',
  moveControl: '이동 조이스틱',
  cameraControl: '카메라 드래그 영역',
  errorWebgl: '이 브라우저에서 필요한 3D 그래픽 환경을 만들 수 없습니다.',
  errorAssets: '던전 리소스를 모두 불러오지 못했습니다. 연결을 확인한 뒤 다시 불러오세요.',
  errorPhysics: '물리 월드를 안전하게 초기화하지 못했습니다.',
  errorInitialization: '시간 금고를 초기화하지 못했습니다. 다시 불러와 주세요.',
  errorUnknown: '예상하지 못한 시간 오류로 게임이 중단되었습니다.',
} as const satisfies Readonly<Record<TranslationKey, string>>

export const TRANSLATIONS: Readonly<Record<Language, Readonly<Record<TranslationKey, string>>>> = {
  en: ENGLISH,
  ko: KOREAN,
}

export const CHAPTER_IDS = [1, 2, 3, 4, 5] as const
export type ChapterId = (typeof CHAPTER_IDS)[number]

export interface ChapterCopy {
  readonly name: TranslationKey
  readonly objective: TranslationKey
  readonly complete: TranslationKey
}

export const CHAPTER_COPY: Readonly<Record<ChapterId, ChapterCopy>> = {
  1: { name: 'chapterOneName', objective: 'chapterOneObjective', complete: 'chapterOneComplete' },
  2: { name: 'chapterTwoName', objective: 'chapterTwoObjective', complete: 'chapterTwoComplete' },
  3: { name: 'chapterThreeName', objective: 'chapterThreeObjective', complete: 'chapterThreeComplete' },
  4: { name: 'chapterFourName', objective: 'chapterFourObjective', complete: 'chapterFourComplete' },
  5: { name: 'chapterFiveName', objective: 'chapterFiveObjective', complete: 'chapterFiveComplete' },
}

export const FAILURE_KEYS = [
  'fall',
  'seen',
  'trap',
  'guardian',
  'timeout',
  'core-lost',
  'echo-desync',
  'defeat',
] as const

export type FailureReason = (typeof FAILURE_KEYS)[number]

export const FAILURE_COPY: Readonly<Record<FailureReason, TranslationKey>> = {
  fall: 'failureFall',
  seen: 'failureSeen',
  trap: 'failureTrap',
  guardian: 'failureGuardian',
  timeout: 'failureTimeout',
  'core-lost': 'failureCoreLost',
  'echo-desync': 'failureEchoDesync',
  defeat: 'failureDefeat',
}

export const OBJECTIVE_IDS = [
  'first-lever',
  'first-echo-plate',
  'reach-exit',
  'counterweight-power',
  'counterweight-ride',
  'counterweight-cargo',
  'atrium-bridge',
  'atrium-catch',
  'atrium-redirect',
  'watcher-lure',
  'watcher-hazard',
  'paradox-core',
  'paradox-guardian',
  'paradox-sync',
  'paradox-escape',
] as const

export type ObjectiveId = (typeof OBJECTIVE_IDS)[number]

export const OBJECTIVE_COPY: Readonly<Record<ObjectiveId, TranslationKey>> = {
  'first-lever': 'objectiveFirstLever',
  'first-echo-plate': 'objectiveFirstEchoPlate',
  'reach-exit': 'objectiveReachExit',
  'counterweight-power': 'objectiveCounterweightPower',
  'counterweight-ride': 'objectiveCounterweightRide',
  'counterweight-cargo': 'objectiveCounterweightCargo',
  'atrium-bridge': 'objectiveAtriumBridge',
  'atrium-catch': 'objectiveAtriumCatch',
  'atrium-redirect': 'objectiveAtriumRedirect',
  'watcher-lure': 'objectiveWatcherLure',
  'watcher-hazard': 'objectiveWatcherHazard',
  'paradox-core': 'objectiveParadoxCore',
  'paradox-guardian': 'objectiveParadoxGuardian',
  'paradox-sync': 'objectiveParadoxSync',
  'paradox-escape': 'objectiveParadoxEscape',
}

export const STAT_KEYS = ['playTime', 'echoes', 'failures', 'restarts', 'chapters'] as const
export type StatKey = (typeof STAT_KEYS)[number]

export const STAT_COPY: Readonly<Record<StatKey, TranslationKey>> = {
  playTime: 'statPlayTime',
  echoes: 'statEchoes',
  failures: 'statFailures',
  restarts: 'statRestarts',
  chapters: 'statChapters',
}

export function isLanguage(value: string): value is Language {
  return LANGUAGES.some((language) => language === value)
}

export function readStoredLanguage(
  storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
): Language | null {
  if (!storage) return null
  try {
    const value = storage.getItem(LANGUAGE_STORAGE_KEY)
    return value && isLanguage(value) ? value : null
  } catch {
    return null
  }
}

export function isTranslationKey(value: string): value is TranslationKey {
  return Object.prototype.hasOwnProperty.call(ENGLISH, value)
}

export function translate(language: Language, key: TranslationKey): string {
  return TRANSLATIONS[language][key]
}

export function chapterCopy(language: Language, chapter: ChapterId): Readonly<{
  name: string
  objective: string
  complete: string
}> {
  const keys = CHAPTER_COPY[chapter]
  return {
    name: translate(language, keys.name),
    objective: translate(language, keys.objective),
    complete: translate(language, keys.complete),
  }
}

export function failureCopy(language: Language, reason: FailureReason): string {
  return translate(language, FAILURE_COPY[reason])
}

export function objectiveCopy(language: Language, objective: ObjectiveId): string {
  return translate(language, OBJECTIVE_COPY[objective])
}

export function applyTranslations(language: Language, root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n
    if (!key || !isTranslationKey(key)) {
      throw new Error(`Unknown translation key: ${key ?? '(missing)'}`)
    }
    element.textContent = translate(language, key)
  })
}
