# 뉴띵 카드뉴스 자동화

기사 URL 또는 직접 입력한 본문을 바탕으로 **인스타그램 카드뉴스 5장**을 만드는 웹앱입니다. 생성된 문구와 사진을 브라우저에서 편집하고 PNG·ZIP으로 저장합니다. **Figma 플러그인**으로 텍스트·사진·도형이 분리된 편집 가능한 카드를 바로 제작할 수 있습니다.

이 저장소에는 프론트엔드, 공통 API 서버, 로컬 실행 도구, Cloudflare 무료 배포 설정과 기존 Sites·Vercel 빌드 설정, 테스트, 사진·폰트 자산이 포함되어 있습니다. **Node.js 24.x와 npm으로 실행합니다. 앱 런타임에는 외부 npm 의존성이 없으며, Cloudflare 개발·배포 도구로 Wrangler를 사용합니다.**

![샘플 콘텐츠를 불러온 카드뉴스 편집기](docs/images/studio-sample.png)

> 현재 구현은 개인·소규모 내부 사용을 위한 도구입니다. 웹앱 자체 로그인, 장기 작업 이력, 팀 협업, 생성 API의 사용자별 사용량 제한은 구현되어 있지 않습니다. Figma 연결과 임시 전송 보관은 지원합니다. [현재 제한](#현재-제한과-운영-조건)을 확인하세요.

## 서버 비용 0원 원칙

기본 배포 대상은 **Cloudflare Workers Free + 무료 정적 호스팅 + D1 Free**입니다. 도메인은 무료 `workers.dev` 주소를 사용합니다. 유료 Workers 플랜·Vercel Pro·외부 Redis·유료 도메인을 추가하지 않습니다. Cloudflare 경로에서는 서버 공용 GPT 키를 사용하지 않고, 사용자가 웹앱에 등록한 키로만 GPT를 호출합니다.

무료 한도 안에서 서버·저장소 비용은 0원입니다. **무료 한도를 초과하면 요청이 제한되며 유료 플랜으로 자동 전환하지 않습니다.** 이 조건은 Cloudflare 계정이 Workers Free 플랜일 때 적용됩니다. 이미 유료 플랜인 계정에 배포하면 같은 비용 조건이 성립하지 않으므로 배포 전에 계정 플랜을 확인해야 합니다. 코드 설정만으로 계정의 청구 플랜을 바꿀 수는 없습니다.

현재 공식 무료 한도는 Worker API 하루 100,000회, 호출당 CPU 10ms, D1 하루 500만 행 읽기·10만 행 쓰기입니다. 정적 자산 요청은 무료이며 API 한도와 분리합니다. 큰 기사 처리나 사용량 증가로 한도에 도달하면 잠시 기다리거나 기사 본문을 직접 입력해야 할 수 있습니다. 무제한 서비스라는 뜻은 아닙니다. [Workers 요금](https://developers.cloudflare.com/workers/platform/pricing/), [D1 한도 도달 시 처리](https://developers.cloudflare.com/d1/platform/pricing/#what-happens-if-i-exceed-the-daily-limits-on-reads-and-writes-or-the-total-storage-limit-on-the-free-plan).

## 빠른 실행

```sh
# 프로젝트 폴더에서 실행
npm run build
npm run dev
```

브라우저에서 <http://localhost:4177/generate>를 열고 **샘플 보기**를 누릅니다. API 키 없이 카드 편집, 이미지 변경, 미리보기, PNG·ZIP 저장을 사용할 수 있습니다. 샘플은 기능 확인용 가상 기사로 표시됩니다.

- 위 Node 로컬 실행에는 패키지 설치가 필요하지 않습니다. Cloudflare 환경 검증·배포에는 `npm ci`로 Wrangler를 설치합니다.
- 기본 빌드는 Bash를 사용합니다. Windows에서는 WSL 또는 Git Bash로 실행합니다.
- 최초 실행과 소스 수정 후에는 `npm run build`가 필요합니다. 개발 서버는 다시 생성된 번들을 감지하지만 소스를 자동 빌드하지는 않습니다.
- 개발 서버는 기본 포트 `4177`, 주소 `0.0.0.0`에 바인딩됩니다.

## 제공 기능

| 기능 | 구현 내용 |
| --- | --- |
| 기사 입력 | 공개 기사 URL에서 제목·본문·이미지 추출, 본문 직접 붙여넣기 |
| AI 생성 | 카드 문구·게시물용 해시태그를 한 번의 요청으로 생성 |
| 카드뉴스 | Hook → Body 1 → Body 2 → Expression → CTA, 총 5장 |
| 카드 디자인 | 더 보기에서 에디토리얼, 콘트라스트, 브리프 스타일 변경 |
| 카드 크기 | 인스타 카드뉴스 1080×1350 (4:5) |
| 문구 편집 | 제목·본문·영어 표현·해설·CTA·해시태그 수정, 글자 수 표시 |
| 제목 스타일 | 윗줄·아랫줄 색상, 크기, 배경 강조 설정 |
| 이미지 | 직접 업로드·드래그 앤 드롭·URL 가져오기·내장 사진 3종·제거 |
| 이미지 배치 | 좌우 위치 조정, CTA 왼쪽·중앙·오른쪽 정렬 |
| 배경 | 화이트·다크·크림 팔레트 |
| 내보내기 | 카드별 PNG, 카드와 `caption.txt`를 묶은 ZIP |
| Figma | 계정 사전 연결 → 웹앱의 **더 보기 → Figma로 보내기** → 열린 플러그인에 편집 가능한 프레임 자동 생성 |
| 작업 유지 | 같은 브라우저·출처의 localStorage에 현재 작업 자동 저장 |
| 사용성 | 한 장씩 선택해 편집, 변경 즉시 반영, 확대 미리보기, 생성 진행·오류·취소 |
| 설정 | 하나의 설정창에서 GPT API 키와 Figma 연결 관리 |

ZIP에는 카드 5장과 게시물용 `caption.txt`가 포함됩니다. 디자인을 바꾸면 같은 콘텐츠에 새 스타일을 적용합니다. 디자인별로 독립된 작업 기록을 보관하지는 않습니다.

## 사용 순서

1. 상단 **설정**에서 GPT API 키를 등록합니다. 같은 창의 Figma 항목에서 연결도 관리합니다.
2. 기사 URL 또는 본문을 입력하고 **카드뉴스 만들기**를 누릅니다. `Ctrl+Enter` / `⌘+Enter`도 사용할 수 있습니다. 키 없이 **샘플 보기**나 **직접 작성**으로 시작할 수도 있습니다.
3. 생성된 카드 5장 중 편집할 카드를 선택하고 문구와 사진을 바꿉니다. 변경사항은 바로 반영됩니다.
4. 필요하면 카드 아래의 세부 조정이나 **더 보기**에서 글자 스타일·사진 위치·디자인·배경색을 바꿉니다.
5. **전체 다운로드**로 카드 PNG 5장과 캡션을 ZIP으로 저장합니다. 개별 카드 다운로드와 **더 보기 → Figma로 보내기**도 지원합니다.

새 콘텐츠 생성과 샘플 불러오기는 현재 카드 내용과 이미지 설정을 교체합니다. 보관할 작업은 먼저 다운로드하세요. 생성 취소는 브라우저의 대기를 중단하며, 이미 전달된 서버·모델 요청의 처리나 비용까지 취소한다고 보장하지 않습니다.

## Figma에서 제작

기존 PNG·ZIP 저장과 함께 **더 보기 → Figma로 보내기**을 사용할 수 있습니다. 일반 Figma 플러그인 방식이며 MCP나 Figma 개인 API 토큰을 사용하지 않습니다. 결과 파일을 다운로드하거나 선택할 필요가 없습니다.

처음 한 번:

1. 웹앱의 **설정 → Figma → 플러그인 설치 및 전송 설정 → 플러그인 다운로드**로 받은 ZIP을 풉니다. 현재 웹앱 주소가 자동으로 설정됩니다.
2. Figma 데스크톱의 **Plugins → Development → Import plugin from manifest…**에서 `manifest.json`을 등록합니다.
3. 받을 Design 파일에서 **뉴띵 카드뉴스 자동화** 플러그인을 실행합니다. 로그인 계정과 연결 코드가 표시됩니다.
4. 웹앱에 10자리 코드를 입력하면 해당 Figma 계정 연결이 저장됩니다. 코드는 5분 동안 유효합니다.

그다음부터는 웹앱에서 결과를 생성·편집한 뒤 **더 보기 → Figma로 보내기**을 누릅니다. 받을 파일에서 플러그인을 열어 두면 현재 페이지에 카드가 추가됩니다. 연결 설정에 수신 파일·페이지를 표시하고 웹앱에서도 전송·제작 완료를 확인할 수 있습니다. 플러그인을 닫은 상태에서는 수신 파일을 열도록 안내합니다.

카드뉴스는 1080×1350 프레임 5개입니다. 문구는 텍스트, 사진은 크롭을 수정할 수 있는 이미지 채우기, 강조와 그라데이션은 별도 레이어입니다. 가로·세로·3열 배치를 선택할 수 있으며 기존 Figma 요소는 덮어쓰지 않습니다.

Figma 계정 연결은 플러그인의 `currentUser`와 일회용 코드로 웹앱·플러그인을 짝짓는 방식입니다. Figma OAuth 로그인이나 웹앱 사용자 인증은 아닙니다. 브라우저와 Figma 플러그인 각각에 전송용 자격 증명을 저장하며, 미사용 연결은 30일 후 만료됩니다. 다른 브라우저에서는 다시 연결해야 합니다.

로컬 서버는 SQLite에 연결·전송 상태를 보관합니다. 무료 Cloudflare 배포에서는 `FIGMA_DB` D1 바인딩을 사용합니다. 사진·문구는 전송용으로 임시 보관하며 10분 후 읽기가 만료되고 완료 시 삭제합니다. 만료된 D1 데이터는 시간당 정리 작업으로 제거합니다. GPT 키는 전송 데이터에 포함하지 않습니다.

Pretendard가 없으면 사용 가능한 대체 폰트를 안내합니다. 폰트 메트릭 차이로 글자 배치가 조금 달라질 수 있습니다. Figma 수정 사항의 웹앱 역동기화는 지원하지 않습니다.

설치·운영 안내는 [figma-plugin/README.md](figma-plugin/README.md)에 있습니다. 플러그인은 Community에 게시하지 않았으며, 최초 개발 플러그인 등록은 필요합니다.

## GPT 연결과 환경 변수

### 개인 키 입력

앱의 **GPT 연결**에서 프로젝트 API 키와 모델을 선택합니다. **이 브라우저에 API 키 저장**을 선택하면 같은 브라우저에서 새로고침·다음 방문에도 키를 유지합니다. 체크를 해제하면 이번 탭의 메모리에서만 사용합니다. 저장 키는 브라우저 localStorage에 평문으로 보관하므로 공유 기기에서는 저장을 해제하세요. **연결 해제**로 저장 키를 삭제할 수 있으며 서버 파일에는 기록하지 않습니다.

실제 생성 시 키는 같은 출처의 `/api/generate` 서버로 전달되고, 서버가 OpenAI 요청의 인증 헤더로 사용합니다. 개인 키가 있으면 서버 환경 변수의 키보다 우선합니다. **설정 적용**은 입력을 반영하는 단계이며, 키의 권한·잔액·모델 접근 가능 여부는 실제 생성 요청에서 확인합니다.

### 서버 키 설정

```sh
cp .env.example .env.local
```

`.env.local`을 편집합니다. 실제 키를 Git에 커밋하지 않습니다.

```dotenv
OPENAI_API_KEY=여기에_개인_API_키_입력
OPENAI_MODEL=gpt-5.4-mini
FOLIO_PORT=4177
```

| 변수 | 기본값 | 역할 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 미설정 | 서버에서 사용할 공용 키. 없어도 샘플·수동 편집 가능 |
| `OPENAI_MODEL` | `gpt-5.4-mini` | 요청에 유효한 모델이 없을 때 적용하는 서버 기본값 |
| `FOLIO_PORT` | `4177` | 로컬 개발 서버 포트 |
| `FIGMA_DB` | D1 바인딩 | Cloudflare가 주입하는 무료 전송 DB. 문자열 환경 변수가 아님 |

현재 코드의 모델 허용 목록은 `gpt-5.4-mini`, `gpt-5.4`입니다. 브라우저는 선택된 모델을 매 요청에 보내므로 서버 기본값보다 그 선택이 우선합니다. 모델을 추가할 때는 `worker/server.mjs`의 허용 목록과 `web/index.html`의 선택 항목을 함께 수정해야 합니다. 실제 이용 가능 여부는 연결된 API 계정에서 확인해야 합니다.

`.env.local`은 `npm run dev` / `npm start`가 읽습니다. 값을 바꾼 뒤에는 개발 서버를 재시작합니다. Cloudflare 무료 배포에서는 서버 공용 키를 설정하지 않고 각 사용자의 키를 사용합니다.

### Figma 전송 저장소

로컬 개발은 추가 서비스 없이 `.data/figma-relay.sqlite`를 사용합니다. Node 24의 내장 SQLite를 사용하므로 실험적 API 경고가 나타날 수 있습니다. `.data/`는 Git에서 제외되며 서버 재시작 뒤에도 연결이 유지됩니다.

Cloudflare 배포에서는 `wrangler.jsonc`의 `FIGMA_DB`에 D1을 연결하고 `migrations/`를 적용합니다. 모든 Worker 인스턴스가 같은 DB를 사용합니다. 저장소 한도 오류는 사용자가 이해할 수 있는 메시지로 반환하며 유료 저장소로 우회하지 않습니다. 플러그인의 대기 확인은 10초, 웹앱은 대기 중 30초·제작 중 3초입니다. 숨겨진 웹앱 탭은 확인을 쉬고, 수신 실패 시 최대 5분까지 간격을 늘립니다.

## 구현 구조

```text
브라우저: web/index.html + styles.css + app.js
  ├─ 기사 URL / 본문 → POST /api/generate
  │                     ├─ URL이면 기사 HTML 수집·본문 추출
  │                     ├─ OpenAI Responses API → 구조화된 JSON
  │                     └─ 결과 필드 검증 → 콘텐츠·출처·사용량 반환
  ├─ 사진 URL → GET /api/image → 같은 출처의 이미지 응답
  ├─ 편집 상태 → localStorage
  ├─ Canvas 2D → PNG / 브라우저에서 ZIP 작성
  └─ 동일 렌더러의 레이어 기록 → POST /api/figma → 임시 전송 저장소
                                                └─ Figma 플러그인 → 편집 가능한 프레임

서버의 공통 구현: worker/server.mjs
  ├─ Cloudflare Free: 정적 자산 + /api/* Worker + FIGMA_DB D1
  ├─ 로컬 / Sites: 빌드된 worker/index.js가 정적 자산까지 제공
  └─ Vercel: api/*.js가 공통 핸들러 호출, 정적 자산은 dist-vercel/
```

- **프론트엔드:** 프레임워크 없이 HTML·CSS·JavaScript로 구현했습니다. URL 변경은 History API를 사용합니다.
- **이미지 렌더링:** 브라우저 Canvas 2D가 사진, 텍스트, 줄바꿈, 강조, 로고 도형을 그립니다. PNG 저장도 같은 Canvas를 사용합니다.
- **ZIP:** PNG와 캡션을 ZIP STORE 형식으로 묶습니다. 외부 압축 라이브러리를 사용하지 않습니다.
- **Figma:** 같은 카드 그리기 함수가 `web/figma-export.js`의 기록용 컨텍스트로 배치·문단·사진 크롭 정보를 출력합니다. `web/figma-client.js`가 전송하고, 플러그인 UI가 스튜디오의 수신 화면을 열어 결과를 받습니다. `figma-plugin/code.js`가 데이터 검증·폰트 로딩 후 네이티브 레이어로 만듭니다. 다운로드한 플러그인은 해당 스튜디오 출처에만 연결합니다.
- **기사 파서:** `articleBody`, 알려진 본문 ID·클래스, `article`, `main` 순서로 후보를 찾고 우선순위와 본문 길이로 선택합니다. 로그인이나 JavaScript 실행이 필요한 기사는 본문을 직접 입력해야 할 수 있습니다.
- **모델 응답:** Responses API에 `store: false`, strict JSON Schema, 출력 한도 4,200 tokens를 지정합니다. 수신 결과의 필수 필드·문자열 길이·해시태그 형식도 서버에서 검증합니다.
- **서버 저장:** Figma 연결·전송 큐는 로컬 SQLite 또는 무료 Cloudflare D1에 보관합니다. 생성 콘텐츠의 장기 작업 이력은 보관하지 않습니다. 브라우저가 기사를 서버로 보내고 서버는 필요한 데이터를 모델 공급자에게 전달합니다. `store: false` 설정이 모든 플랫폼 로그나 공급자 보관 정책을 대신하는 것은 아닙니다.

## 파일 안내

```text
프로젝트 폴더/
├── README.md                     # 프로젝트 설명·실행·API·운영 안내
├── docs/
│   ├── verification.md           # 검증 범위와 재현 절차
│   └── images/studio-sample.png  # 로컬 샘플 화면
├── web/
│   ├── index.html                # 페이지·설정·이미지·미리보기 대화상자
│   ├── styles.css                # 레이아웃·반응형·편집기 스타일
│   ├── app.js                    # 상태·화면·Canvas·다운로드·API 호출
│   ├── figma-export.js           # 카드 렌더링을 편집 가능한 장면으로 기록
│   ├── figma-client.js           # 계정 연결·분할 전송·무결성 검사
│   ├── figma-receiver.*          # 플러그인에서 여는 전송 수신 화면
│   ├── figma-package.js          # 현재 스튜디오 주소를 플러그인에 설정
│   └── assets/                   # 사진 3종·Pretendard 폰트·폰트 라이선스
├── figma-plugin/                 # 설치용 manifest, 플러그인 JS·UI, 사용 안내
├── worker/
│   ├── server.mjs                # 기사 추출·모델 호출·API·Worker 핸들러
│   ├── figma-relay.mjs           # 코드 연결·전송 큐·D1 어댑터
│   └── cloudflare.mjs            # 무료 정적 자산·API·만료 정리 진입점
├── api/
│   ├── config.js                 # Vercel 설정 조회 어댑터
│   ├── article.js                # Vercel 기사 추출 어댑터
│   ├── generate.js               # Vercel 콘텐츠 생성 어댑터
│   ├── image.js                  # Vercel 이미지 프록시 어댑터
│   └── figma.js                  # Vercel Figma 전송 어댑터
├── scripts/
│   ├── compile.mjs               # 서버와 정적 자산을 worker/index.js로 묶음
│   ├── build.sh                  # Sites용 dist/ 구성
│   ├── build-static.mjs          # 공통 정적 자산 구성
│   ├── build-cloudflare.mjs      # 무료 정적 배포·라우팅·응답 헤더
│   ├── build-vercel.mjs          # 기존 Vercel 정적 파일 복사
│   ├── dev-server.mjs            # Node HTTP ↔ Fetch API 로컬 어댑터
│   ├── figma-local-store.mjs     # 개발용 SQLite 전송 저장소
│   └── validate-artifact.mjs     # 빌드 산출물의 ESM·fetch export 검증
├── tests/                       # API 회귀 테스트, Figma 파일·레이어 변환 테스트
├── .openai/hosting.json          # Sites 프로젝트 바인딩·리소스 선언
├── wrangler.jsonc               # Cloudflare 무료 배포·D1 바인딩
├── migrations/                  # D1 전송 DB 스키마
├── .env.example                  # 비밀 값 없는 환경 변수 예시
├── .gitignore                    # 비밀 값·생성 파일·개인 도구 상태 제외
├── .vercelignore                 # Vercel 업로드 제외 항목
├── vercel.json                   # 빌드·함수·라우팅·응답 헤더
└── package.json                  # 명령·Node 버전 요구사항
```

`worker/index.js`, `dist/`, `dist-vercel/`, `dist-cloudflare/`, `.wrangler/`, `site.tar.gz`는 생성 파일이므로 최신 소스 트리에서 추적하지 않습니다. 기존 커밋 이력은 보존합니다. 소스는 `web/`와 `worker/server.mjs`에서 수정하고 빌드로 재생성합니다. `.openai/hosting.json`에는 기존 Sites 프로젝트 ID가 들어 있으므로 다른 Sites 프로젝트에 배포할 때는 그 프로젝트의 설정으로 교체합니다.

## 명령 모음

| 명령 | 역할 |
| --- | --- |
| `npm run build` | 정적 자산을 포함한 Worker와 Sites용 `dist/` 생성 |
| `npm run dev` | 로컬 서버 시작. 먼저 Worker 빌드 필요 |
| `npm start` | `npm run dev`와 같은 로컬 서버 실행 |
| `npm test` | API·파서 테스트 실행. 외부 유료 API 호출 없음 |
| `npm run validate` | `dist/server/index.js`와 호스팅 manifest 검증. 먼저 빌드 필요 |
| `npm run build:cloudflare` | 무료 Cloudflare 정적 자산·라우팅·응답 헤더 구성 |
| `npm run db:local` | 로컬 D1 스키마 적용 |
| `npm run dev:cloudflare` | Cloudflare 런타임을 로컬 4199 포트에서 실행 |
| `npm run test:cloudflare` | 실행 중인 로컬 Cloudflare의 계정 연결·분할 전송 통합 검증 |
| `npm run build:vercel` | `dist-vercel/`에 정적 파일 생성 |

## API 참고

API의 공통 구현은 `createHandler()`입니다. 생성·기사 요청은 `application/json`을 사용하며, 오류는 주로 `{ "error": "사용자 안내", "code": "오류 코드" }` 형태로 반환합니다. 모든 오류에 구체적인 전용 코드가 있는 것은 아닙니다.

| 메서드·경로 | 입력 | 응답 |
| --- | --- | --- |
| `GET /api/config` | 없음 | `{ configured, model }`. 실제 키를 반환하지 않음 |
| `POST /api/article` | `{ url }` | `{ title, text, url, images, description }` |
| `POST /api/generate` | `{ input, apiKey?, model?, channel? }` | `{ content, usage, article, model }` |
| `GET /api/image?url=...` | 공개 이미지 URL | 허용된 이미지의 바이너리 응답 |
| `POST /api/figma` | `{ action, ... }`, 연결 후 Bearer 인증 | 계정 연결·전송 상태·분할 데이터 |

Figma 전송 API는 `create`·`pair` 후 발신자/수신자 권한을 구분합니다. 발신자는 `status`·`begin`·`chunk`·`commit`·`cancel`, 수신자는 `poll`·`read`·`complete`, 양쪽은 `disconnect`를 사용합니다. 익명 연결 요청은 IP별 분당 20회로 제한합니다. 요청 본문은 900,000 bytes, 전송은 200,000자 조각 최대 240개이며 연결당 작업 하나만 처리합니다.

`channel`은 `editorial`, `contrast`, `brief` 중 하나입니다. `/api/generate`는 채널과 관계없이 모든 콘텐츠 필드를 생성합니다. `article.description`은 URL 추출 결과에 포함되며, 본문 직접 입력 결과에는 없습니다. `usage`는 공급자가 사용량을 반환하지 않으면 `null`입니다.

| 생성 콘텐츠 필드 | 용도 |
| --- | --- |
| `title` | 기사·콘텐츠 제목 |
| `hook` | 표지 카드의 헤드라인 |
| `body1`, `body2` | 핵심 사실, 배경·의미 |
| `phrase`, `meaning` | 영어 표현과 한국어 해설 |
| `cta` | 마지막 카드의 마무리 문구 |
| `hashtags` | 문자열 3개. 서버가 `#`와 공백을 정리 |

서버 키를 설정한 로컬 환경에서 생성 요청을 직접 확인하는 예시입니다. 이 요청은 실제 모델 호출을 발생시킵니다.

```sh
curl http://localhost:4177/api/generate \
  -H 'Content-Type: application/json' \
  --data '{"input":"제목과 함께 확인할 수 있는 기사 본문을 30자 이상 입력합니다.","model":"gpt-5.4-mini","channel":"brief"}'
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

- `folio-studio-v1`이라는 localStorage 키에 콘텐츠, 기사 정보, 카드 설정, 입력문, 모델 선택을 저장합니다.
- 변경 후 약 300ms에 저장합니다. 업로드한 사진은 축소된 data URL 형태로 포함될 수 있습니다.
- 개인 API 키는 작업 상태와 분리된 `folio-openai-key-v1`에 선택적으로 보관합니다. Figma 연결은 `folio-figma-connection-v1`에 보관합니다. API 키는 카드·사진 전송에 포함하지 않으며 설정 창을 닫으면 입력 요소를 비웁니다.
- 서버 공용 키는 환경 변수에서 읽습니다. 설정 조회는 키의 존재 여부만 반환합니다.
- 브라우저 데이터를 삭제하거나 다른 브라우저·다른 도메인을 사용하면 이전 작업이 자동으로 이어지지 않습니다.
- 저장 공간이 부족하면 화면에 안내합니다. 현재 작업의 확실한 보관은 다운로드로 처리합니다.

## Cloudflare 무료 배포

운영자는 **Workers Free** 계정을 사용해야 합니다. 구독 업그레이드나 카드 등록이 필요한 유료 기능은 사용하지 않습니다. 아래 과정은 서비스 운영자의 최초 배포 절차이며 일반 이용자에게 요구하는 작업이 아닙니다.

```sh
npm ci
npm run build:cloudflare
npx wrangler login
npx wrangler d1 create folio-figma
```

생성 결과의 실제 `database_id`를 `wrangler.jsonc`의 `d1_databases[0]`에 넣습니다. 이미 같은 DB가 있으면 새로 만들지 말고 기존 ID를 사용합니다. 그다음:

```sh
npx wrangler d1 migrations apply FIGMA_DB --remote
npm run deploy:cloudflare
```

배포 명령은 최신 정적 파일을 먼저 빌드합니다. 결과의 무료 `workers.dev` URL을 사용하면 도메인 비용도 없습니다. 사이트의 플러그인 ZIP에는 그 주소가 자동 설정됩니다. 원격 배포는 로그인·DB 연결 후 수행하며 이 저장소에 계정 토큰을 넣지 않습니다.

로컬에서 동일한 Cloudflare 런타임을 먼저 검증할 수 있습니다.

```sh
npm ci
npm run build:cloudflare
npm run db:local
npm run dev:cloudflare
```

브라우저에서 <http://localhost:4199/generate>를 열고, 별도 터미널에서 `npm run test:cloudflare`를 실행합니다. 로컬 D1에만 테스트 연결을 만들고 종료 시 제거합니다. 실제 GPT 호출은 하지 않습니다.

Vercel 빌드는 호환용으로 남아 있습니다. Figma 자동 전송은 D1 또는 Node 개발 서버의 SQLite가 필요하며, Vercel 전용 Redis 연결은 제거했습니다.

## Sites 배포

기존 Sites 주소에서도 이 앱을 배포할 수 있습니다. `npm run build`가 정적 자산을 포함한 Worker를 `dist/server/index.js`에 생성합니다. `.openai/hosting.json`의 `FIGMA_DB` 바인딩과 `drizzle/`의 스키마 마이그레이션으로 Figma 연결·전송 저장소를 구성합니다. Sites의 배포 도구가 DB를 연결하고 마이그레이션을 적용합니다.

Sites에서는 Figma API 요청 중 만료된 행을 최대 1,000개씩 백그라운드에서 정리합니다. 만료된 데이터는 정리 전에도 읽을 수 없습니다. 사이트의 접근 권한은 호스팅 설정을 따르며, 비공개 사이트의 Figma 플러그인 사용에는 수신 화면에서도 접근 인증이 필요할 수 있습니다.

GitHub에는 소스와 값이 비어 있는 `.env.example`만 올립니다. 실제 API 키는 무시되는 `.env.local` 또는 앱의 설정창에 입력합니다. `.env*`(예제 제외), Wrangler의 `.dev.vars*`, 로컬 DB, 플랫폼 인증 상태와 빌드 결과물은 Git에서 제외합니다. 공개 저장소로 바꾸어도 호스팅 사이트의 접근 권한은 별도로 유지됩니다.

## 검증

```sh
npm test
npm run build
npm run validate
npm run build:cloudflare
```

API 테스트는 `node:test`와 주입 가능한 모의 `fetch`를 사용합니다. 기사 본문 선택, 잘못된 URL과 리다이렉트, 응답 크기, 키 우선순위, 모델 요청 형식, 응답 검증, 인증·권한·잔액·속도 오류, 이미지 형식·크기를 검증합니다.

실제 모델 호출 성공, 모든 뉴스 사이트의 추출 성공, 브라우저별 렌더링과 원격 배포 상태까지 이 테스트가 보장하지는 않습니다. [최근 검증 기록과 수동 점검 순서](docs/verification.md)를 참고하세요.

## 현재 제한과 운영 조건

1. **생성 API의 계정·접근 통제·요청 제한 없음:** Origin 검사는 일부 다른 출처의 브라우저 요청을 차단하지만 사용자 인증을 대신하지 않습니다. 서버 공용 키를 설정하면 API에 접근한 사람이 그 키로 요청을 발생시킬 수 있습니다. 외부 사용자에게 운영할 때는 인증·사용량 제한·예산 관리를 별도로 마련해야 합니다.
2. **URL 필터의 범위:** 사설 IP 문자열, localhost류 이름, 자격 증명 포함 주소, 지원하지 않는 포트를 차단하고 리다이렉트마다 재검사합니다. DNS 해석 결과를 검증하거나 연결 IP를 고정하지 않으므로 완전한 SSRF 방어를 보장하지 않습니다.
3. **기사 추출 범위:** 정적 HTML 분석입니다. 유료벽, 로그인, 수집 차단, JavaScript로만 제공되는 본문은 직접 입력이 필요할 수 있습니다.
4. **작업 관리:** 브라우저에 현재 작업 하나를 보관합니다. 서버 이력·다중 프로젝트·협업·버전 복구·프로젝트 파일 재가져오기는 없습니다.
5. **편집 범위:** 템플릿 기반 Canvas 편집기입니다. 임의 레이어 추가, 자유 배치, 리치텍스트의 임의 구간 선택 스타일은 없습니다. 제목 스타일은 윗줄·아랫줄 단위입니다.
6. **생성 결과:** JSON 형식 검증은 사실 검증과 다릅니다. 모델 결과의 숫자·이름·해석·출처를 사람이 확인해야 합니다. 추가 웹 검색이나 자동 교차 검증은 수행하지 않습니다.
7. **생성 취소·재시도:** GPT 생성 요청은 서버 취소 전파·자동 재시도·중복 방지를 구현하지 않았습니다. Figma 전송은 별도 큐·완료 기록을 사용하며, 플러그인이 제작 중 종료되면 중복 방지를 위해 캔버스 확인 후 다시 전송하도록 안내합니다.

## 사진·폰트 자산

| 자산 | 출처·고지 |
| --- | --- |
| `web/assets/city.jpg` | [Unsplash 도시 이미지](https://images.unsplash.com/photo-1486406146926-c627a92ad1ab) |
| `web/assets/markets.jpg` | [Unsplash 금융 차트](https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3) |
| `web/assets/desk.jpg` | [Unsplash 업무 이미지](https://images.unsplash.com/photo-1454165804606-c3d57bc86b40) |
| `web/assets/pretendard.woff2` | Pretendard, [SIL Open Font License 1.1](web/assets/font-license.txt) |

사진과 폰트의 출처·라이선스를 유지합니다. 프로젝트 코드 전체를 대상으로 한 별도 오픈소스 라이선스는 지정하지 않았습니다.
