# Google Calendar API 설정 완료 가이드

## 📋 설정 단계 요약

### 1. Google Cloud Console에서 발급받은 값들:
- **Client ID**: `123456789-abcdef.apps.googleusercontent.com`
- **API Key**: `AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. firebase-config.js 파일 수정

```javascript
// Google API 설정
const googleConfig = {
  CLIENT_ID: '발급받은_클라이언트_ID.apps.googleusercontent.com',
  API_KEY: '발급받은_API_KEY',
  DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
  SCOPES: 'https://www.googleapis.com/auth/calendar.readonly'
};
```

### 3. 테스트용 로컬 서버 실행

```bash
# Python 사용
cd /path/to/your/project
python -m http.server 8080

# Node.js 사용
npx http-server -p 8080

# VS Code Live Server 사용
VS Code에서 index.html 우클릭 → "Open with Live Server"
```

### 4. 브라우저 테스트

1. `http://localhost:8080` 접속
2. "구글 캘린더" 방법 선택
3. "구글 캘린더 연동" 버튼 클릭
4. Google 로그인 및 권한 승인
5. 캘린더 일정 불러오기 확인

## 🔧 문제 해결

### 오류 1: "Access blocked: This app's request is invalid"
**원인**: OAuth 동의 화면이 설정되지 않음
**해결**: Google Cloud Console → OAuth 동의 화면 설정 완료

### 오류 2: "The origin http://localhost:8080 is not allowed"
**원인**: 승인된 JavaScript 원본에 도메인 미등록
**해결**: OAuth 클라이언트 ID 설정에서 도메인 추가

### 오류 3: "API key not valid"
**원인**: API 키 제한 설정 오류
**해결**: API 키 설정에서 HTTP 리퍼러 제한 확인

### 오류 4: "Calendar API has not been used"
**원인**: Calendar API가 활성화되지 않음
**해결**: Google Cloud Console → API 라이브러리 → Calendar API 활성화

## 🚀 운영 환경 배포 시 주의사항

### 1. 도메인 등록
OAuth 클라이언트 ID 설정에서 실제 도메인 추가:
- `https://calendar-share-e97a2.web.app`
- `http://localhost:8080` (개발용)

### 2. API 키 제한
HTTP 리퍼러 제한에 실제 도메인 추가:
- `https://calendar-share-e97a2.web.app/*`
- `http://localhost:8080/*` (개발용)

### 3. OAuth 동의 화면 게시
- 테스트 모드에서 게시 모드로 변경
- Google 검토 과정 필요 (1-2주 소요)

### 4. 보안 강화
- API 키를 환경 변수로 관리
- HTTPS 필수 사용
- CSP (Content Security Policy) 설정

## 📊 기능 테스트 체크리스트

- [ ] Google 로그인 성공
- [ ] 캘린더 권한 승인 
- [ ] 일정 목록 불러오기
- [ ] 바쁜 시간 자동 표시
- [ ] 일정 적용 기능
- [ ] 에러 처리 확인

## 🔗 참고 문서

- [Google Calendar API](https://developers.google.com/calendar/api/guides/overview)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Google API JavaScript Client](https://github.com/google/google-api-javascript-client)