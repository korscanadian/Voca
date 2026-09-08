// script.js

// --- 데이터 로드 및 초기화 ---
let wordStars = JSON.parse(localStorage.getItem('wordStars')) || {}; 
let currentStudyIndex = parseInt(localStorage.getItem('currentStudyIndex')) || 0;

// 단어 DB 검증 및 범위 설정
if (currentStudyIndex >= WORD_DATABASE.length) {
  currentStudyIndex = 0;
}

// --- 전역 테스트 상태 관리 ---
let todayTestWords = []; // 오늘 시험 볼 20개 단어 객체 리스트
let testCurrentIdx = 0;   // 현재 진행 중인 시험 단어 index
let isShowingMeaning = false; // 플래시 카드 상태 (단어 vs 뜻)
let wrongWordsSet = new Set(); // 틀린 단어 ID 보관용 집합

// --- 날짜 체크 기능 (일 단위로 시험 20개 유지) ---
function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 탭 전환 시스템
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

  if (tabName === 'study') {
    document.getElementById('study-tab').classList.add('active');
    document.getElementById('tab-study-btn').classList.add('active');
    loadStudyWord();
  } else if (tabName === 'test') {
    document.getElementById('test-tab').classList.add('active');
    document.getElementById('tab-test-btn').classList.add('active');
    initTestView();
  }
}

// ==========================================
// 01. 단어 외우기 기능
// ==========================================
function loadStudyWord() {
  if (WORD_DATABASE.length === 0) return;
  
  const currentWord = WORD_DATABASE[currentStudyIndex];
  
  // HTML 바인딩
  document.getElementById('study-word').innerText = currentWord.word;
  document.getElementById('study-meaning').innerText = currentWord.definition;
  document.getElementById('study-progress').innerText = `${currentStudyIndex + 1} / ${WORD_DATABASE.length}`;
  
  // 별표(오답수) 반영
  const stars = wordStars[currentWord.id] || 0;
  document.getElementById('study-star-count').innerText = stars;
  
  // 로컬 저장소 업데이트
  localStorage.setItem('currentStudyIndex', currentStudyIndex);
}

function prevWord() {
  if (currentStudyIndex > 0) {
    currentStudyIndex--;
    loadStudyWord();
  }
}

function nextWord() {
  if (currentStudyIndex < WORD_DATABASE.length - 1) {
    currentStudyIndex++;
    loadStudyWord();
  }
}


// ==========================================
// 02. 단어 시험 기능
// ==========================================

// 시험 화면 진입 시 초기화
function initTestView() {
  const todayStr = getTodayDateString();
  const savedTestData = JSON.parse(localStorage.getItem('dailyTestData'));

  // 로컬 스토리지에 저장된 일일 단어 정보가 오늘 날짜와 다를 경우 새로 뽑음
  if (!savedTestData || savedTestData.date !== todayStr) {
    generateDailyWords(todayStr);
  } else {
    // 이미 오늘 날짜의 세트가 있다면 가져옴
    todayTestWords = savedTestData.wordIds.map(id => {
      return WORD_DATABASE.find(item => item.id === id);
    }).filter(item => item !== undefined); // 데이터 누락 방지

    // 데이터 베이스 변경 등으로 20개 충족을 못 했을 경우 강제 재추출
    if (todayTestWords.length < Math.min(20, WORD_DATABASE.length)) {
      generateDailyWords(todayStr);
    }
  }

  showSubView('test-intro');
}

// 무작위로 오늘 볼 단어 20개 골라 저장
function generateDailyWords(dateString) {
  const shuffled = [...WORD_DATABASE].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(20, WORD_DATABASE.length));
  
  todayTestWords = selected;

  const testInfoToSave = {
    date: dateString,
    wordIds: selected.map(w => w.id)
  };
  localStorage.setItem('dailyTestData', JSON.stringify(testInfoToSave));
}

// 서브 뷰 제어 (대기 -> 진행 -> 결과)
function showSubView(viewId) {
  document.querySelectorAll('.test-sub-view').forEach(view => {
    view.classList.remove('active');
  });
  document.getElementById(viewId).classList.add('active');
}

// 시험 시작 버튼 이벤트
function startTest() {
  testCurrentIdx = 0;
  isShowingMeaning = false;
  wrongWordsSet.clear();
  showSubView('test-play');
  renderTestCard();
}

// 시험 카드 렌더링
function renderTestCard() {
  if (testCurrentIdx >= todayTestWords.length) {
    finishTestAndGoToResults();
    return;
  }

  const currentItem = todayTestWords[testCurrentIdx];
  const progressText = `${testCurrentIdx + 1} / ${todayTestWords.length}`;
  document.getElementById('test-card-index').innerText = progressText;

  if (!isShowingMeaning) {
    // 단어 보여주기 단계
    document.getElementById('test-card-text').innerText = currentItem.word;
    document.getElementById('test-card-tip').innerText = "생각해 본 후, 화면을 클릭하여 정답을 확인하세요.";
  } else {
    // 뜻 보여주기 단계
    document.getElementById('test-card-text').innerText = currentItem.definition;
    document.getElementById('test-card-tip').innerText = "확인 후, 화면을 클릭하면 다음 단어로 넘어갑니다.";
  }
}

// 시험 카드 클릭 토글 로직
function toggleTestCard() {
  if (!isShowingMeaning) {
    // 뜻을 보여주는 상태로 변환
    isShowingMeaning = true;
    renderTestCard();
  } else {
    // 다음 단어로 진행
    isShowingMeaning = false;
    testCurrentIdx++;
    renderTestCard();
  }
}

// 20개 시험이 끝나고 결과 취합 화면으로 이동
function finishTestAndGoToResults() {
  showSubView('test-result');
  const gridContainer = document.getElementById('test-result-grid');
  gridContainer.innerHTML = ''; // 초기화

  todayTestWords.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'word-item';
    itemEl.id = `result-word-${item.id}`;
    
    // 만약 실수로 눌렀을 때를 대비해 toggle 방식 구현
    itemEl.innerHTML = `
      <div class="eng">${item.word}</div>
      <div class="kor">${item.definition}</div>
    `;

    itemEl.addEventListener('click', () => {
      toggleWordMistake(item.id, itemEl);
    });

    gridContainer.appendChild(itemEl);
  });
}

// 틀린 단어 토글 함수 (번복 가능)
function toggleWordMistake(wordId, element) {
  if (wrongWordsSet.has(wordId)) {
    wrongWordsSet.delete(wordId);
    element.classList.remove('wrong');
  } else {
    wrongWordsSet.add(wordId);
    element.classList.add('wrong');
  }
}

// 결과 제출 및 별표 반영 저장
function saveTestResults() {
  // 틀렸다고 선택한 단어들의 기존 별 누적 수에 +1 추가
  wrongWordsSet.forEach(id => {
    wordStars[id] = (wordStars[id] || 0) + 1;
  });

  // 로컬 저장소에 반영
  localStorage.setItem('wordStars', JSON.stringify(wordStars));

  alert(`오답 체크가 완료되었습니다.\n선택하신 ${wrongWordsSet.size}개 단어의 별표가 증가했습니다!`);

  // 첫 화면(단어외우기)으로 돌아가며 업데이트
  switchTab('study');
}

// 앱 구동 시 초기 로딩
window.onload = () => {
  loadStudyWord();
};
