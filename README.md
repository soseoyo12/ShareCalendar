# 📅 일정 조율 앱 (Calendar Share)

여러 사람의 일정을 확인하고 최적의 만남 시간을 찾는 웹 애플리케이션입니다.

## 🚀 주요 기능

- **다중 일정 입력**: 직접 선택, 구글 캘린더, 애플 캘린더 연동
- **실시간 공유**: Firebase를 통한 실시간 일정 동기화
- **스마트 분석**: 모든 참가자가 가능한 시간대 자동 계산
- **iOS 앱**: Swift로 개발된 네이티브 iOS 애플리케이션

## 🏗️ 기술 스택

### 웹 애플리케이션
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Firebase Realtime Database
- **인증**: Google OAuth 2.0
- **API**: Google Calendar API

### iOS 애플리케이션
- **언어**: Swift
- **프레임워크**: SwiftUI
- **인증**: Firebase Authentication
- **데이터베이스**: Firebase Realtime Database

## 📁 프로젝트 구조

```
share_calender/
├── index.html              # 메인 웹 페이지
├── script.js               # 웹 앱 로직
├── styles.css              # 스타일시트
├── firebase-config.js      # Firebase 설정 (보안)
├── public/                 # 배포용 파일들
├── share_calendar_iOS/     # iOS 앱 소스코드
│   ├── *.swift            # Swift 소스파일들
│   └── *.xcodeproj        # Xcode 프로젝트
└── docs/                   # 설정 가이드
```

## 🛠️ 설치 및 실행

### 웹 애플리케이션

1. **리포지토리 클론**
   ```bash
   git clone https://github.com/your-username/share_calender.git
   cd share_calender
   ```

2. **Firebase 설정**
   - Firebase Console에서 프로젝트 생성
   - `firebase-config.js` 파일의 설정값 수정
   - Realtime Database 활성화

3. **Google Calendar API 설정**
   - Google Cloud Console에서 프로젝트 생성
   - Calendar API 활성화
   - OAuth 2.0 클라이언트 ID 생성
   - `firebase-config.js`의 `googleConfig` 수정

4. **로컬 서버 실행**
   ```bash
   # Python 사용
   python -m http.server 8080
   
   # 또는 Node.js 사용
   npx http-server -p 8080
   ```

5. **브라우저에서 접속**: `http://localhost:8080`

### iOS 애플리케이션

1. **Xcode 설치** (macOS 필요)
2. **프로젝트 열기**: `share_calendar_iOS/share_calendar_iOS.xcodeproj`
3. **Firebase 설정**: `GoogleService-Info.plist` 파일 추가
4. **빌드 및 실행**: Xcode에서 시뮬레이터 또는 실제 기기에서 실행

## 🔧 환경 설정

### 필수 설정 파일들

다음 파일들은 보안상 리포지토리에 포함되지 않으며, 직접 설정해야 합니다:

- `firebase-config.js`: Firebase 프로젝트 설정
- `GoogleService-Info.plist`: iOS Firebase 설정
- `google-services.json`: Android Firebase 설정 (향후 확장용)

자세한 설정 방법은 `GOOGLE_SETUP.md` 파일을 참조하세요.

## 📱 사용 방법

1. **일정 입력**: 직접 선택하거나 캘린더 앱 연동
2. **링크 공유**: 생성된 링크를 다른 참가자들에게 공유
3. **일정 수집**: 모든 참가자가 일정을 입력할 때까지 대기
4. **결과 확인**: 모든 사람이 가능한 시간대 확인

## 🛡️ 보안 고려사항

- API 키와 설정 파일들은 `.gitignore`로 관리
- OAuth 2.0을 통한 안전한 인증
- Firebase Security Rules로 데이터 접근 제어
- HTTPS를 통한 안전한 통신

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 문의

프로젝트 관련 문의사항이나 버그 리포트는 [Issues](https://github.com/your-username/share_calender/issues) 페이지를 이용해주세요.