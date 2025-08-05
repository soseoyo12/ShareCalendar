class CalendarScheduler {
    constructor() {
        console.log('🔧 웹: CalendarScheduler 생성자 시작');
        this.currentStep = 1;
        this.scheduleData = {
            participants: [],
            timeSlots: {},
            selectedMethod: 'manual',
            dateRange: { start: null, end: null }
        };
        this.currentUser = null;
        this.shareId = this.getSessionIdFromURL() || this.generateShareId();
        console.log('🔗 웹: 최종 세션 ID:', this.shareId);
        
        // 사각형 선택 드래그 관련 변수
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectionBox = null;
        this.gridContainer = null;
        
        // 바인딩된 함수들 초기화
        this.boundEndDrag = null;
        this.boundEndSelection = null;
        this.boundOnSelectionMove = null;
        
        console.log('🔧 웹: endDrag 함수 유형 확인:', typeof this.endDrag);
        console.log('🔧 웹: endSelection 함수 유형 확인:', typeof this.endSelection);
        
        this.initializeEventListeners();
        this.loadDataFromFirebase();
        this.setupRealtimeListeners();
        this.setDefaultDates();
        
        // Google Calendar 초기화를 지연시켜서 다른 라이브러리 로드 대기
        setTimeout(() => {
            console.log('Starting Google Calendar initialization...');
            this.initializeGoogleCalendar();
        }, 2000);
        
        console.log('✅ 웹: CalendarScheduler 생성자 완료');
    }

    getSessionIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session');
        console.log('🔗 웹: URL에서 세션 ID 읽기:', sessionId);
        return sessionId;
    }

    generateShareId() {
        const id = Math.random().toString(36).substr(2, 9);
        console.log('🔗 웹: 새로운 세션 ID 생성:', id);
        return id;
    }

    // Google Calendar 관련 설정
    initializeGoogleCalendar() {
        // firebase-config.js에서 Google 설정 가져오기
        if (typeof googleConfig !== 'undefined') {
            this.GOOGLE_CLIENT_ID = googleConfig.CLIENT_ID;
            this.GOOGLE_API_KEY = googleConfig.API_KEY;
            this.DISCOVERY_DOC = googleConfig.DISCOVERY_DOC;
            this.SCOPES = googleConfig.SCOPES;
        } else {
            console.error('Google API 설정이 로드되지 않았습니다.');
            return;
        }
        
        this.gapi = null;
        this.tokenClient = null;
        this.gapiInited = false;
        this.gisInited = false;
        
        // Google API 초기화
        this.initializeGapi();
        this.initializeGis();
    }

    async initializeGapi() {
        console.log('Initializing GAPI...');
        console.log('gapi available:', typeof gapi !== 'undefined');
        console.log('googleConfig:', typeof googleConfig !== 'undefined' ? googleConfig : 'not available');
        
        if (typeof gapi !== 'undefined') {
            await gapi.load('client', this.initializeGapiClient.bind(this));
        } else {
            console.warn('Google API 라이브러리가 로드되지 않았습니다.');
            // 재시도 로직 추가
            setTimeout(() => {
                if (typeof gapi !== 'undefined') {
                    console.log('GAPI retry successful');
                    gapi.load('client', this.initializeGapiClient.bind(this));
                } else {
                    console.error('GAPI 로드 실패');
                }
            }, 1000);
        }
    }

    async initializeGapiClient() {
        console.log('Initializing GAPI Client...');
        console.log('API Key:', this.GOOGLE_API_KEY);
        console.log('Discovery Doc:', this.DISCOVERY_DOC);
        
        try {
            // 먼저 기본 초기화 시도
            await gapi.client.init({
                apiKey: this.GOOGLE_API_KEY,
            });
            
            console.log('Basic GAPI Client initialized successfully');
            
            // 그 다음 Calendar API 수동 로드
            await gapi.client.load('calendar', 'v3');
            
            this.gapiInited = true;
            console.log('Calendar API loaded successfully');
            this.maybeEnableButtons();
        } catch (error) {
            console.error('Google API 초기화 오류:', error);
            console.error('Error details:', error.details);
            
            // 기존 방법으로 재시도
            try {
                console.log('Retrying with discovery doc...');
                await gapi.client.init({
                    apiKey: this.GOOGLE_API_KEY,
                    discoveryDocs: [this.DISCOVERY_DOC],
                });
                this.gapiInited = true;
                console.log('GAPI Client initialized successfully (retry)');
                this.maybeEnableButtons();
            } catch (retryError) {
                console.error('재시도도 실패:', retryError);
            }
        }
    }

    async initializeGis() {
        console.log('Initializing GIS...');
        console.log('google available:', typeof google !== 'undefined');
        console.log('google.accounts available:', typeof google !== 'undefined' && google.accounts);
        
        if (typeof google !== 'undefined' && google.accounts) {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.GOOGLE_CLIENT_ID,
                scope: this.SCOPES,
                callback: '', // 나중에 정의
            });
            this.gisInited = true;
            console.log('GIS initialized successfully');
            this.maybeEnableButtons();
        } else {
            console.warn('Google Identity Services가 로드되지 않았습니다.');
            // 재시도 로직 추가
            setTimeout(() => {
                if (typeof google !== 'undefined' && google.accounts) {
                    console.log('GIS retry successful');
                    this.initializeGis();
                } else {
                    console.error('GIS 로드 실패');
                }
            }, 1000);
        }
    }

    maybeEnableButtons() {
        console.log('maybeEnableButtons called');
        console.log('gapiInited:', this.gapiInited);
        console.log('gisInited:', this.gisInited);
        
        if (this.gapiInited && this.gisInited) {
            // 구글 캘린더 버튼 활성화
            const googleSignInBtn = document.getElementById('googleSignInBtn');
            console.log('googleSignInBtn found:', !!googleSignInBtn);
            
            if (googleSignInBtn) {
                googleSignInBtn.disabled = false;
                googleSignInBtn.textContent = '구글 캘린더 연동';
                googleSignInBtn.addEventListener('click', () => {
                    console.log('Google sign in button clicked');
                    this.handleGoogleSignIn();
                });
                console.log('Google Calendar button enabled');
            }
        } else {
            console.log('Google APIs not fully initialized yet');
        }
    }

    handleGoogleSignIn() {
        console.log('handleGoogleSignIn called');
        if (!this.tokenClient) {
            console.error('Token client가 초기화되지 않았습니다.');
            return;
        }

        this.tokenClient.callback = async (resp) => {
            console.log('Token callback response:', resp);
            if (resp.error !== undefined) {
                console.error('Google 로그인 오류:', resp.error);
                return;
            }
            
            // 로딩 표시
            this.showCalendarLoadingStatus(true);
            
            try {
                const events = await this.getCalendarEvents();
                console.log('Calendar events:', events);
                this.displayImportedEvents(events);
                this.showCalendarLoadingStatus(false);
                this.showCalendarImportResult(true);
            } catch (error) {
                console.error('캘린더 이벤트 가져오기 오류:', error);
                this.showCalendarLoadingStatus(false);
                alert('캘린더 이벤트를 가져오는 중 오류가 발생했습니다.');
            }
        };

        if (gapi.client.getToken() === null) {
            this.tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            this.tokenClient.requestAccessToken({prompt: ''});
        }
    }

    async getCalendarEvents() {
        const { start, end } = this.scheduleData.dateRange;
        if (!start || !end) {
            throw new Error('날짜 범위가 설정되지 않았습니다.');
        }

        const startDate = new Date(start);
        const endDate = new Date(end);
        endDate.setDate(endDate.getDate() + 1); // 종료 날짜 다음날까지

        const request = {
            'calendarId': 'primary',
            'timeMin': startDate.toISOString(),
            'timeMax': endDate.toISOString(),
            'showDeleted': false,
            'singleEvents': true,
            'maxResults': 100,
            'orderBy': 'startTime'
        };

        try {
            const response = await gapi.client.calendar.events.list(request);
            return response.result.items || [];
        } catch (error) {
            console.error('캘린더 API 호출 오류:', error);
            throw error;
        }
    }

    displayImportedEvents(events) {
        console.log('displayImportedEvents called with:', events);
        const container = document.getElementById('importedEventsList');
        if (!container) {
            console.error('importedEventsList container not found');
            return;
        }
        
        container.innerHTML = '';

        if (events.length === 0) {
            container.innerHTML = '<p>선택된 날짜 범위에 일정이 없습니다.</p>';
            return;
        }

        events.forEach(event => {
            const eventDiv = document.createElement('div');
            eventDiv.className = 'imported-event';
            
            const startTime = new Date(event.start.dateTime || event.start.date);
            const endTime = new Date(event.end.dateTime || event.end.date);
            
            eventDiv.innerHTML = `
                <div class="event-title">${event.summary || '제목 없음'}</div>
                <div class="event-time">${this.formatDateTime(startTime)} - ${this.formatDateTime(endTime)}</div>
                <div class="event-location">${event.location || ''}</div>
            `;
            
            container.appendChild(eventDiv);
        });

        // 적용 버튼 이벤트 추가
        const applyBtn = document.getElementById('applyCalendarBtn');
        if (applyBtn) {
            applyBtn.onclick = () => {
                this.applyCalendarEvents(events);
            };
        }
    }

    formatDateTime(date) {
        return date.toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showCalendarLoadingStatus(show) {
        const loadingDiv = document.getElementById('calendarLoadingStatus');
        if (loadingDiv) {
            if (show) {
                loadingDiv.classList.remove('hidden');
            } else {
                loadingDiv.classList.add('hidden');
            }
        }
    }

    showCalendarImportResult(show) {
        const resultDiv = document.getElementById('calendarImportResult');
        if (resultDiv) {
            if (show) {
                resultDiv.classList.remove('hidden');
            } else {
                resultDiv.classList.add('hidden');
            }
        }
    }

    applyCalendarEvents(events) {
        console.log('applyCalendarEvents called with:', events);
        if (!events || events.length === 0) {
            alert('적용할 일정이 없습니다.');
            return;
        }

        // 기존 일정 초기화
        this.scheduleData.timeSlots = {};
        
        // 모든 시간 슬롯 초기화
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('unavailable');
        });

        events.forEach(event => {
            const startTime = new Date(event.start.dateTime || event.start.date);
            const endTime = new Date(event.end.dateTime || event.end.date);
            
            this.markTimeSlotsBusy(startTime, endTime);
        });

        // UI 새로고침
        this.refreshTimeSlotDisplay();
        
        // 데이터 저장
        this.saveDataToFirebase();
        
        // 성공 메시지
        alert(`${events.length}개의 일정이 적용되었습니다.`);
    }

    markTimeSlotsBusy(startTime, endTime) {
        const startDate = startTime.toISOString().split('T')[0];
        const endDate = endTime.toISOString().split('T')[0];
        
        // 시작 날짜부터 종료 날짜까지 처리
        const currentDate = new Date(startTime);
        while (currentDate <= endTime) {
            const dateKey = currentDate.toISOString().split('T')[0];
            
            if (!this.scheduleData.timeSlots[dateKey]) {
                this.scheduleData.timeSlots[dateKey] = {};
            }
            
            // 해당 날짜의 바쁜 시간 계산
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);
            
            const busyStart = new Date(Math.max(startTime, dayStart));
            const busyEnd = new Date(Math.min(endTime, dayEnd));
            
            const startHour = busyStart.getHours();
            let endHour = busyEnd.getHours();
            
            // 정확한 시간에 끝나는 경우 (분이 0인 경우) 해당 시간은 포함하지 않음
            if (busyEnd.getMinutes() === 0 && busyEnd.getHours() > startHour) {
                endHour = endHour - 1;
            }
            
            // 시간 슬롯을 바쁜 시간으로 표시 (기존 상태를 덮어쓰지 않고 설정만)
            for (let hour = startHour; hour <= endHour; hour++) {
                // 9시 이전은 무시 (시간 범위 제한)
                if (hour >= 9) {
                    this.scheduleData.timeSlots[dateKey][hour] = 'unavailable';
                }
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    refreshTimeSlotDisplay() {
        document.querySelectorAll('.time-slot').forEach(slot => {
            const date = slot.dataset.date;
            const hour = parseInt(slot.dataset.hour);
            
            if (this.scheduleData.timeSlots[date] && this.scheduleData.timeSlots[date][hour] === 'unavailable') {
                slot.classList.add('unavailable');
            } else {
                slot.classList.remove('unavailable');
            }
        });
    }

    initializeEventListeners() {
        // 방법 선택 버튼
        document.querySelectorAll('.method-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectMethod(e.target.dataset.method);
            });
        });

        // 날짜 입력
        document.getElementById('startDate').addEventListener('change', (e) => {
            this.scheduleData.dateRange.start = e.target.value;
            this.generateTimeGrid();
        });

        document.getElementById('endDate').addEventListener('change', (e) => {
            this.scheduleData.dateRange.end = e.target.value;
            this.generateTimeGrid();
        });

        // 다음 단계 버튼
        document.getElementById('nextStep').addEventListener('click', () => {
            this.nextStep();
        });

        // 링크 복사 버튼
        document.getElementById('copyLink').addEventListener('click', () => {
            this.copyShareLink();
        });

        // 결과 보기 버튼
        document.getElementById('viewResults').addEventListener('click', () => {
            this.showResults();
        });

        // 캘린더 추가 버튼
        document.getElementById('addToCalendar').addEventListener('click', () => {
            this.addToCalendar();
        });

        // 결과 공유 버튼
        document.getElementById('shareResult').addEventListener('click', () => {
            this.shareResult();
        });

        // URL에서 공유 ID 확인
        this.checkShareUrl();
        
        // 전역 드래그 이벤트 리스너 (안전한 바인딩)
        // 캐시 문제 방지를 위한 강제 새로고침 체크
        console.log('🔧 웹: endDrag 함수 확인:', typeof this.endDrag);
        
        // 바인딩된 함수 미리 생성하여 참조 보장
        this.boundEndDrag = this.endDrag.bind(this);
        this.boundEndSelection = this.endSelection.bind(this);
        
        // 전역 이벤트 리스너 추가
        document.addEventListener('mouseup', this.boundEndDrag);
        document.addEventListener('mouseleave', this.boundEndDrag);
        document.addEventListener('touchend', this.boundEndDrag);
        document.addEventListener('touchcancel', this.boundEndDrag);
        
        console.log('✅ 웹: 전역 드래그 이벤트 리스너 초기화 완료');
    }

    setDefaultDates() {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        document.getElementById('startDate').value = today.toISOString().split('T')[0];
        document.getElementById('endDate').value = nextWeek.toISOString().split('T')[0];
        
        this.scheduleData.dateRange.start = today.toISOString().split('T')[0];
        this.scheduleData.dateRange.end = nextWeek.toISOString().split('T')[0];
        
        this.generateTimeGrid();
    }

    selectMethod(method) {
        this.scheduleData.selectedMethod = method;
        
        // 버튼 활성화 상태 변경
        document.querySelectorAll('.method-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-method="${method}"]`).classList.add('active');

        // 입력 방법에 따라 UI 변경
        if (method === 'manual') {
            document.getElementById('manualInput').classList.remove('hidden');
            document.getElementById('calendarIntegration').classList.add('hidden');
        } else {
            document.getElementById('manualInput').classList.add('hidden');
            document.getElementById('calendarIntegration').classList.remove('hidden');
            
            // Google 방법 선택 시 버튼 활성화 재시도
            if (method === 'google') {
                console.log('Google method selected, checking button status...');
                setTimeout(() => {
                    this.maybeEnableButtons();
                }, 100);
            }
        }
    }

    generateTimeGrid() {
        const { start, end } = this.scheduleData.dateRange;
        if (!start || !end) return;

        const startDate = new Date(start);
        const endDate = new Date(end);
        const grid = document.getElementById('timeGrid');
        
        grid.innerHTML = '';

        // 날짜 배열 생성
        const dates = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push({
                key: currentDate.toISOString().split('T')[0],
                date: new Date(currentDate),
                formatted: this.formatDate(currentDate)
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // 그리드 컬럼 개수 설정 (빈 셀 + 날짜 개수)
        // 모바일에서는 더 좁은 시간 레이블 컬럼 사용
        const isMobile = window.innerWidth <= 768;
        const timeLabelWidth = isMobile ? '60px' : '80px';
        const dateColumnWidth = isMobile ? 'minmax(70px, 1fr)' : '1fr';
        grid.style.gridTemplateColumns = `${timeLabelWidth} repeat(${dates.length}, ${dateColumnWidth})`;

        // 빈 셀 (왼쪽 위 모서리)
        const emptyCell = document.createElement('div');
        emptyCell.className = 'empty-cell';
        grid.appendChild(emptyCell);

        // 날짜 헤더 생성 (세로 방향)
        dates.forEach(dateInfo => {
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            dateHeader.innerHTML = `
                <div class="date-day">${dateInfo.date.getDate()}</div>
                <div class="date-weekday">${dateInfo.date.toLocaleDateString('ko-KR', { weekday: 'short' })}</div>
                <div class="date-month">${dateInfo.date.toLocaleDateString('ko-KR', { month: 'short' })}</div>
            `;
            grid.appendChild(dateHeader);
        });

        // 시간별 행 생성 (오전 9시부터 자정까지)
        for (let hour = 9; hour < 24; hour++) {
            // 시간 레이블
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.innerHTML = `
                <div class="time-hour">${hour}</div>
                <div class="time-period">${hour < 12 ? 'AM' : 'PM'}</div>
            `;
            grid.appendChild(timeLabel);

            // 각 날짜별 시간 슬롯
            dates.forEach(dateInfo => {
                const timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot';
                timeSlot.dataset.date = dateInfo.key;
                timeSlot.dataset.hour = hour;
                timeSlot.title = `${dateInfo.formatted} ${hour}:00`;
                
                // 마우스 이벤트 리스너 추가 (사각형 선택)
                timeSlot.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    this.startSelection(e, e.target);
                });
                
                // 터치 이벤트 리스너 추가 (모바일 지원)
                let touchStartTime = 0;
                let touchStartTarget = null;
                let hasDragged = false;
                
                timeSlot.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    touchStartTime = Date.now();
                    touchStartTarget = e.target;
                    hasDragged = false;
                    
                    // 터치를 마우스 이벤트로 변환
                    const touch = e.touches[0];
                    const mouseEvent = {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        preventDefault: () => e.preventDefault()
                    };
                    this.startSelection(mouseEvent, e.target);
                }, { passive: false });
                
                timeSlot.addEventListener('touchmove', (e) => {
                    e.preventDefault();
                    hasDragged = true;
                    if (this.isSelecting) {
                        const touch = e.touches[0];
                        const mouseEvent = {
                            clientX: touch.clientX,
                            clientY: touch.clientY
                        };
                        this.onSelectionMove(mouseEvent);
                    }
                }, { passive: false });
                
                timeSlot.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    const touchDuration = Date.now() - touchStartTime;
                    
                    // 짧은 터치이고 드래그하지 않았으면 탭으로 처리
                    if (touchDuration < 300 && !hasDragged && touchStartTarget === e.target) {
                        this.toggleTimeSlot(e.target);
                    } else if (hasDragged && this.isSelecting) {
                        // 드래그가 있었으면 선택 종료
                        this.endSelection();
                    }
                }, { passive: false });
                
                // 기존 클릭 이벤트도 유지 (데스크톱용)
                timeSlot.addEventListener('click', (e) => {
                    // 선택 중이 아닐 때만 토글
                    if (!this.isSelecting) {
                        this.toggleTimeSlot(e.target);
                    }
                });

                grid.appendChild(timeSlot);
            });
        }
    }

    toggleTimeSlot(slot) {
        const date = slot.dataset.date;
        const hour = parseInt(slot.dataset.hour);
        
        if (!this.scheduleData.timeSlots[date]) {
            this.scheduleData.timeSlots[date] = {};
        }

        if (slot.classList.contains('unavailable')) {
            slot.classList.remove('unavailable');
            delete this.scheduleData.timeSlots[date][hour];
        } else {
            slot.classList.add('unavailable');
            this.scheduleData.timeSlots[date][hour] = 'unavailable';
        }

        this.saveDataToStorage();
    }

    formatDate(date) {
        return date.toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
            weekday: 'short'
        });
    }

    nextStep() {
        const userName = document.getElementById('userName').value.trim();
        if (!userName) {
            alert('이름을 입력해주세요.');
            return;
        }

        // 현재 사용자 정보 저장
        this.currentUser = {
            name: userName,
            schedule: JSON.parse(JSON.stringify(this.scheduleData.timeSlots)),
            showDetails: document.getElementById('showDetails').checked,
            timestamp: new Date().toISOString()
        };

        // 참여자 목록에 추가
        this.addParticipant(this.currentUser);
        
        // Firebase에 참여자 데이터 저장
        this.saveParticipantToFirebase(this.currentUser);

        // 공유 링크 생성
        this.generateShareLink();

        // 다음 단계로 이동
        this.showStep(2);
    }

    addParticipant(participant) {
        const existingIndex = this.scheduleData.participants.findIndex(p => p.name === participant.name);
        if (existingIndex !== -1) {
            this.scheduleData.participants[existingIndex] = participant;
        } else {
            this.scheduleData.participants.push(participant);
        }
        
        this.updateParticipantsList();
        this.saveDataToFirebase();
    }

    updateParticipantsList() {
        const container = document.getElementById('participantsList');
        container.innerHTML = '';

        this.scheduleData.participants.forEach(participant => {
            const item = document.createElement('div');
            item.className = 'participant-item';
            item.innerHTML = `
                <span class="participant-name">${participant.name}</span>
                <span class="participant-status completed">참여 완료</span>
            `;
            container.appendChild(item);
        });
    }

    generateShareLink() {
        const baseUrl = window.location.origin + window.location.pathname;
        const shareUrl = `${baseUrl}?session=${this.shareId}`;
        document.getElementById('shareLink').value = shareUrl;
        console.log('🔗 웹: 공유 링크 생성:', shareUrl);
        console.log('🔗 웹: 현재 세션 ID:', this.shareId);
    }

    copyShareLink() {
        const shareLink = document.getElementById('shareLink');
        shareLink.select();
        shareLink.setSelectionRange(0, 99999);
        document.execCommand('copy');
        
        const copyBtn = document.getElementById('copyLink');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '복사완료!';
        copyBtn.style.background = '#28a745';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '';
        }, 2000);
    }

    showResults() {
        this.calculateBestTimes();
        this.generateHeatmap();
        this.showStep(3);
    }

    calculateBestTimes() {
        const bestTimes = [];
        const allDates = Object.keys(this.scheduleData.timeSlots);
        
        if (allDates.length === 0) return;

        // 모든 날짜와 시간에 대해 가능한 참여자 수 계산 (9시~23시만)
        allDates.forEach(date => {
            for (let hour = 9; hour < 24; hour++) {
                let availableCount = 0;
                
                this.scheduleData.participants.forEach(participant => {
                    if (participant.schedule[date] && participant.schedule[date][hour] === 'available') {
                        availableCount++;
                    }
                });

                if (availableCount > 0) {
                    bestTimes.push({
                        date: date,
                        hour: hour,
                        availableCount: availableCount,
                        totalCount: this.scheduleData.participants.length
                    });
                }
            }
        });

        // 가능한 참여자 수 순으로 정렬
        bestTimes.sort((a, b) => b.availableCount - a.availableCount);

        // 상위 10개 시간대 표시
        const container = document.getElementById('bestTimesList');
        container.innerHTML = '';

        bestTimes.slice(0, 10).forEach((timeSlot, index) => {
            const item = document.createElement('div');
            item.className = 'best-time-item';
            item.innerHTML = `
                <div class="time-info">
                    <span class="time-slot-info">
                        ${this.formatDate(new Date(timeSlot.date))} ${timeSlot.hour}:00
                    </span>
                    <span class="participant-count">
                        ${timeSlot.availableCount}/${timeSlot.totalCount}명
                    </span>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.selectBestTime(timeSlot);
            });
            
            container.appendChild(item);
        });
    }

    selectBestTime(timeSlot) {
        // 이전 선택 해제
        document.querySelectorAll('.best-time-item').forEach(item => {
            item.classList.remove('selected');
        });

        // 현재 선택
        event.target.closest('.best-time-item').classList.add('selected');
        
        // 선택된 시간 저장
        this.selectedTime = timeSlot;
    }

    generateHeatmap() {
        const container = document.getElementById('heatmapContainer');
        container.innerHTML = '';

        const heatmapGrid = document.createElement('div');
        heatmapGrid.className = 'heatmap-grid';

        const { start, end } = this.scheduleData.dateRange;
        if (!start || !end) return;

        const startDate = new Date(start);
        const endDate = new Date(end);
        const maxParticipants = this.scheduleData.participants.length;

        // 날짜 배열 생성
        const dates = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push({
                key: currentDate.toISOString().split('T')[0],
                date: new Date(currentDate),
                formatted: this.formatDate(currentDate)
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // 그리드 컬럼 설정 (시간 레이블 + 날짜 개수)
        heatmapGrid.style.gridTemplateColumns = `80px repeat(${dates.length}, 1fr)`;

        // 빈 셀 (왼쪽 위 모서리)
        const emptyCell = document.createElement('div');
        emptyCell.className = 'empty-cell';
        heatmapGrid.appendChild(emptyCell);

        // 날짜 헤더 생성 (세로 방향)
        dates.forEach(dateInfo => {
            const dateHeader = document.createElement('div');
            dateHeader.className = 'heatmap-date-header';
            dateHeader.innerHTML = `
                <div class="heatmap-date-day">${dateInfo.date.getDate()}</div>
                <div class="heatmap-date-weekday">${dateInfo.date.toLocaleDateString('ko-KR', { weekday: 'short' })}</div>
            `;
            heatmapGrid.appendChild(dateHeader);
        });

        // 시간별 행 생성 (9시~23시만)
        for (let hour = 9; hour < 24; hour++) {
            // 시간 레이블
            const timeLabel = document.createElement('div');
            timeLabel.className = 'heatmap-time-label';
            timeLabel.innerHTML = `
                <div class="heatmap-time-hour">${hour}</div>
                <div class="heatmap-time-period">${hour < 12 ? 'AM' : 'PM'}</div>
            `;
            heatmapGrid.appendChild(timeLabel);

            // 각 날짜별 히트맵 셀
            dates.forEach(dateInfo => {
                let availableCount = 0;
                
                this.scheduleData.participants.forEach(participant => {
                    if (participant.schedule[dateInfo.key] && participant.schedule[dateInfo.key][hour] === 'available') {
                        availableCount++;
                    }
                });

                const cell = document.createElement('div');
                cell.className = 'heatmap-cell';
                cell.textContent = availableCount || '';
                cell.title = `${dateInfo.formatted} ${hour}:00 - ${availableCount}명 가능`;
                
                // 레벨 계산 (0-4)
                const level = maxParticipants === 0 ? 0 : Math.min(4, Math.ceil((availableCount / maxParticipants) * 4));
                cell.classList.add(`level-${level}`);
                
                heatmapGrid.appendChild(cell);
            });
        }

        container.appendChild(heatmapGrid);
    }

    // 드래그 관련 메서드들 - 사각형 선택 방식
    startSelection(e, slot) {
        e.preventDefault();
        this.isSelecting = true;
        this.gridContainer = document.getElementById('timeGrid');
        
        // 시작 위치 저장 (그리드 상대 좌표)
        const gridRect = this.gridContainer.getBoundingClientRect();
        this.selectionStart = {
            x: e.clientX - gridRect.left,
            y: e.clientY - gridRect.top,
            slot: slot
        };
        
        // 선택 박스 생성
        this.createSelectionBox();
        
        // 드래그 중 선택 방지
        document.body.style.userSelect = 'none';
        
        // 전역 이벤트 리스너 추가 (바인딩된 함수 참조 저장)
        if (!this.boundOnSelectionMove) {
            this.boundOnSelectionMove = this.onSelectionMove.bind(this);
        }
        if (!this.boundEndSelection) {
            this.boundEndSelection = this.endSelection.bind(this);
        }
        document.addEventListener('mousemove', this.boundOnSelectionMove);
        document.addEventListener('mouseup', this.boundEndSelection);
    }
    
    createSelectionBox() {
        // 기존 선택 박스 제거
        if (this.selectionBox) {
            this.selectionBox.remove();
        }
        
        // 새 선택 박스 생성
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selection-box';
        this.selectionBox.style.cssText = `
            position: absolute;
            border: 2px dashed #667eea;
            background: rgba(102, 126, 234, 0.1);
            pointer-events: none;
            z-index: 1000;
            display: none;
        `;
        
        this.gridContainer.style.position = 'relative';
        this.gridContainer.appendChild(this.selectionBox);
    }
    
    onSelectionMove(e) {
        if (!this.isSelecting || !this.selectionStart) return;
        
        const gridRect = this.gridContainer.getBoundingClientRect();
        const currentX = e.clientX - gridRect.left;
        const currentY = e.clientY - gridRect.top;
        
        // 선택 박스 업데이트
        this.updateSelectionBox(currentX, currentY);
        
        // 선택된 슬롯들 하이라이트
        this.highlightSelectedSlots(currentX, currentY);
    }
    
    updateSelectionBox(currentX, currentY) {
        const startX = this.selectionStart.x;
        const startY = this.selectionStart.y;
        
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        
        this.selectionBox.style.left = left + 'px';
        this.selectionBox.style.top = top + 'px';
        this.selectionBox.style.width = width + 'px';
        this.selectionBox.style.height = height + 'px';
        this.selectionBox.style.display = 'block';
    }
    
    highlightSelectedSlots(currentX, currentY) {
        // 기존 하이라이트 제거
        document.querySelectorAll('.time-slot.selecting').forEach(slot => {
            slot.classList.remove('selecting');
        });
        
        // 선택 영역 계산
        const selectionRect = this.getSelectionRect(currentX, currentY);
        
        // 선택 영역에 포함된 슬롯들 하이라이트
        document.querySelectorAll('.time-slot').forEach(slot => {
            const slotRect = slot.getBoundingClientRect();
            const gridRect = this.gridContainer.getBoundingClientRect();
            
            const slotRelativeRect = {
                left: slotRect.left - gridRect.left,
                top: slotRect.top - gridRect.top,
                right: slotRect.right - gridRect.left,
                bottom: slotRect.bottom - gridRect.top
            };
            
            if (this.isRectIntersecting(selectionRect, slotRelativeRect)) {
                slot.classList.add('selecting');
            }
        });
    }
    
    endSelection() {
        console.log('🔧 웹: endSelection 함수 호출됨', this.isSelecting);
        if (!this.isSelecting) return;
        
        try {
            // 선택된 슬롯들의 상태 변경
            const selectedSlots = document.querySelectorAll('.time-slot.selecting');
            const shouldMakeUnavailable = selectedSlots.length > 0 && !selectedSlots[0].classList.contains('unavailable');
            
            console.log('🔧 웹: 선택된 슬롯 개수:', selectedSlots.length);
            
            selectedSlots.forEach(slot => {
                slot.classList.remove('selecting');
                if (shouldMakeUnavailable) {
                    this.setSlotState(slot, 'unavailable');
                } else {
                    this.setSlotState(slot, 'available');
                }
            });
            
            // 선택 상태 초기화
            this.isSelecting = false;
            this.selectionStart = null;
            
            // 선택 박스 제거
            if (this.selectionBox) {
                this.selectionBox.remove();
                this.selectionBox = null;
            }
            
            // 이벤트 리스너 제거 (저장된 바인딩 함수 사용)
            if (this.boundOnSelectionMove) {
                document.removeEventListener('mousemove', this.boundOnSelectionMove);
                this.boundOnSelectionMove = null;
            }
            if (this.boundEndSelection) {
                document.removeEventListener('mouseup', this.boundEndSelection);
                this.boundEndSelection = null;
            }
            
            // 선택 복원
            document.body.style.userSelect = '';
            
            // 데이터 저장
            this.saveDataToFirebase();
            
            console.log('✅ 웹: endSelection 성공적으로 완료');
        } catch (error) {
            console.error('❌ 웹: endSelection 오류:', error);
        }
    }
    
    endDrag() {
        console.log('🔧 웹: endDrag 함수 호출됨');
        try {
            this.endSelection();
            console.log('✅ 웹: endDrag 성공적으로 완료');
        } catch (error) {
            console.error('❌ 웹: endDrag 오류:', error);
        }
    }
    
    getSelectionRect(currentX, currentY) {
        const startX = this.selectionStart.x;
        const startY = this.selectionStart.y;
        
        return {
            left: Math.min(startX, currentX),
            top: Math.min(startY, currentY),
            right: Math.max(startX, currentX),
            bottom: Math.max(startY, currentY)
        };
    }
    
    isRectIntersecting(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                rect1.left > rect2.right || 
                rect1.bottom < rect2.top || 
                rect1.top > rect2.bottom);
    }
    
    setSlotState(slot, state) {
        const date = slot.dataset.date;
        const hour = parseInt(slot.dataset.hour);
        
        if (!this.scheduleData.timeSlots[date]) {
            this.scheduleData.timeSlots[date] = {};
        }
        
        // 클래스 제거 후 새로운 상태 적용
        slot.classList.remove('unavailable');
        if (state === 'unavailable') {
            slot.classList.add('unavailable');
            this.scheduleData.timeSlots[date][hour] = 'unavailable';
        } else {
            delete this.scheduleData.timeSlots[date][hour];
        }
    }

    addToCalendar() {
        if (!this.selectedTime) {
            alert('먼저 시간을 선택해주세요.');
            return;
        }

        const { date, hour } = this.selectedTime;
        const startDate = new Date(date);
        startDate.setHours(hour, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setHours(hour + 1, 0, 0, 0);

        // Google Calendar 링크 생성
        const title = encodeURIComponent('일정 조율 결과');
        const details = encodeURIComponent(`캘린더 공유를 통해 조율된 일정입니다.`);
        const startTime = startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        const endTime = endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}`;
        
        window.open(googleCalendarUrl, '_blank');
    }

    shareResult() {
        if (!this.selectedTime) {
            alert('먼저 최적 시간을 선택해주세요.');
            return;
        }

        const { date, hour } = this.selectedTime;
        const selectedDate = new Date(date);
        const formattedDate = this.formatDate(selectedDate);
        const timeString = `${hour}:00 ${hour < 12 ? 'AM' : 'PM'}`;
        
        // 공유할 텍스트 생성
        const shareText = `📅 일정 조율 결과

🎯 최적 시간: ${formattedDate} ${timeString}
👥 참여 가능: ${this.selectedTime.availableCount}/${this.selectedTime.totalCount}명

🔗 일정 공유 링크: ${window.location.origin + window.location.pathname}?share=${this.shareId}

💡 위 링크로 추가 참여자를 초대할 수 있습니다!`;

        // Web Share API 지원 확인
        if (navigator.share) {
            navigator.share({
                title: '📅 일정 조율 결과',
                text: shareText,
                url: `${window.location.origin + window.location.pathname}?share=${this.shareId}`
            }).then(() => {
                console.log('공유 성공');
            }).catch((error) => {
                console.log('공유 취소:', error);
                this.fallbackShare(shareText);
            });
        } else {
            // Web Share API 미지원시 대체 방법
            this.fallbackShare(shareText);
        }
    }

    fallbackShare(shareText) {
        // 클립보드에 복사
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                this.showShareModal(shareText);
            }).catch(() => {
                this.showShareModal(shareText);
            });
        } else {
            this.showShareModal(shareText);
        }
    }

    showShareModal(shareText) {
        // 공유 모달 생성
        const modal = document.createElement('div');
        modal.className = 'share-modal';
        modal.innerHTML = `
            <div class="share-modal-content">
                <div class="share-modal-header">
                    <h3>📅 일정 결과 공유</h3>
                    <button class="share-modal-close">&times;</button>
                </div>
                <div class="share-modal-body">
                    <textarea readonly class="share-textarea">${shareText}</textarea>
                    <div class="share-buttons">
                        <button class="copy-share-btn">📋 복사하기</button>
                        <button class="kakao-share-btn">💬 카카오톡</button>
                        <button class="sms-share-btn">📱 문자</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 이벤트 리스너 추가
        modal.querySelector('.share-modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('.copy-share-btn').addEventListener('click', () => {
            const textarea = modal.querySelector('.share-textarea');
            textarea.select();
            document.execCommand('copy');
            
            const btn = modal.querySelector('.copy-share-btn');
            const originalText = btn.textContent;
            btn.textContent = '✅ 복사완료!';
            btn.style.background = '#28a745';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 2000);
        });

        modal.querySelector('.kakao-share-btn').addEventListener('click', () => {
            const shareUrl = `${window.location.origin + window.location.pathname}?share=${this.shareId}`;
            const kakaoUrl = `https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
            window.open(kakaoUrl, '_blank');
        });

        modal.querySelector('.sms-share-btn').addEventListener('click', () => {
            const smsUrl = `sms:?body=${encodeURIComponent(shareText)}`;
            window.open(smsUrl);
        });

        // 모달 배경 클릭시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    showStep(stepNumber) {
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });
        
        document.getElementById(`step${stepNumber}`).classList.add('active');
        this.currentStep = stepNumber;
    }

    // Firebase에 데이터 저장
    saveDataToFirebase() {
        if (typeof database === 'undefined') {
            console.warn('파이어베이스가 아직 로드되지 않았습니다. localStorage를 사용합니다.');
            this.saveDataToStorage();
            return;
        }

        const sessionRef = database.ref(`sessions/${this.shareId}`);
        
        const dataToSave = {
            shareId: this.shareId,
            scheduleData: this.scheduleData,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP,
            dateRange: this.scheduleData.dateRange
        };
        
        sessionRef.set(dataToSave)
            .then(() => {
                console.log('파이어베이스에 데이터 저장 성공');
            })
            .catch((error) => {
                console.error('파이어베이스 저장 오류:', error);
                this.saveDataToStorage(); // 대체 수단으로 localStorage 사용
            });
    }

    // 참여자 데이터 Firebase에 저장
    saveParticipantToFirebase(participant) {
        if (typeof database === 'undefined') {
            return;
        }

        const sessionRef = database.ref(`sessions/${this.shareId}`);
        
        // iOS 앱과 동일한 구조로 참여자 저장
        const userId = participant.name; // 간단히 name을 userId로 사용
        const participantData = {
            id: userId,
            name: participant.name,
            joinedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        console.log('🔥 웹: 저장할 참여자 데이터:', participantData);
        console.log('🔥 웹: 세션 ID:', this.shareId);
        console.log('🔥 웹: 저장 경로:', `sessions/${this.shareId}/participants/${userId}`);
        
        // 참여자 정보 저장 (iOS와 동일한 경로)
        sessionRef.child(`participants/${userId}`).set(participantData)
            .then(() => {
                console.log(`✅ 웹: 참여자 ${participant.name} 저장 성공`);
            })
            .catch((error) => {
                console.error(`❌ 웹: 참여자 저장 실패:`, error);
            });
        
        // 사용자별 시간 슬롯 저장 (iOS 앱 구조와 동일)
        if (participant.schedule) {
            const userTimeSlots = {};
            for (const [dateKey, daySlots] of Object.entries(participant.schedule)) {
                userTimeSlots[dateKey] = {};
                for (const [hour, status] of Object.entries(daySlots)) {
                    userTimeSlots[dateKey][hour] = status;
                }
            }
            console.log('🔥 웹: 저장할 시간 슬롯:', userTimeSlots);
            sessionRef.child(`timeSlots/${userId}`).set(userTimeSlots)
                .then(() => {
                    console.log(`✅ 웹: ${participant.name} 시간 슬롯 저장 성공`);
                })
                .catch((error) => {
                    console.error(`❌ 웹: 시간 슬롯 저장 실패:`, error);
                });
        }
        
        // 날짜 범위도 저장
        if (this.scheduleData.dateRange.start && this.scheduleData.dateRange.end) {
            const startDate = new Date(this.scheduleData.dateRange.start);
            const endDate = new Date(this.scheduleData.dateRange.end);
            const dateRangeData = {
                start: startDate.getTime(),
                end: endDate.getTime()
            };
            console.log('🔥 웹: 저장할 날짜 범위:', dateRangeData);
            sessionRef.child('dateRange').set(dateRangeData)
                .then(() => {
                    console.log('✅ 웹: 날짜 범위 저장 성공');
                })
                .catch((error) => {
                    console.error('❌ 웹: 날짜 범위 저장 실패:', error);
                });
        }
        
        // 통합 결과 생성 (iOS 호환) - 저장 완료 후 실행
        setTimeout(() => {
            this.updateAggregatedTimeSlotsFromWeb();
        }, 500);
    }

    // 기존 localStorage 방식 (대체 수단)
    saveDataToStorage() {
        const dataToSave = {
            shareId: this.shareId,
            scheduleData: this.scheduleData,
            currentUser: this.currentUser
        };
        localStorage.setItem(`calendar_share_${this.shareId}`, JSON.stringify(dataToSave));
    }

    // Firebase에서 데이터 로드
    loadDataFromFirebase() {
        if (typeof database === 'undefined') {
            console.warn('파이어베이스가 아직 로드되지 않았습니다. localStorage를 사용합니다.');
            this.loadDataFromStorage();
            return;
        }

        const sessionRef = database.ref(`sessions/${this.shareId}`);
        
        // iOS 앱과 동일한 구조로 데이터 로드
        sessionRef.once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    console.log('✅ 웹: Firebase에서 세션 데이터 로드 성공:', data);
                    
                    // 참여자 데이터 로드
                    if (data.participants) {
                        this.scheduleData.participants = Object.values(data.participants);
                        this.updateParticipantsList();
                    }
                    
                    // 날짜 범위 로드
                    if (data.dateRange) {
                        const startDate = new Date(data.dateRange.start);
                        const endDate = new Date(data.dateRange.end);
                        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
                        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
                        this.scheduleData.dateRange.start = startDate.toISOString().split('T')[0];
                        this.scheduleData.dateRange.end = endDate.toISOString().split('T')[0];
                        this.generateTimeGrid();
                    }
                    
                    // 시간 슬롯 데이터 로드 (aggregatedTimeSlots 사용)
                    if (data.aggregatedTimeSlots) {
                        this.scheduleData.timeSlots = data.aggregatedTimeSlots;
                        this.updateTimeGridFromData();
                    }
                    
                    console.log('✅ 웹: Firebase에서 데이터 로드 성공');
                } else {
                    console.log('❌ 웹: 세션 데이터가 없습니다. 세션 ID:', this.shareId);
                }
            })
            .catch((error) => {
                console.error('파이어베이스 로드 오류:', error);
                this.loadDataFromStorage(); // 대체 수단으로 localStorage 사용
            });
    }

    // 실시간 참여자 데이터 감지
    setupRealtimeListeners() {
        if (typeof database === 'undefined') {
            return;
        }
        
        console.log('🔄 웹: 실시간 리스너 설정 시작, 세션 ID:', this.shareId);

        const sessionRef = database.ref(`sessions/${this.shareId}`);
        
        // 참여자 목록 실시간 감지
        sessionRef.child('participants').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const participants = snapshot.val();
                this.scheduleData.participants = Object.values(participants);
                this.updateParticipantsList();
                console.log('참여자 목록 업데이트:', this.scheduleData.participants);
            }
        });
        
        // 통합된 시간 슬롯 데이터 실시간 감지
        sessionRef.child('aggregatedTimeSlots').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const timeSlots = snapshot.val();
                this.scheduleData.timeSlots = timeSlots;
                this.updateTimeGridFromData();
                console.log('시간 슬롯 업데이트:', timeSlots);
                
                // 만약 3단계에 있다면 결과 업데이트
                if (this.currentStep === 3) {
                    this.calculateBestTimes();
                    this.generateHeatmap();
                }
            }
        });
        
        // 날짜 범위 실시간 감지
        sessionRef.child('dateRange').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const dateRange = snapshot.val();
                const startDate = new Date(dateRange.start);
                const endDate = new Date(dateRange.end);
                
                document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
                document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
                this.scheduleData.dateRange.start = startDate.toISOString().split('T')[0];
                this.scheduleData.dateRange.end = endDate.toISOString().split('T')[0];
                this.generateTimeGrid();
                console.log('날짜 범위 업데이트:', dateRange);
            }
        });
        
        console.log('실시간 리스너 설정 완료 (iOS 호환)');
    }

    // 웹에서 통합 결과 생성 (iOS 호환)
    updateAggregatedTimeSlotsFromWeb() {
        if (typeof database === 'undefined') {
            return;
        }

        const sessionRef = database.ref(`sessions/${this.shareId}`);
        
        // 모든 사용자의 timeSlots 데이터를 가져와서 통합 (iOS와 동일한 로직)
        sessionRef.child('timeSlots').once('value')
            .then((snapshot) => {
                const aggregatedSlots = {};
                
                if (snapshot.exists()) {
                    const usersData = snapshot.val();
                    console.log('🔥 웹: 사용자별 timeSlots 데이터:', usersData);
                    
                    // 각 사용자의 데이터를 통합
                    for (const [userId, userData] of Object.entries(usersData)) {
                        console.log(`🔥 웹: 사용자 ${userId} 데이터 처리:`, userData);
                        
                        for (const [dateKey, daySlots] of Object.entries(userData)) {
                            if (!aggregatedSlots[dateKey]) {
                                aggregatedSlots[dateKey] = {};
                            }
                            
                            for (const [hour, status] of Object.entries(daySlots)) {
                                // 하나라도 unavailable이면 전체를 unavailable로 설정
                                if (status === 'unavailable') {
                                    aggregatedSlots[dateKey][hour] = 'unavailable';
                                } else if (!aggregatedSlots[dateKey][hour]) {
                                    aggregatedSlots[dateKey][hour] = 'available';
                                }
                            }
                        }
                    }
                }
                
                console.log('🔥 웹: 생성된 aggregatedTimeSlots:', aggregatedSlots);
                
                // Firebase에 저장
                return sessionRef.child('aggregatedTimeSlots').set(aggregatedSlots);
            })
            .then(() => {
                console.log('✅ 웹: aggregatedTimeSlots 저장 성공');
            })
            .catch((error) => {
                console.error('❌ 웹: aggregatedTimeSlots 생성/저장 실패:', error);
            });
    }

    // Firebase에서 받은 시간 슬롯 데이터로 UI 업데이트
    updateTimeGridFromData() {
        const timeGrid = document.getElementById('timeGrid');
        if (!timeGrid || !this.scheduleData.timeSlots) return;

        // 모든 시간 슬롯 버튼을 찾아서 상태 업데이트
        const timeSlots = timeGrid.querySelectorAll('.time-slot');
        timeSlots.forEach(slot => {
            const date = slot.dataset.date;
            const hour = slot.dataset.hour;
            
            // Firebase 데이터에서 해당 시간 슬롯 상태 확인
            if (this.scheduleData.timeSlots[date] && this.scheduleData.timeSlots[date][hour]) {
                const status = this.scheduleData.timeSlots[date][hour];
                if (status === 'unavailable') {
                    slot.classList.add('unavailable');
                } else {
                    slot.classList.remove('unavailable');
                }
            } else {
                slot.classList.remove('unavailable');
            }
        });
        
        console.log('시간 그리드 UI 업데이트 완료');
    }

    // 기존 localStorage 방식 (대체 수단)
    loadDataFromStorage() {
        const saved = localStorage.getItem(`calendar_share_${this.shareId}`);
        if (saved) {
            const data = JSON.parse(saved);
            this.scheduleData = data.scheduleData || this.scheduleData;
            this.currentUser = data.currentUser;
        }
    }

    checkShareUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share');
        const sessionId = urlParams.get('session'); // iOS 앱에서 사용하는 parameter
        
        if (sessionId) {
            console.log('🔗 웹: URL에서 session 파라미터 발견:', sessionId);
            this.shareId = sessionId;
            this.loadSharedData();
        } else if (shareId) {
            console.log('🔗 웹: URL에서 share 파라미터 발견:', shareId);
            this.shareId = shareId;
            this.loadSharedData();
        } else {
            console.log('🔗 웹: URL에 공유 파라미터 없음, 새 세션 생성');
        }
    }

    loadSharedData() {
        // Firebase에서 공유된 데이터 로드
        if (typeof database !== 'undefined') {
            const sessionRef = database.ref(`sessions/${this.shareId}`);
            
            console.log('🔗 웹: 공유 데이터 로드 시작, 세션 ID:', this.shareId);
            
            sessionRef.once('value')
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        console.log('🔗 웹: 공유 세션 데이터 로드 성공:', data);
                        
                        // 기본 세션 데이터 로드
                        if (data.scheduleData) {
                            this.scheduleData.dateRange = data.scheduleData.dateRange || this.scheduleData.dateRange;
                        }
                        
                        // 참여자 데이터 로드 (iOS 앱 구조에 맞게)
                        if (data.participants) {
                            this.scheduleData.participants = Object.values(data.participants);
                            console.log('🔗 웹: 참여자 데이터 로드:', this.scheduleData.participants.length + '명');
                        }
                        
                        // 날짜 범위 로드 (iOS 앱 구조에 맞게)
                        if (data.dateRange) {
                            const startDate = new Date(data.dateRange.start);
                            const endDate = new Date(data.dateRange.end);
                            this.scheduleData.dateRange.start = startDate.toISOString().split('T')[0];
                            this.scheduleData.dateRange.end = endDate.toISOString().split('T')[0];
                            console.log('🔗 웹: 날짜 범위 로드:', this.scheduleData.dateRange);
                        }
                        
                        // aggregatedTimeSlots 로드 (iOS 앱에서 생성한 것)
                        if (data.aggregatedTimeSlots) {
                            this.scheduleData.timeSlots = data.aggregatedTimeSlots;
                            console.log('🔗 웹: aggregatedTimeSlots 로드:', Object.keys(data.aggregatedTimeSlots).length + '일');
                        }
                        
                        // UI 업데이트
                        if (this.scheduleData.participants.length > 0) {
                            this.showStep(2);
                            this.updateParticipantsList();
                            this.generateShareLink();
                        }
                        
                        // 날짜 범위가 있으면 그리드 재생성
                        if (this.scheduleData.dateRange.start && this.scheduleData.dateRange.end) {
                            document.getElementById('startDate').value = this.scheduleData.dateRange.start;
                            document.getElementById('endDate').value = this.scheduleData.dateRange.end;
                            this.generateTimeGrid();
                            this.updateTimeGridFromData(); // 로드한 데이터로 UI 업데이트
                        }
                        
                        console.log('🔗 웹: 공유 데이터 로드 완료');
                    } else {
                        console.log('🔗 웹: 공유 세션 데이터 없음, 세션 ID:', this.shareId);
                    }
                })
                .catch((error) => {
                    console.error('🔗 웹: 공유 데이터 로드 오류:', error);
                    // 대체 수단으로 localStorage 사용
                    this.loadSharedDataFromStorage();
                });
        } else {
            // Firebase 없으면 localStorage 사용
            this.loadSharedDataFromStorage();
        }
    }

    // localStorage 대체 방법
    loadSharedDataFromStorage() {
        const saved = localStorage.getItem(`calendar_share_${this.shareId}`);
        if (saved) {
            const data = JSON.parse(saved);
            this.scheduleData = data.scheduleData || this.scheduleData;
            
            if (this.scheduleData.participants.length > 0) {
                this.showStep(2);
                this.updateParticipantsList();
                this.generateShareLink();
            }
        }
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    new CalendarScheduler();
});