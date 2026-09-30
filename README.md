# Natural English

한국인 성인 학습자를 위한 개인 영어회화 PWA입니다. HTML·CSS·바닐라 JavaScript를 사용하며 앱 런타임 외부 라이브러리가 없습니다. **OpenAI API, 유료 API, API 키, 계정, 개인 백엔드 서버가 필요 없습니다.**

## Galaxy Tab에서 사용하기

1. 앱의 `dist/` 파일을 **HTTPS 정적 호스팅**에 한 번 배포합니다. 배포된 주소는 기기에서 계속 같은 주소로 사용하세요. 개인 서버나 켜 둔 노트북에 연결하는 방식이 아닙니다. 이번 작업에는 호스팅 배포가 포함되어 있지 않습니다.
2. Galaxy Tab Chrome에서 HTTPS 주소에 접속하고 **오프라인 읽기 준비 완료**를 확인합니다.
3. 상단 **앱 설치** 또는 Chrome 메뉴 **홈 화면에 추가 → 설치**를 선택합니다.
4. ChatGPT가 만든 `Natural-English-2026-09-13.json` 파일을 태블릿에 내려받습니다.
5. 앱에서 **📂 오늘 교재 불러오기**를 누르고 파일 선택창에서 JSON을 선택합니다. 파일명보다 JSON 안의 `date`가 기준입니다.
6. 상단 날짜 버튼으로 Library를 열거나 **◀ 이전 / 다음 ▶**으로 저장한 날짜를 이동합니다.
7. **Settings → 💾 학습자료 백업**으로 교재·진도·즐겨찾기를 파일로 보관합니다. **백업 복원** 또는 상단 Import 버튼으로 복원할 수 있습니다.

설치와 캐시 준비 후 읽기, JSON Import, Library, 진도 저장, 백업은 오프라인에서도 작동합니다. 노트북을 켜 둘 필요가 없습니다. TTS와 음성인식은 아래 제약을 참고하세요. 가로 화면은 왼쪽 Expressions / 오른쪽 위 Reading / 오른쪽 아래 Vocabulary이며, 세로 및 좁은 화면은 한 열입니다.

## Windows에서 파일을 직접 열기

`dist/index.html`을 Chrome 또는 Edge로 열고 **오늘 교재 불러오기**를 누르면 Windows 파일 선택창이 열립니다. 같은 `dist/` 폴더의 `app.bundle.js`, CSS, 아이콘 등은 함께 보관하세요. 이 방식에서도 교재 Import와 IndexedDB 저장을 사용할 수 있지만, 파일을 이동하거나 브라우저를 바꾸면 저장소가 달라질 수 있으므로 백업을 보관하세요. 로컬 파일 실행은 PWA 설치 방식이 아닙니다. Android 설치에는 위 HTTPS 방식을 사용합니다.

## PC 로컬 실행

Node.js 18 이상에서 다음을 실행합니다. npm 패키지 설치와 빌드는 필요 없습니다.

```powershell
cd D:\Study\ChatGPT\Natural-English
npm start
```

브라우저에서 http://localhost:4173 을 엽니다. 종료는 Ctrl+C입니다. 이 서버는 PC 개발·확인용 정적 파일 서버입니다. 실제 Galaxy Tab 사용은 위 HTTPS 정적 호스팅 방식으로 하세요. `file://` 직접 실행도 기본 학습·Import를 지원하지만 Service Worker와 PWA 설치는 지원하지 않습니다. 일반 `http://PC-IP` 접속은 PWA 설치 환경이 아닙니다.

## 학습 기능과 저장 방식

- Today's Expressions 5개, Explain 상세 설명, 원어민 예문과 한국어 번역.
- Listen: SpeechSynthesis, 미국 영어 음성 우선, Normal / Slow.
- Practice: 확대 문장, 0~5회 진행, 마이크 텍스트 또는 수동 기록. 5회면 학습 완료가 자동 표시됩니다. 별도로 완료를 표시하거나 해제할 수 있고, 연습 초기화는 횟수와 완료 상태를 초기화합니다.
- Reading: English Only / English + Korean. 문장별 번역을 원하면 `paragraphs`를 한 문장씩 작성합니다.
- Vocabulary: Reading의 일치 표현 클릭 → 발음·뜻·문맥·추가 예문과 번역·Listen.
- 즐겨찾기 필터는 모든 날짜의 저장 표현을 모아 보여줍니다.
- 교재는 IndexedDB의 `lessons`, 진도는 `progress`, 마지막 날짜는 `meta`에 저장합니다. 진도 키는 `[date, expressionId]`입니다.
- 각 진도는 `practiceCount`(0~5), `favorite`(boolean), `completed`(boolean)를 가집니다. 속도·번역 설정만 localStorage에 보관합니다.
- 앱을 닫거나 기기를 재부팅해도 같은 브라우저·같은 사이트 주소에서 유지됩니다. 처음 실행할 때 기존 샘플과 기존 버전의 일치하는 즐겨찾기를 가져옵니다.
- Import는 구조를 먼저 검증하고 IndexedDB 트랜잭션이 완료된 뒤 성공을 알립니다. 오류가 나면 기존 교재를 유지합니다.
- 같은 날짜 재Import는 교체 확인 후 진행합니다. 같은 ID와 영어 표현인 항목의 진도만 유지하고, 바뀌거나 사라진 표현의 진도는 제거합니다.
- Library의 삭제는 해당 날짜 진도와 즐겨찾기도 삭제합니다. 전체 삭제는 Settings에서 확인 후 **전체 삭제**를 직접 입력해야 합니다. 삭제 후 샘플이 자동으로 다시 생기지 않습니다.

### 저장 지속성

IndexedDB는 재실행 후 유지되는 저장소입니다. 앱은 Import 시 영속 저장을 요청하며 Settings에서 **기기 저장 보호 요청**을 다시 할 수 있습니다. 브라우저가 요청을 거절할 수도 있습니다. 사이트 데이터 삭제, 앱/브라우저 제거, 저장 공간 정리까지 막는 절대적인 영구 저장은 웹앱이 보장할 수 없습니다. 중요한 자료는 백업을 내려받으세요. 시크릿 모드는 사용하지 마세요. 다른 브라우저나 다른 사이트 주소로 바꾸면 저장소도 달라지므로 백업을 가져와야 합니다.

## 표준 교재 JSON — v1

**기준 파일: `Natural-English-Sample.json`**

기계 판독용 JSON Schema: `Natural-English.schema.json` (Draft 2020-12).

앱은 `dist/data-model.js`에서 같은 필드와 자료형을 검증하며 실제 날짜, ID 중복, 표현 중복도 검사합니다. UTF-8 JSON만 지원하며 최대 파일 크기는 20MB입니다. 파일명 예: `Natural-English-2026-09-13.json`. 필드명은 대소문자를 구분합니다. 추가 필드는 무시되며 앱이 사용하는 표준 필드만 저장·백업합니다.

| 최상위 필드 | 타입 | 의미 |
|---|---|---|
| `schemaVersion` | number | 현재 `1`. 생략 가능하지만 넣는 것을 권장 |
| `date` | string | 실제 날짜 `YYYY-MM-DD`, 1900년 이상. Library의 고유 키 |
| `title` | string | 하루 교재 제목, 1~300자 |
| `expressions` | array | 서로 다른 표현 정확히 5개 |
| `reading` | object | 아래 읽기 구조 |
| `vocabulary` | array | 단어·표현 1~100개 |

### expressions의 각 항목

| 필드 | 필수 | 의미 |
|---|---|---|
| `id` | 선택 | 날짜 안에서 고유한 안정적 ID. 생략하면 영어 표현을 소문자·공백 정규화하여 생성. 명시 권장 |
| `expression` | 필수 | 영어 표현 |
| `meaningKo` | 필수 | 간단한 한국어 의미 |
| `category` | 필수 | `general`, `casual`, `idiom`, `phrasal-verb`, `young-generation`, `slang`, `sns` 중 하나 |
| `usageLevel` | 필수 | 사용 성격 설명. 예: `성인 일상·업무 대화`, `젊은 층 구어 / SNS · 이해 중심` |
| `explanationKo` | 필수 | 실제 의미 설명 |
| `nuanceKo` | 필수 | 뉘앙스와 주의할 차이 |
| `whenToUseKo` | 필수 | 사용 상황 |
| `ageGroup` | 필수 | 자연스러운 사용 연령대에 대한 설명 |
| `formality` | 필수 | 격식 수준 설명 |
| `recommendation` | 필수 | `actively-use`, `casual-use`, `understand-only` 중 하나 |
| `recommendationKo` | 선택 | 직접 사용 권장 여부에 대한 상세 설명 |
| `practiceSentence` | 선택 | 따라 말할 문장. 없으면 첫 번째 예문의 `en` 사용 |
| `examples` | 필수 | 1~10개의 `{ "en": "영어 예문", "ko": "자연스러운 한국어 번역" }` |

`recommendation`은 화면에서 각각 **적극 사용 추천 / 편한 대화에서 사용 / 알아듣는 정도면 충분**으로 표시합니다. 젊은 층의 유행어를 50대 성인이 굳이 직접 쓸 필요가 없을 때는 `category: "young-generation"` 또는 `"slang"`에 `recommendation: "understand-only"`를 사용하세요. 나이만으로 모든 표현 사용을 단정하지 말고 맥락과 개인 말투를 함께 설명하세요.

### reading

| 필드 | 의미 |
|---|---|
| `title` | 영어 글 제목 |
| `introductionKo` | 짧은 한국어 상황 소개 |
| `paragraphs` | 1~100개 항목. 각 항목 `{ "en": "영어 문장 또는 문단", "ko": "번역", "speaker": "MAYA" }`. `speaker`는 선택 |

각 `en` 바로 아래에 해당 `ko`가 표시됩니다. **문장별 번역을 위해 한 항목당 영어 한 문장을 권장**합니다. 교재 내용은 300~400단어를 권장하며 샘플 테스트로 분량을 확인합니다. Import는 더 짧거나 긴 자료도 허용합니다.

### vocabulary의 각 항목

| 필드 | 필수 | 의미 |
|---|---|---|
| `id` | 선택 | 날짜 안에서 고유 ID. 생략 시 word/phrase에서 생성 |
| `word` 또는 `phrase` | 필수 | 둘 중 정확히 하나: 영어 단어 또는 표현 |
| `pronunciation` | 필수 | 발음 표기, 예: `/teɪk ə reɪn tʃɛk/` |
| `meaningKo` | 필수 | 한국어 기본 뜻 |
| `contextualMeaningKo` | 필수 | 이 Reading에서의 의미 |
| `example` | 필수 | 추가 영어 예문 |
| `exampleKo` | 필수 | 추가 예문 번역 |
| `matches` | 선택 | 클릭 대상으로 만들 Reading의 실제 문자열 배열. 생략하면 word/phrase 사용 |

`matches`는 대소문자를 무시한 문자열 일치이며 자동 어형 분석은 하지 않습니다. 겹치면 먼저 등장하는 긴 표현을 우선합니다. 예를 들어 `word: "tackle"`인데 글에 `tackling`만 있으면 `matches: ["tackling"]`을 넣으세요. 일치하지 않는 단어는 읽기에서 클릭 표시가 생기지 않습니다. 모든 입력은 HTML이 아니라 텍스트로 표시합니다.

### 샘플 내용

`Natural-English-Sample.json`: 2026-09-13, **Lunch can wait**, 영어 302단어 / 한·영 17개 항목 / Vocabulary 10개.

- Play it by ear — idiom
- Talk through — phrasal verb
- A lot on my plate — idiom
- Take a rain check — casual expression
- Low-key excited — 젊은 층 구어, 이해 중심

샘플은 자체 작성한 미국식 대화입니다. `low-key`는 최근에도 쓰이는 젊은 층의 부사 용법이며 올해 새로 생긴 표현이라는 뜻은 아닙니다. 연령 설명은 일반적 경향입니다.

ChatGPT에 다음과 같이 요청할 수 있습니다.

> 첨부한 Natural-English-Sample.json과 동일한 스키마로 YYYY-MM-DD 교재를 만들어줘. 표현 5개와 영어 300~400단어 읽기, 문장별 한국어 번역, Vocabulary를 채워줘. idiom·phrasal verb·casual 표현을 포함하고 젊은 층 slang은 category와 recommendation을 정확히 표시해줘. 50대 성인이 알아듣기만 해도 충분한 표현은 understand-only로 설정해줘. 설명 없이 다운로드 가능한 UTF-8 JSON 파일을 만들어줘.

## 백업 JSON과 복원

```json
{
  "type": "natural-english-backup",
  "version": 1,
  "exportedAt": "2026-09-13T03:00:00.000Z",
  "lessons": [],
  "progress": [
    {
      "date": "2026-09-13",
      "expressionId": "play-it-by-ear",
      "practiceCount": 3,
      "favorite": true,
      "completed": false
    }
  ]
}
```

위는 구조 설명이며 실제 백업의 `lessons`에는 진도가 참조하는 교재 전체가 들어갑니다. 앱 Export가 자동으로 완전한 파일을 생성합니다. 복원은 전체 검증 후 한 트랜잭션으로 처리합니다. 같은 날짜는 교재와 진도를 백업 값으로 교체하고 다른 날짜는 유지합니다. 속도·번역 표시 같은 기기 UI 설정은 백업하지 않습니다. 백업에 없는 표현의 진도나 잘못된 횟수가 있으면 복원 전체를 거절합니다. 복원 한 번에 최대 2,000개 교재 / 진도 10,000개 / 20MB를 지원합니다.

## 파일 구조

```text
Natural-English/
├── README.md
├── Natural-English-Sample.json       # 향후 생성 교재의 기준
├── Natural-English.schema.json       # JSON Schema
├── package.json                      # 의존성 없는 앱 실행 및 검사
├── server.mjs                        # PC 개발용 정적 서버
├── scripts/
│   ├── build.mjs                     # 로컬 파일 호환 번들 생성
│   ├── file-import.test.mjs           # Chrome/Edge 파일 직접 실행 검사
│   ├── check.mjs                     # 기존 자료·아이콘 검사
│   ├── data.test.mjs                 # 표준 교재/백업/잘못된 입력 검사
│   ├── browser.test.mjs              # 실제 Chrome UI·IndexedDB 자동 검사
│   └── make-sample.mjs               # 기준 샘플 파일 생성
├── test-results/                     # 자동 검사 결과·화면 이미지
└── dist/                             # 정적 배포 대상
    ├── index.html                    # Import·Library·Settings·학습 UI
    ├── styles.css                    # 태블릿 반응형 스타일
    ├── app.bundle.js                 # 직접 실행 가능한 생성 번들
    ├── app.js                        # 화면·음성·교재 흐름
    ├── data-model.js                 # JSON 검증·기존 화면용 변환
    ├── library-db.js                 # IndexedDB 트랜잭션
    ├── sw.js                        # 앱 오프라인 캐시
    ├── manifest.webmanifest
    ├── icons/                       # 192px / 512px PNG 및 SVG
    └── data/
        ├── Natural-English-Sample.json
        ├── starter.json              # 첫 실행용 표준 교재
        ├── day-001.json              # 기존 샘플 보존
        └── index.json                # 기존 데이터 인덱스 보존
```

소스 JavaScript를 수정한 뒤에는 `npm run build`를 실행해 `dist/app.bundle.js`를 갱신하세요. 기본 제공 번들은 이미 생성되어 있어 앱 사용자는 빌드할 필요가 없습니다. 이 번들은 외부 패키지 없이 세 소스 파일과 첫 실행 교재를 묶으며, 로컬 파일에서 모듈 로딩이 차단되는 문제를 피합니다.

새 교재는 코드나 파일 배포를 수정하지 않고 Import하세요. 기존 `data/index.json`은 보존되어 있지만 v2의 Library 날짜 선택에는 사용하지 않습니다. 초기 샘플만 `starter.json`으로 제공하며 Import 교재가 IndexedDB의 기준 자료입니다.

## 테스트

```powershell
npm run check
npm run test:browser
```

앱은 외부 라이브러리가 없지만 브라우저 테스트에는 Playwright와 Chrome이 필요합니다. 개발 환경에 제공된 Playwright 경로를 기본 사용합니다. 다른 PC에서는 `PLAYWRIGHT_PATH`를 설치된 Playwright 패키지 경로로 지정하거나 테스트 스크립트의 경로를 수정하세요. 이 경로는 앱 코드·배포물에는 포함되지 않습니다.

브라우저 테스트는 로컬 서버 없이 로컬 파일을 가상 HTTPS 경로로 제공하고 **실제 Chrome IndexedDB와 영속 프로필**을 사용합니다. 테스트 브라우저는 종료합니다. 결과는 `test-results/results.json`, 화면은 `tablet-landscape.png`, `tablet-portrait.png`입니다.

검사 범위: 샘플 Import, 5개 표현, Explain, TTS 요청과 속도, 반복 3회 저장/5회 완료, 번역 전환, Vocabulary 및 예문 번역, 날짜 이동, 즐겨찾기, IndexedDB, Chrome 프로세스 종료 후 재실행, 오류 입력, 전체 Export, 개별 삭제, 전체 삭제 확인, 백업 복원, 같은 날짜 교체, 연습 초기화, 미지원 음성 기능, 가로/세로/360px 화면.

**TTS는 호출 경계를 대체해 문장·언어·속도를 검사하므로 실제 소리가 난다는 검증은 아닙니다.** Service Worker 실설치와 비행기 모드 캐시, Android 파일 선택 UI, 실제 마이크·음성은 Galaxy Tab에서 확인해야 합니다. 배포 후 앱을 설치하고 비행기 모드에서 재실행 → 파일 Import → 수동 연습 → 백업을 확인하세요.

## PWA 업데이트

정적 파일을 변경한 배포에는 `sw.js`의 `CACHE` 버전을 올립니다. 현재 `natural-english-v4`입니다. 새 버전을 내려받은 뒤 기존 앱 탭과 설치 앱을 모두 닫고 다시 열면 적용됩니다. 새 Service Worker는 이전 버전의 앱 캐시만 정리하며 IndexedDB 교재는 삭제하지 않습니다. 새로운 파일도 `ASSETS` 목록에 넣으세요. Import한 교재는 Service Worker 캐시와 별개로 IndexedDB에 저장됩니다.

## 제한사항

- 별도 서버·노트북은 필요 없지만 최초 설치를 위한 HTTPS 정적 사이트 제공은 필요합니다. 현재 공개 배포 URL은 없습니다.
- 실제 음성·마이크는 브라우저와 기기에 따라 다릅니다. Web Speech Recognition은 온라인 서비스로 음성을 전송할 수 있으며, 앱은 녹음·인식 텍스트를 보관하지 않습니다. 미지원/권한 거부 시 수동 연습을 사용합니다.
- TTS 오프라인 지원은 설치된 영어 음성에 따릅니다. 유료 TTS/API를 쓰지 않습니다.
- 발음 채점, 녹음 저장, AI 교재 자동 생성, 자동 클라우드 동기화는 없습니다.
- 데이터 영구 보존을 절대 보장할 수는 없습니다. 같은 브라우저의 일반 모드에서 사용하고 외부 백업 파일을 보관하세요.
- 여러 탭에서 같은 표현을 동시에 편집하는 공동 작업은 지원하지 않습니다. 한 앱 창에서 사용하는 것을 권장합니다.

참고: [MDN PWA 설치 조건](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API), [오프라인 데이터와 영속 저장](https://web.dev/learn/pwa/offline-data), [low-key 용법](https://www.dictionary.com/culture/slang/low-key).

### 파일 Import 수정 검증

`node scripts/file-import.test.mjs`는 Windows Chrome/Edge에서 실제 `file://` 경로로 `index.html`을 열고 버튼을 클릭해 파일 선택 이벤트를 확인합니다. 그 선택창으로 샘플을 Import한 뒤 브라우저를 완전히 재시작하여 즐겨찾기와 연습 진도 유지를 확인합니다. Settings의 백업 복원 선택창도 검사합니다. 결과: `test-results/file-import-results.json`.

연습창은 오른쪽 위의 **× 닫기** 또는 하단 **연습 마치고 돌아가기**로 언제든 종료할 수 있습니다. × 닫기는 스크롤해도 상단에 유지됩니다. 닫으면 음성과 마이크가 멈추며 이미 저장한 반복 횟수는 유지됩니다. PC에서는 Esc도 사용할 수 있습니다. 5회 후 자동으로 닫히지는 않습니다.

