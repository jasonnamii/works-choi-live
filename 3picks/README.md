# 3PICKS 홈페이지

## 미리보기

이 폴더에서 아래 명령을 실행한 뒤 `http://127.0.0.1:4173/`을 엽니다.

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

`index.html`을 직접 열어도 기본 화면은 동작하지만, 공유 URL과 배포 전 점검은 로컬 서버에서 진행하는 편이 안전합니다.

## 운영 입력

- 카카오톡 채널 URL: `config.js`의 `kakaoChannelUrl`
- 담당자 정보: `config.js`
- 상품 원본: 상위 폴더의 상품마스터 xlsx와 `흰배경상품/`

상품 원본이 바뀌면 아래 명령으로 데이터와 560×560 WebP 이미지를 다시 만듭니다.

```bash
python3 tools/build_catalog.py
```

## 주요 파일

- `index.html`: 페이지 구조와 3PICKS 디자인 토큰
- `app.js`: 설문, 룰 추천, 결과 복원, 색상 전환, 미니 견적, PDF·공유·상담 동작
- `config.js`: 카카오톡 채널과 담당자 설정
- `assets/3-picks-key-visual.webp`: 히어로 오른쪽의 3 PICKS 편집 포스터
- `assets/products-data.js`: 브라우저용 상품 데이터
- `assets/products.json`: 검수·연동용 상품 데이터
- `assets/products/`: 제품당 3장, 총 330장의 WebP 이미지
- `IMPLEMENTATION.md`: 섹션 매핑과 구현 판단
- `QA.md`: 검수 기준과 결과

## 현재 연결 상태

카카오톡 채널 Public ID가 아직 없어 CTA는 담당자 연락처 복사·전화·이메일 안내를 보여줍니다. `kakaoChannelUrl`을 채우면 같은 CTA가 새 창에서 채널 상담을 엽니다.

## 미니 견적 사용

- 상품 사진 우상단의 하트를 누르면 최대 12개까지 왼쪽 아래 견적함에 담깁니다.
- `♥ × N`을 누르면 하단의 가로 견적 바가 펼쳐지고 선택 여부·공통 수량·예상 상품 금액을 조정할 수 있습니다.
- 공통 수량은 100개에서 시작하며 20개 단위로 바뀝니다. 상품별 MOQ가 더 크면 적용 수량만 MOQ에 맞춥니다.
- 견적 바의 선택 상태와 수량은 브라우저에 저장되어 새로고침 뒤에도 유지됩니다.
- `PDF 미니 견적서`는 A4 문서 창을 열며 `인쇄·PDF 저장`으로 저장할 수 있습니다.
