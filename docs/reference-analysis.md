# 참고 웹앱 분석과 REA 사용 판단

이 문서는 2026-10-16에 확인한 외부 웹앱과 REA 저장소의 분석을 기록합니다. 현재 AX Contents Studio의 구현 설명은 [README](../README.md)를 기준으로 합니다. 외부 서비스가 이후 변경되었을 수 있으며, 아래 내용은 당시 관측 범위에 한정됩니다.

## 분석 대상과 방법

- 웹앱: <https://d5p63uohqc773.cloudfront.net/generate?source=sedaily&design=won-money>
- REA: <https://github.com/morluto/rea>
- REA 분석 스냅샷: `42fc6c53ae188978deb3bedfe88287b6b316ba22`
- 당시 확인한 공개 릴리스: `rea-agents-6.5.0`

웹앱의 초기 화면과 이미지 변경 메뉴를 브라우저에서 확인하고, 공개 HTML·JavaScript 번들을 읽었습니다. Generate 및 서버 이미지 렌더링 요청은 실행하지 않았습니다. 원본 서버 코드, 실제 모델 설정, 전체 프롬프트 및 생성 품질은 검증하지 않았습니다.

## 원본 웹앱에서 확인한 내용

| 항목 | 관측 |
| --- | --- |
| 프론트엔드 | Next.js 자산 경로와 React 렌더링 코드 |
| 입력 | 기사 URL 또는 본문 직접 입력 |
| 카드뉴스 | 인트로, 속지 3장, 아웃트로로 구성된 WON MONEY 화면 |
| 편집 | 제목·본문, 부분 색상·배경색, 글자 크기, 사진 위치와 정렬 |
| 이미지 선택 | 이미지 URL 입력 및 파일 업로드 UI |
| 콘텐츠 생성 | 공개 번들에서 `/api/generate`에 `url`, `mode`, `design`, `oneMode` 전송 |
| 카드 출력 | 공개 번들에서 `/api/render` 호출 후 이미지 응답 처리 |
| 추가 모드 | 블로그·리서치·YouTube 메뉴 및 TTS 관련 코드 |
| 모델 표시 | 화면에 `Claude Bedrock` 표시. 서버의 실제 공급자 호출은 미확인 |
| 프롬프트 | 일부 모드별 `systemPrompt` 문자열이 공개 번들에 존재 |

공개 프롬프트 문자열의 존재가 서버에서 그 문자열을 그대로 사용한다는 증거는 아닙니다. 또한 호출 경로를 읽은 것과 실제 생성 성공을 확인한 것은 구분해야 합니다.

관측한 번들:

- [페이지 번들](https://d5p63uohqc773.cloudfront.net/_next/static/chunks/app/generate/page-e836e5f7de36637b.js)
- [공유 템플릿 번들](https://d5p63uohqc773.cloudfront.net/_next/static/chunks/875-f9135ec6167eb71f.js)

번들 파일명은 배포마다 바뀔 수 있습니다. 원본 번들이나 스크린샷은 이 저장소에 복제하지 않았습니다.

## 이 저장소와의 차이

| 구분 | 참고 웹앱의 관측 | AX Contents Studio의 구현 |
| --- | --- | --- |
| UI 기술 | Next.js·React | HTML·CSS·순수 JavaScript |
| 생성 모델 | Claude Bedrock이라는 화면 표시 | OpenAI Responses API 호출 코드 |
| 카드 이미지 | `/api/render`에 렌더링 요청 | 브라우저 Canvas 2D에서 렌더링·저장 |
| 5장 구성 | 인트로·속지 3·아웃트로 | Hook·본문 2·영어 표현·CTA |
| 제목 스타일 | 부분 선택 색상 UI | 윗줄·아랫줄 색·크기·강조 |
| TTS | 관련 UI/코드 확인 | 구현하지 않음 |
| HEIC | 업로드 UI에 표시 | 지원하지 않음 |
| 작업 저장 | 이번 조사에서 확인하지 않음 | localStorage에 현재 작업 저장 |
| 원본 서버 복원 | 서버 소스 확인하지 않음 | 별도로 작성한 파서·생성 API 사용 |

## REA의 역할

REA는 에이전트가 리버스 엔지니어링 도구를 공통 CLI·MCP 인터페이스로 사용하도록 연결하는 프로젝트입니다. 네이티브 분석은 Ghidra·Hopper·IDA 등의 제공자를 이용하고, JavaScript·Electron·브라우저 분석도 제공합니다.

핵심 구조는 분석 결과를 Evidence로 기록하는 것입니다. 대상 파일의 해시, 제공자·분석 프로필, 관측·파생·추론 구분, 위치 정보, 한계와 미확인 관계를 보관합니다. CLI와 MCP가 공통 분석 워크플로를 사용합니다.

관련 소스와 문서:

- [아키텍처](https://github.com/morluto/rea/blob/42fc6c53ae188978deb3bedfe88287b6b316ba22/docs/architecture.mermaid)
- [Evidence 정의](https://github.com/morluto/rea/blob/42fc6c53ae188978deb3bedfe88287b6b316ba22/src/domain/evidence.ts)
- [브라우저 관측 범위](https://github.com/morluto/rea/blob/42fc6c53ae188978deb3bedfe88287b6b316ba22/docs/browser-observation.md)

## 이 프로젝트에 REA가 필요한가

초기 분석에서는 도입 필요성이 낮다고 판단했습니다. 화면, 공개 JavaScript, API 호출 코드를 일반 브라우저와 코드 검색으로 파악할 수 있었기 때문입니다. 현재 프로젝트는 전체 소스도 있으므로 일반적인 코드 읽기·테스트·브라우저 검증이 우선입니다.

앞으로 난독화된 번들의 복잡한 실행 경로, WebAssembly, 네이티브 모듈, Electron 프로세스 경계를 추적해야 할 때는 REA의 추가 가치가 생길 수 있습니다. 웹앱의 화면 수나 기능 수만으로 도입을 결정할 필요는 없습니다.

브라우저가 받지 않는 서버 소스나 비공개 모델 설정은 REA를 연결하는 것만으로 복원되지 않습니다. 이 프로젝트에서 정밀한 카드 출력에 필요한 작업은 한글 줄바꿈·폰트·이미지 배치·Canvas 렌더링과 사용자 흐름의 구현 및 검증입니다.
