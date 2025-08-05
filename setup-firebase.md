# Firebase 설정 가이드

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: `calendar-share`)
4. Google Analytics 설정 (선택사항)
5. 프로젝트 생성 완료

## 2. Realtime Database 설정

1. Firebase Console에서 프로젝트 선택
2. 왼쪽 메뉴에서 "Realtime Database" 선택
3. "데이터베이스 만들기" 클릭
4. 보안 규칙 선택:
   - **테스트 모드**: 개발용 (30일 후 자동 비활성화)
   - **잠금 모드**: 프로덕션용 (추후 규칙 설정 필요)
5. 데이터베이스 위치 선택 (asia-southeast1 권장)

## 3. 웹 앱 설정

1. Firebase Console 메인 화면에서 웹 아이콘 (</>) 클릭
2. 앱 닉네임 입력 (예: `calendar-share-web`)
3. Firebase Hosting 설정 (선택사항)
4. 설정 완료 후 구성 객체 복사

## 4. 구성 정보 업데이트

생성된 구성 정보를 `firebase-config.js` 파일에 붙여넣기:

```javascript
const firebaseConfig = {
  apiKey: "실제-API-키",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "실제-앱-ID"
};
```

## 5. 보안 규칙 설정 (프로덕션용)

Firebase Console → Realtime Database → 규칙 탭:

```json
{
  "rules": {
    "sessions": {
      "$sessionId": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['shareId', 'scheduleData'])"
      }
    }
  }
}
```

## 6. 테스트

1. 웹사이트 열기
2. 개발자 도구 Console에서 Firebase 연결 확인
3. 일정 입력 후 Firebase Console에서 데이터 확인

## 7. 배포 (선택사항)

Firebase Hosting 사용:
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 주의사항

- API 키는 공개되어도 안전하지만, 보안 규칙은 반드시 설정해야 합니다
- 테스트 모드는 30일 후 자동으로 비활성화됩니다
- 프로덕션 환경에서는 적절한 보안 규칙을 설정하세요