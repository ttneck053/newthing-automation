# AX Contents Studio

기사 URL 또는 직접 입력한 본문을 바탕으로 **카드뉴스 5장, YouTube 썸네일, 블로그 초안, 리서치 노트**를 만드는 웹앱입니다. 생성된 문구와 사진을 브라우저에서 편집하고 PNG·ZIP·텍스트로 저장합니다.

이 저장소에는 프론트엔드, 공통 API 서버, 로컬 실행 도구, Sites·Vercel 빌드 설정, 테스트, 사진·폰트 자산이 포함되어 있습니다. **Node.js 24.x와 npm으로 실행하며, 애플리케이션의 외부 npm 의존성은 없습니다.**

![샘플 콘텐츠를 불러온 카드뉴스 편집기](docs/images/studio-sample.png)

> 현재 구현은 개인·소규모 내부 사용을 위한 도구입니다. 계정·로그인, 서버 작업 보관, 팀 협업, 사용자별 사용량 제한은 구현되어 있지 않습니다. [현재 제한](#현재-제한과-운영-조건)을 확인하세요.

## 빠른 실행

```sh
git clone https://github.com/ttneck053/ax-contents-studio.git
cd ax-contents-studio
npm run build
npm run dev
```

브라우저에서 <http://localhost:4177/generate>를 열고 **샘플로 시작**을 누릅니다. API 키 없이 카드 편집, 이미지 변경, 미리보기, PNG·ZIP 저장을 사용할 수 있습니다. 샘플은 기능 확인용 가상 기사로 표시됩니다.

- 비공개 저장소이므로 clone에는 저장소 접근 권한이 필요합니다.
- `npm install`은 필요하지 않습니다. Node.js·브라우저의 내장 기능을 사용합니다.
- 기본 빌드는 Bash를 사용합니다. Windows에서는 WSL 또는 Git Bash로 실행합니다.
- 최초 실행과 소스 수정 후에는 `npm run build`가 필요합니다. 개발 서버는 다시 생성된 번들을 감지하지만 소스를 자동 빌드하지는 않습니다.
- 개발 서버는 기본 포트 `4177`, 주소 `0.0.0.0`에 바인딩됩니다.

## 제공 기능

| 기능 | 구현 내용 |
| --- | --- |
| 기사 입력 | 공개 기사 URL에서 제목·본문·이미지 추출, 본문 직접 붙여넣기 |
| AI 생성 | 카드 문구·해시태그·블로그·리서치 초안을 한 번의 요청으로 생성 |
| 카드뉴스 | Hook → Body 1 → Body 2 → Expression → CTA, 총 5장 |
| 카드 디자인 | AWESOME MONEY, SEOUL ECONOMIC, WON MONEY.ZIP 채널별 스타일 |
| 카드 크기 | 카드뉴스 1080×1350, YouTube 썸네일 1920×1080 |
| 문구 편집 | 제목·본문·영어 표현·해설·CTA·해시태그 수정, 글자 수 표시 |
| 제목 스타일 | 윗줄·아랫줄 색상, 크기, 배경 강조 설정 |
| 이미지 | 직접 업로드·드래그 앤 드롭·URL 가져오기·내장 사진 3종·제거 |
| 이미지 배치 | 좌우 위치 조정, CTA 왼쪽·중앙·오른쪽 정렬 |
| 배경 | 화이트·다크·크림 팔레트 |
| 내보내기 | 카드별 PNG, 카드와 `caption.txt`를 묶은 ZIP |
| 문서 | 블로그·리서치 초안 수정, 복사, UTF-8 텍스트 다운로드 |
| 작업 유지 | 같은 브라우저·출처의 localStorage에 현재 작업 자동 저장 |
| 사용성 | 확대 미리보기, 생성 진행·오류·취소, 사이드바 접기, 좁은 화면 가로 스크롤 |

YouTube 모드는 첫 번째 카드의 썸네일을 표시하고, ZIP에는 썸네일 1장과 캡션을 넣습니다. 채널을 바꾸면 현재 콘텐츠를 선택한 디자인으로 표시합니다. 채널별로 독립된 작업 기록을 보관하지는 않습니다.

## 사용 순서

1. 사이드바에서 카드뉴스 채널, YouTube, 블로그 또는 리서치를 선택합니다.
2. **GPT 연결**에서 키를 입력하거나, **샘플로 시작**으로 편집기를 확인합니다.
3. 기사 URL 또는 본문을 입력하고 **Generate**를 누릅니다. `Ctrl+Enter` / `⌘+Enter`도 사용할 수 있습니다.
4. 생성된 문구를 검토하고 사진·글자·배경을 조정합니다.
5. 카드 클릭으로 확대 미리보기를 열고 PNG 또는 ZIP을 저장합니다. 문서 모드에서는 복사나 텍스트 저장을 사용합니다.

새 콘텐츠 생성과 샘플 불러오기는 현재 카드 내용과 이미지 설정을 교체합니다. 보관할 작업은 먼저 다운로드하세요. 생성 취소는 브라우저의 대기를 중단하며, 이미 전달된 서버·모델 요청의 처리나 비용까지 취소한다고 보장하지 않습니다.

## GPT 연결과 환경 변수

### 개인 키 입력

앱의 **GPT 연결**에서 프로젝트 API 키와 모델을 선택합니다. 키는 페이지의 메모리에 보관하고, 새로고침하거나 탭을 닫으면 다시 입력해야 합니다. 애플리케이션은 키를 localStorage나 서버 파일에 기록하지 않습니다.

실제 생성 시 키는 같은 출처의 `/api/generate` 서버로 전달되고, 서버가 OpenAI 요청의 인증 헤더로 사용합니다. 개인 키가 있으면 서버 환경 변수의 키보다 우선합니다. **설정 적용**은 입력을 반영하는 단계이며, 키의 권한·잔액·모델 접근 가능 여부는 실제 Generate 요청에서 확인합니다.

### 서버 키 설정

```sh
cp .env.example .env.local
```

`.env.local`을 편집합니다. 실제 키를 Git에 커밋하지 않습니다.

```dotenv
OPENAI_API_KEY=여기에_개인_API_키_입력
OPENAI_MODEL=gpt-5.4-mini
AXSTUDIO_PORT=4177
```

| 변수 | 기본값 | 역할 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 미설정 | 서버에서 사용할 공용 키. 없어도 샘플·수동 편집 가능 |
| `OPENAI_MODEL` | `gpt-5.4-mini` | 요청에 유효한 모델이 없을 때 적용하는 서버 기본값 |
| `AXSTUDIO_PORT` | `4177` | 로컬 개발 서버 포트 |

현재 코드의 모델 허용 목록은 `gpt-5.4-mini`, `gpt-5.4`입니다. 브라우저는 선택된 모델을 매 요청에 보내므로 서버 기본값보다 그 선택이 우선합니다. 모델을 추가할 때는 `worker/server.mjs`의 허용 목록과 `web/index.html`의 선택 항목을 함께 수정해야 합니다. 실제 이용 가능 여부는 연결된 API 계정에서 확인해야 합니다.

`.env.local`은 `npm run dev` / `npm start`가 읽습니다. 값을 바꾼 뒤에는 개발 서버를 재시작합니다. Vercel·Sites 환경에서는 해당 배포 플랫폼의 환경 변수 또는 비밀 값으로 설정합니다.

## 구현 구조

```text
브라우저: web/index.html + styles.css + app.js
  ├─ 기사 URL / 본문 → POST /api/generate
  │                     ├─ URL이면 기사 HTML 수집·본문 추출
  │                     ├─ OpenAI Responses API → 구조화된 JSON
  │                     └─ 결과 필드 검증 → 콘텐츠·출처·사용량 반환
  ├─ 사진 URL → GET /api/image → 같은 출처의 이미지 응답
  ├─ 편집 상태 → localStorage
  └─ Canvas 2D → PNG / 브라우저에서 ZIP 작성

서버의 공통 구현: worker/server.mjs
  ├─ 로컬 / Sites: 빌드된 worker/index.js가 정적 자산까지 제공
  └─ Vercel: api/*.js가 공통 핸들러 호출, 정적 자산은 dist-vercel/
```

- **프론트엔드:** 프레임워크 없이 HTML·CSS·JavaScript로 구현했습니다. URL 변경은 History API를 사용합니다.
- **이미지 렌더링:** 브라우저 Canvas 2D가 사진, 텍스트, 줄바꿈, 강조, 로고 도형을 그립니다. PNG 저장도 같은 Canvas를 사용합니다.
- **ZIP:** PNG와 캡션을 ZIP STORE 형식으로 묶습니다. 외부 압축 라이브러리를 사용하지 않습니다.
- **기사 파서:** `articleBody`, 알려진 본문 ID·클래스, `article`, `main` 순서로 후보를 찾고 우선순위와 본문 길이로 선택합니다. 로그인이나 JavaScript 실행이 필요한 기사는 본문을 직접 입력해야 할 수 있습니다.
- **모델 응답:** Responses API에 `store: false`, strict JSON Schema, 출력 한도 4,200 tokens를 지정합니다. 수신 결과의 필수 필드·문자열 길이·해시태그 형식도 서버에서 검증합니다.
- **서버 저장:** DB·파일 업로드 저장소·작업 큐를 사용하지 않습니다. 브라우저가 기사를 서버로 보내고 서버는 필요한 데이터를 모델 공급자에게 전달합니다. `store: false` 설정이 모든 플랫폼 로그나 공급자 보관 정책을 대신하는 것은 아닙니다.

## 파일 안내

```text
ax-contents-studio/
├── README.md                     # 프로젝트 설명·실행·API·운영 안내
├── docs/
│   ├── reference-analysis.md     # 참고 웹앱 분석과 REA 사용 판단
│   ├── verification.md           # 검증 범위와 재현 절차
│   └── images/studio-sample.png  # 로컬 샘플 화면
├── web/
│   ├── index.html                # 페이지·설정·이미지·미리보기 대화상자
│   ├── styles.css                # 레이아웃·반응형·편집기 스타일
│   ├── app.js                    # 상태·화면·Canvas·다운로드·API 호출
│   └── assets/                   # 사진 3종·Pretendard 폰트·폰트 라이선스
├── worker/
│   └── server.mjs                # 기사 추출·모델 호출·API·Worker 핸들러
├── api/
│   ├── config.js                 # Vercel 설정 조회 어댑터
│   ├── article.js                # Vercel 기사 추출 어댑터
│   ├── generate.js               # Vercel 콘텐츠 생성 어댑터
│   └── image.js                  # Vercel 이미지 프록시 어댑터
├── scripts/
│   ├── compile.mjs               # 서버와 정적 자산을 worker/index.js로 묶음
│   ├── build.sh                  # Sites용 dist/ 구성
│   ├── build-vercel.mjs          # Vercel용 정적 파일 복사
│   ├── dev-server.mjs            # Node HTTP ↔ Fetch API 로컬 어댑터
│   └── validate-artifact.mjs     # 빌드 산출물의 ESM·fetch export 검증
├── tests/api.test.mjs            # Node 내장 테스트 러너 기반 API 회귀 테스트
├── .openai/hosting.json          # Sites 프로젝트 바인딩·리소스 선언
├── .env.example                  # 비밀 값 없는 환경 변수 예시
├── .gitignore                    # 비밀 값·생성 파일·개인 도구 상태 제외
├── .vercelignore                 # Vercel 업로드 제외 항목
├── vercel.json                   # 빌드·함수·라우팅·응답 헤더
└── package.json                  # 명령·Node 버전 요구사항
```

`worker/index.js`, `dist/`, `dist-vercel/`, `site.tar.gz`는 생성 파일이므로 최신 소스 트리에서 추적하지 않습니다. 기존 커밋 이력은 보존합니다. 소스는 `web/`와 `worker/server.mjs`에서 수정하고 빌드로 재생성합니다. `.openai/hosting.json`에는 기존 Sites 프로젝트 ID가 들어 있으므로 다른 Sites 프로젝트에 배포할 때는 그 프로젝트의 설정으로 교체합니다.

## 명령 모음

| 명령 | 역할 |
| --- | --- |
| `npm run build` | 정적 자산을 포함한 Worker와 Sites용 `dist/` 생성 |
| `npm run dev` | 로컬 서버 시작. 먼저 Worker 빌드 필요 |
| `npm start` | `npm run dev`와 같은 로컬 서버 실행 |
| `npm test` | API·파서 테스트 실행. 외부 유료 API 호출 없음 |
| `npm run validate` | `dist/server/index.js`와 호스팅 manifest 검증. 먼저 빌드 필요 |
| `npm run build:vercel` | `dist-vercel/`에 정적 파일 생성 |

## API 참고

API의 공통 구현은 `createHandler()`입니다. 생성·기사 요청은 `application/json`을 사용하며, 오류는 주로 `{ "error": "사용자 안내", "code": "오류 코드" }` 형태로 반환합니다. 모든 오류에 구체적인 전용 코드가 있는 것은 아닙니다.

| 메서드·경로 | 입력 | 응답 |
| --- | --- | --- |
| `GET /api/config` | 없음 | `{ configured, model }`. 실제 키를 반환하지 않음 |
| `POST /api/article` | `{ url }` | `{ title, text, url, images, description }` |
| `POST /api/generate` | `{ input, apiKey?, model?, channel? }` | `{ content, usage, article, model }` |
| `GET /api/image?url=...` | 공개 이미지 URL | 허용된 이미지의 바이너리 응답 |

`channel`은 `awesome`, `economic`, `won`, `youtube`, `blog`, `research` 중 하나입니다. `/api/generate`는 채널과 관계없이 모든 콘텐츠 필드를 생성합니다. `article.description`은 URL 추출 결과에 포함되며, 본문 직접 입력 결과에는 없습니다. `usage`는 공급자가 사용량을 반환하지 않으면 `null`입니다.

| 생성 콘텐츠 필드 | 용도 |
| --- | --- |
| `title` | 기사·콘텐츠 제목 |
| `hook` | 첫 카드와 썸네일의 헤드라인 |
| `body1`, `body2` | 핵심 사실, 배경·의미 |
| `phrase`, `meaning` | 영어 표현과 한국어 해설 |
| `cta` | 마지막 카드의 마무리 문구 |
| `hashtags` | 문자열 3개. 서버가 `#`와 공백을 정리 |
| `blog`, `research` | 블로그 초안·리서치 노트 |

서버 키를 설정한 로컬 환경에서 생성 요청을 직접 확인하는 예시입니다. 이 요청은 실제 모델 호출을 발생시킵니다.

```sh
curl http://localhost:4177/api/generate \
  -H 'Content-Type: application/json' \
  --data '{"input":"제목과 함께 확인할 수 있는 기사 본문을 30자 이상 입력합니다.","model":"gpt-5.4-mini","channel":"won"}'
```

주요 오류 코드는 `KEY_REQUIRED`(503), `INVALID_KEY`(401), `API_PERMISSION`(403), `MODEL_UNAVAILABLE`(422), `API_BILLING_LIMIT`(429), `API_RATE_LIMIT`(429)입니다. 잘못된 입력·기사 추출 실패·모델 거절·불완전한 응답·시간 초과도 사용자 메시지로 처리합니다.

## 입력·이미지 제한

| 항목 | 현재 코드의 제한 |
| --- | --- |
| 직접 입력 본문 | 30~24,000자 |
| 추출한 기사 본문 | 최소 120자, 최대 24,000자로 잘라 사용 |
| 기사 HTML 응답 | 최대 2,000,000 bytes |
| JSON 요청 본문 | 최대 120,000 bytes |
| 기사 이미지 후보 | 최대 5개 |
| 직접 이미지 업로드 | JPG·PNG·WEBP·GIF, 최대 8,000,000 bytes |
| 업로드 이미지 변환 | 긴 변 최대 1600px, JPEG 품질 0.85로 변환 |
| 이미지 프록시 | Worker 기본 8,000,000 bytes, Vercel 4,000,000 bytes |
| 외부 기사·사진 요청 | 각 요청 15초, 리다이렉트를 포함해 최대 5회 fetch |
| 모델 요청 | 서버 90초 제한, 브라우저 생성 대기 110초 제한 |

HEIC는 지원하지 않습니다. GIF를 카드에 쓰면 Canvas로 읽은 정지 프레임이 출력됩니다. 프록시는 AVIF 응답도 허용하지만 업로드·URL 이미지 편집 경로의 파일 형식 검증은 JPG·PNG·WEBP·GIF로 제한되어 있습니다.

글자 수 표시는 편집 가이드입니다. 프롬프트의 목표 길이, UI 카운터, 서버의 최대 문자열 검증 범위는 서로 다르므로 모든 목표 길이를 강제하는 기능으로 보아서는 안 됩니다.

## 작업 저장과 키 처리

- `ax-contents-studio-v1`이라는 localStorage 키에 콘텐츠, 기사 정보, 카드 설정, 입력문, 모델 선택을 저장합니다.
- 변경 후 약 300ms에 저장합니다. 업로드한 사진은 축소된 data URL 형태로 포함될 수 있습니다.
- 개인 API 키는 저장 상태 객체와 분리되어 있습니다. 설정 창을 닫으면 입력 요소도 비웁니다.
- 서버 공용 키는 환경 변수에서 읽습니다. 설정 조회는 키의 존재 여부만 반환합니다.
- 브라우저 데이터를 삭제하거나 다른 브라우저·다른 도메인을 사용하면 이전 작업이 자동으로 이어지지 않습니다.
- 저장 공간이 부족하면 화면에 안내합니다. 현재 작업의 확실한 보관은 다운로드로 처리합니다.

## 배포

### Vercel

프로젝트의 프레임워크는 **Other**, Node.js는 **24.x**로 설정합니다. 저장소의 `vercel.json`은 다음 구성을 선언합니다.

- 빌드 명령: `npm run build:vercel`
- 정적 출력: `dist-vercel/`
- API: `api/*.js`에서 공통 서버 핸들러 실행
- 페이지 경로: `/generate`, `/blog`, `/research`를 `index.html`로 연결
- 함수 최대 실행 시간 요청값: 180초. 실제 플랫폼·플랜의 적용 조건은 배포 시 확인
- CSP, `nosniff`, referrer 정책 및 일부 자산 캐시 헤더

```sh
npm test
npm run build:vercel
vercel --prod
```

Vercel CLI를 사용하는 경우 별도 설치와 로그인·프로젝트 연결이 필요합니다. GitHub 저장소를 Vercel에 연결하는 방식으로도 배포할 수 있습니다. `OPENAI_API_KEY`를 등록하지 않으면 사용자가 자신의 키를 입력해 생성합니다. 서버 공용 키를 설정하기 전에는 [운영 조건](#현재-제한과-운영-조건)을 확인하세요.

### Sites / Worker 산출물

```sh
npm run build
npm run validate
```

산출물은 `dist/server/index.js`와 `dist/.openai/hosting.json`입니다. Worker는 `export default { fetch }` 형태이며 정적 자산을 자체 포함합니다. `npm run build`는 파일 생성까지만 수행하고 원격 배포는 하지 않습니다. Sites 프로젝트의 호스팅 절차로 `dist/`를 배포해야 합니다.

## 검증

```sh
npm test
npm run build
npm run validate
npm run build:vercel
```

API 테스트는 `node:test`와 주입 가능한 모의 `fetch`를 사용합니다. 기사 본문 선택, 잘못된 URL과 리다이렉트, 응답 크기, 키 우선순위, 모델 요청 형식, 응답 검증, 인증·권한·잔액·속도 오류, 이미지 형식·크기를 검증합니다.

실제 모델 호출 성공, 모든 뉴스 사이트의 추출 성공, 브라우저별 렌더링과 원격 배포 상태까지 이 테스트가 보장하지는 않습니다. [최근 검증 기록과 수동 점검 순서](docs/verification.md)를 참고하세요.

## 현재 제한과 운영 조건

1. **계정·접근 통제·요청 제한 없음:** Origin 검사는 일부 다른 출처의 브라우저 요청을 차단하지만 사용자 인증을 대신하지 않습니다. 서버 공용 키를 설정하면 API에 접근한 사람이 그 키로 요청을 발생시킬 수 있습니다. 외부 사용자에게 운영할 때는 인증·사용량 제한·예산 관리를 별도로 마련해야 합니다.
2. **URL 필터의 범위:** 사설 IP 문자열, localhost류 이름, 자격 증명 포함 주소, 지원하지 않는 포트를 차단하고 리다이렉트마다 재검사합니다. DNS 해석 결과를 검증하거나 연결 IP를 고정하지 않으므로 완전한 SSRF 방어를 보장하지 않습니다.
3. **기사 추출 범위:** 정적 HTML 분석입니다. 유료벽, 로그인, 수집 차단, JavaScript로만 제공되는 본문은 직접 입력이 필요할 수 있습니다.
4. **작업 관리:** 브라우저에 현재 작업 하나를 보관합니다. 서버 이력·다중 프로젝트·협업·버전 복구·프로젝트 파일 재가져오기는 없습니다.
5. **편집 범위:** 템플릿 기반 Canvas 편집기입니다. 임의 레이어 추가, 자유 배치, 리치텍스트의 임의 구간 선택 스타일은 없습니다. 제목 스타일은 윗줄·아랫줄 단위입니다.
6. **생성 결과:** JSON 형식 검증은 사실 검증과 다릅니다. 모델 결과의 숫자·이름·해석·출처를 사람이 확인해야 합니다. 추가 웹 검색이나 자동 교차 검증은 수행하지 않습니다.
7. **취소·재시도:** 작업 큐나 서버 취소 전파, 자동 재시도, 요청 중복 방지는 구현되어 있지 않습니다.

## 참고 프로젝트와 자산

화면·작업 흐름의 참고 대상은 [AX CONTENTS LAB 카드뉴스 웹앱](https://d5p63uohqc773.cloudfront.net/generate?source=sedaily&design=won-money)입니다. 참고 앱과 이 저장소는 기술 구조와 일부 기능이 다릅니다. 이 저장소에는 참고 앱의 서버 소스나 REA 저장소를 포함하지 않습니다. 관측한 범위와 REA 도입 판단은 [참고 웹앱 분석](docs/reference-analysis.md)에 정리했습니다.

| 자산 | 출처·고지 |
| --- | --- |
| `web/assets/city.jpg` | [Unsplash 도시 이미지](https://images.unsplash.com/photo-1486406146926-c627a92ad1ab) |
| `web/assets/markets.jpg` | [Unsplash 금융 차트](https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3) |
| `web/assets/desk.jpg` | [Unsplash 업무 이미지](https://images.unsplash.com/photo-1454165804606-c3d57bc86b40) |
| `web/assets/pretendard.woff2` | Pretendard, [동봉된 SIL Open Font License 1.1](web/assets/font-license.txt) |

사진·폰트·참고 브랜드는 각각의 출처와 권리 조건을 유지합니다. 이 저장소에 프로젝트 코드 전체를 대상으로 한 별도 오픈소스 라이선스는 지정하지 않았습니다.
