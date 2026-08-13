# 3PICKS 홈페이지 운영 README

GitHub Pages로 고객 홈페이지를 운영하고, 관리자는 이 폴더의 로컬 콘솔로 상품과 추천 설정을 바꿉니다. 별도 서버나 데이터베이스는 사용하지 않습니다.

## 처음 할 일

1. 고객 화면 미리보기

   ```bash
   python3 -m http.server 4173 --bind 127.0.0.1
   ```

   브라우저에서 `http://127.0.0.1:4173/`을 엽니다.

2. 운영 콘솔

   `operations/admin.html`을 이 컴퓨터에서 엽니다. 이 파일과 GitHub 토큰은 고객 사이트에 올리지 않습니다.

3. 전체 점검

   ```bash
   bash tools/check_all.sh
   ```

   모바일은 320·360·375·390·430px에서 확인합니다. 600px 이하의 상단 메뉴는 첫 화면의 브랜드·내비·CTA를 그대로 보여 준 뒤 본문과 함께 스크롤되며, 상품 레일 외의 페이지 가로 스크롤은 허용하지 않습니다.

4. 공식 전달본 만들기

   ```bash
   PULL_URL=https://works.choi.build/3picks/ ../build-official-bundle.sh
   ```

   공식 사이트가 아직 열리지 않았다면 위처럼 스테이징의 운영 상태를 먼저 가져옵니다. 만들어진 ZIP은 고객 파일만 담고, 운영 콘솔·내부 문서·공급처 정보는 제외합니다.

## 폴더 구조

```text
3picks homepage/
├── index.html                 고객 홈페이지
├── app.js                     화면·설문·견적·분석 이벤트
├── config.js                  연락처·카카오톡 주소
├── recommendation-core.js     고객/어드민 공용 추천·상품 병합 규칙
├── site-overrides.js          어드민이 저장하는 운영 변경분
├── assets/                    고객용 이미지와 브라우저 상품 데이터
│   ├── products/              상품 이미지
│   └── archive/               현재 쓰지 않는 과거 이미지
├── data/                      공급처를 포함한 내부 상품 검수 데이터
├── operations/                로컬 전용 어드민과 운영 문서
├── docs/                      개발·QA·추천 로직 참고 문서
├── tools/                     생성·회수·자동 검사 도구
└── .github/workflows/         GitHub Pages 상태 확인
```

### 문서 구분

- `operations/SETUP-GUIDE.html`: 처음 GitHub Pages를 연결하는 설치 안내
- `operations/PRODUCTION-READINESS.html`: 출시 전 80개 운영 점검표. 어드민과 연결되지 않은 별도 문서
- `docs/IMPLEMENTATION.md`: 화면과 구현 판단 기록
- `docs/QA.md`: 화면 검수 기준
- `docs/RECOMMENDATION-AUDIT.md`: 추천 로직 감사 기록

## 평소 운영 순서

1. `operations/admin.html`을 로컬에서 엽니다.
2. GitHub 저장소 정보와 짧게 만료되는 토큰을 입력하고 `연결 확인`을 누릅니다.
3. 상품·추천 설정을 바꾼 뒤 미리보기와 변경 내역을 확인합니다.
4. `홈페이지에 반영하기`를 누릅니다.
5. 1~10분 뒤 고객 사이트를 새 창에서 열어 변경 결과를 확인합니다.
6. 문제가 있으면 `직전 설정 불러오기`로 이전 설정을 초안에 불러온 뒤 다시 반영합니다.

토큰은 현재 브라우저 탭에서만 보관합니다. 브라우저를 닫으면 다시 입력해야 합니다. 운영 콘솔은 연결 확인을 마친 저장소 정보가 바뀌면 저장을 멈추고 재확인을 요구합니다. 사진 업로드가 중간에 실패하면 성공한 사진은 건너뛰고 남은 사진부터 이어갑니다.

## 상품 데이터 원칙

- 내부 원본은 110개이며 `data/products-internal.json`에 공급처를 포함해 보관합니다.
- 고객 화면은 각 카테고리의 1~10위, 총 100개를 운영 대상으로 사용합니다.
- `assets/products-data.js`는 브라우저 실행용입니다.
- 공식 ZIP을 만들 때 공급처 필드는 고객 데이터와 운영 변경분에서 자동 제거됩니다.
- 상품마스터가 바뀌면 `python3 tools/build_catalog.py`로 데이터와 560×560 WebP 이미지를 다시 만듭니다.
- 어드민 변경은 원본을 덮지 않고 `site-overrides.js`에만 쌓입니다. 삭제 대신 `숨김` 또는 `보관`을 사용합니다.

## 홈페이지와 어드민의 짝 규칙

홈페이지의 행사 매핑·추천 태그·자동 순위·상품 덮어쓰기 필드를 바꾸면 `operations/admin.html`의 설명과 입력도 함께 확인해야 합니다. 공용 규칙은 `recommendation-core.js` 한 곳만 사용합니다.

검증은 다음 두 실행으로 닫습니다.

```bash
node tools/test_admin_pairing.js
node tools/test_admin_operations.js
```

## 배포와 복구

- 고객 배포물은 반드시 `../build-official-bundle.sh`로 만듭니다. 홈페이지 원본 폴더 전체를 GitHub에 끌어놓지 않습니다.
- 빌드는 먼저 허용된 3PICKS 주소에서 운영 설정과 신규 사진을 검증해 가져온 뒤 ZIP을 만듭니다.
- 결과 ZIP은 시각이 포함된 이름으로 새로 생성되며 기존 전달본을 덮어쓰지 않습니다.
- GitHub 커밋 이력이 직전 버전 복구점입니다. 어드민도 반영 직전 설정 한 개를 현재 브라우저에 보관합니다.
- `.github/workflows/site-health.yml`은 공식 홈페이지와 핵심 데이터 파일을 30분마다 확인합니다. 실패 알림은 GitHub 계정의 Actions 알림 설정을 따릅니다.

## 아직 사람이 확인할 값

- `config.js`: 카카오톡 상담 주소, 전화번호, 이메일
- `index.html`: 사업자등록번호, 통신판매업 신고번호의 임시값
- GitHub Pages: 공식 도메인 연결과 HTTPS 적용
- GA4: Production Property와 DebugView에서 실제 이벤트 유입
- 출시 당일: 모바일 Safari와 Chrome 실기기 점검
