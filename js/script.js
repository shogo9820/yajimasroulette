const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const itemsContainer = document.getElementById('itemsContainer');
const addBtn = document.getElementById('addBtn');
const spinBtn = document.getElementById('spinBtn');
const stopBtn = document.getElementById('stopBtn');
const resultDiv = document.getElementById('result');
const appTitle = document.getElementById('appTitle');
const secretModal = document.getElementById('secretModal');
const secretSelect = document.getElementById('secretSelect');
const closeSecretBtn = document.getElementById('closeSecretBtn');

// 画面切り替えおよび新設機能要素
const setupView = document.getElementById('setupView');
const wheelView = document.getElementById('wheelView');
const generateBtn = document.getElementById('generateBtn');
const backBtn = document.getElementById('backBtn');
const purposeInput = document.getElementById('purposeInput');
const wheelTitleDisplay = document.getElementById('wheelTitleDisplay');
const templateSelect = document.getElementById('templateSelect');
const saveTemplateBtn = document.getElementById('saveTemplateBtn');
const deleteTemplateBtn = document.getElementById('deleteTemplateBtn');
const pachiActionBtn = document.getElementById('pachiActionBtn');

// 🎰 パチスロ演出用の要素（オープン設定ではなく、隠しモーダル内のパーツとして再紐付け）
const pachislotEffectOverlay = document.getElementById('pachislotEffect');
const shikomiProbabilityInput = document.getElementById('secretProbability');

// 🎰 コード内に完全固定しておいた「全く異なる特殊ルーレット」のデータ
const BONUS_ROULETTE_ITEMS = [
  { name: 'コナン', weight: 1.0 },
  { name: 'ドイツ', weight: 1.0 },
  { name: 'カエルケンタウロス', weight: 1.0 },
  { name: '干支', weight: 1.0 },
  { name: '大谷翔平', weight: 1.0 },
  { name: 'ちんぴら', weight: 1.0 },
  { name: 'なで肩', weight: 1.0 },
  { name: '蕎麦', weight: 1.0 },
  { name: 'ニキ', weight: 1.0 }
];

const COLORS = [
  '#728ee8', '#f0829c', '#f2a162', '#ebc149',
  '#5ec2a6', '#5fb8dc', '#a987e3', '#ea7878', '#83c474'
];

// データ管理変数
let itemsData = [];          // 通常時に回すデータ
let originalItemsData = [];  // 通常データを一時的に退避させておく箱
let currentAngle = 0;
let spinState = 'STOPPED';
let spinSpeed = 0.28;

let secretTarget = 'random'; // 通常ルーレットで狙い撃ちするターゲット
let shikomiProbability = 0;  // 特殊演出を発生させる確率 (0〜100)

let isPachislotTriggered = false;       // 🎰 パチスロ特殊演出が発動したか
let hasFinishedPachislotEffect = false;   // 🎰 演出が一度終わり、別ルーレットに切り替わった状態か
let titleTapCount = 0;
let titleTapTimer = null;

// --- 💾 テンプレート＆データ管理システム ---

function saveActiveState() {
  if (shikomiProbabilityInput) {
    shikomiProbability = parseFloat(shikomiProbabilityInput.value) || 0;
  }
  if (secretSelect) {
    secretTarget = secretSelect.value;
  }

  const state = {
    items: itemsData,
    originalItems: originalItemsData,
    target: secretTarget,
    shikomiProb: shikomiProbability,
    purpose: purposeInput.value,
    isPachislotTriggered: isPachislotTriggered,
    hasFinishedPachislotEffect: hasFinishedPachislotEffect
  };
  localStorage.setItem('roulette_active_state_integrated', JSON.stringify(state));
}

function loadActiveState() {
  const saved = localStorage.getItem('roulette_active_state_integrated');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      // 演出中にリロードされた場合は、退避させていた通常項目データを安全に戻す
      if (parsed.hasFinishedPachislotEffect && parsed.originalItems && parsed.originalItems.length > 0) {
        itemsData = parsed.originalItems;
        originalItemsData = [];
        isPachislotTriggered = false;
        hasFinishedPachislotEffect = false;
        if (spinBtn) spinBtn.textContent = 'スタート';
      } else {
        itemsData = parsed.items || [];
        originalItemsData = parsed.originalItems || [];
        isPachislotTriggered = parsed.isPachislotTriggered || false;
        hasFinishedPachislotEffect = parsed.hasFinishedPachislotEffect || false;
      }

      secretTarget = parsed.target || 'random';
      shikomiProbability = parsed.shikomiProb || 0;
      purposeInput.value = parsed.purpose || '';

      if (shikomiProbabilityInput) {
        shikomiProbabilityInput.value = shikomiProbability;
      }

      if (hasFinishedPachislotEffect && spinBtn) {
        spinBtn.textContent = 'もう一回スタート！';
      }
    } catch (e) {
      console.error(e);
    }
  }
}

function getStoredTemplates() {
  const stored = localStorage.getItem('roulette_templates_integrated');
  return stored ? JSON.parse(stored) : {};
}

function updateTemplateList() {
  const templates = getStoredTemplates();
  templateSelect.innerHTML = '<option value="">-- 保存されたテンプレート --</option>';
  Object.keys(templates).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    templateSelect.appendChild(opt);
  });
}

// --- 🎡 ルーレット基本ロジック ---

function setupCanvas() {
  if (!wheelView.classList.contains('active')) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  drawWheel();
}

function renderInputs() {
  itemsContainer.innerHTML = '';
  itemsData.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    const dotColor = COLORS[index % COLORS.length];
    row.innerHTML = `
      <span class="item-color-dot" style="background-color: ${dotColor};"></span>
      <input type="text" value="${item.name}" placeholder="項目名" data-index="${index}" class="input-name">
      <input type="number" value="${item.weight}" min="0.1" step="0.1" placeholder="幅" data-index="${index}" class="input-weight">
      <button class="btn-del" data-index="${index}" aria-label="削除">✕</button>
    `;
    itemsContainer.appendChild(row);
  });
  updateSecretSelectOptions();
}

function updateSecretSelectOptions() {
  secretSelect.innerHTML = '<option value="random">【通常】仕込みなし</option>';
  itemsData.forEach((item, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `[${index + 1}] ${item.name || '（未入力）'}`;
    secretSelect.appendChild(option);
  });
  if ([...secretSelect.options].some(opt => opt.value === secretTarget.toString())) {
    secretSelect.value = secretTarget;
  } else {
    secretSelect.value = 'random';
    secretTarget = 'random';
  }
}

function getTotalWeight() {
  return itemsData.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0);
}

function drawWheel() {
  const rect = canvas.getBoundingClientRect();
  const radius = rect.width / 2;
  const cx = radius;
  const cy = radius;
  const totalWeight = getTotalWeight();

  ctx.clearRect(0, 0, rect.width, rect.height);
  if (itemsData.length === 0 || totalWeight === 0) return;

  let startAngle = currentAngle;
  itemsData.forEach((item, i) => {
    const weight = parseFloat(item.weight) || 0;
    const arcSize = (weight / totalWeight) * (2 * Math.PI);
    const endAngle = startAngle + arcSize;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    if (arcSize > 0.08) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 14px "Zen Maru Gothic", "Hiragino Maru Gothic ProN", sans-serif';
      ctx.shadowColor = 'rgba(45, 40, 65, 0.25)';
      ctx.shadowBlur = 4;
      let text = item.name;
      if (text.length > 8) text = text.substring(0, 7) + '…';
      ctx.fillText(text, radius - 16, 5);
      ctx.restore();
    }
    startAngle = endAngle;
  });

  const hubRadius = Math.max(18, radius * 0.13);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, hubRadius, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(60, 55, 85, 0.18)';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, hubRadius * 0.36, 0, 2 * Math.PI);
  ctx.fillStyle = '#e5e2f2';
  ctx.fill();
}

function getAngleRangeForItem(targetIndex) {
  const totalWeight = getTotalWeight();
  let accumulatedAngle = 0;
  for (let i = 0; i < targetIndex; i++) {
    accumulatedAngle += ((parseFloat(itemsData[i].weight) || 0) / totalWeight) * (2 * Math.PI);
  }
  const targetArcSize = ((parseFloat(itemsData[targetIndex].weight) || 0) / totalWeight) * (2 * Math.PI);
  return { start: accumulatedAngle, end: accumulatedAngle + targetArcSize, size: targetArcSize };
}

function getCurrentPointerIndex() {
  const totalWeight = getTotalWeight();
  let normalized = (1.5 * Math.PI - (currentAngle % (2 * Math.PI))) % (2 * Math.PI);
  if (normalized < 0) normalized += 2 * Math.PI;
  let accumulated = 0;
  for (let i = 0; i < itemsData.length; i++) {
    const arcSize = ((parseFloat(itemsData[i].weight) || 0) / totalWeight) * (2 * Math.PI);
    if (normalized >= accumulated && normalized < accumulated + arcSize) return i;
    accumulated += arcSize;
  }
  return 0;
}

// --- 🎮 コントロール＆アニメーション ---

function startSpin() {
  if (spinState !== 'STOPPED' || itemsData.length === 0) return;
  initAudio();

  // 🎰 1回目のスタートかつ確率が設定されている場合、裏で特殊演出への突入抽選を行う
  if (!hasFinishedPachislotEffect && shikomiProbability > 0) {
    const rand = Math.random() * 100;
    if (rand < shikomiProbability) {
      isPachislotTriggered = true;
    }
  }

  // 🎰 特殊演出ルーレット（パチスロ風フリーズ）が引き当てられた瞬間の挙動
  if (isPachislotTriggered && !hasFinishedPachislotEffect) {
    spinBtn.disabled = true;
    stopBtn.disabled = true;
    backBtn.disabled = true;
    resultDiv.textContent = '';

    if (typeof playKyuinEffectSound === 'function') {
      playKyuinEffectSound();
    }

    if (pachislotEffectOverlay) {
      pachislotEffectOverlay.classList.add('active');
    }

    // 🎰 3秒間の告知演出が終わったら、2回目のスタート待機状態にするタイマー処理
    setTimeout(() => {
      if (pachislotEffectOverlay) {
        pachislotEffectOverlay.classList.remove('active');
      }
      
      originalItemsData = JSON.parse(JSON.stringify(itemsData));
      itemsData = JSON.parse(JSON.stringify(BONUS_ROULETTE_ITEMS));

      currentAngle = 0;
      drawWheel();
      
      hasFinishedPachislotEffect = true;
      
      // 🎰【上書き・追記】通常のスタート・ストップボタンは完全に隠す！
      spinBtn.style.display = 'none';
      stopBtn.style.display = 'none';
      
      // 🎰【上書き・追記】パチスロ専用ボタンを「押せっ！」の状態で大降臨させる！
      if (pachiActionBtn) {
        pachiActionBtn.style.display = 'block';
        pachiActionBtn.textContent = '押せっ！';
        pachiActionBtn.classList.remove('stop-mode');
        pachiActionBtn.disabled = false;
      }
      
      // 🎰【上書き・追記】戻るボタンは有効（下は戻るボタンだけにする仕様）
      backBtn.disabled = false; 

      // 🎰【上書き・追記】画面全体をギラギラにするクラスを足す
      document.querySelector('.app-container').classList.add('rainbow-flash');
      
      wheelTitleDisplay.textContent = '🎰 やじま一発ギャグルーレット 🎰';
      resultDiv.textContent = '運命のボタンをぶち叩け！！！';
      saveActiveState();
    }, 4000);
    return; // 🛑 通常のルーレットが回ってしまう処理を完全に遮断！
  }

  // 通常時、または別ルーレット出現後の「2回目スタート時」の通常回転処理
  startJarajaraLoop();
  spinState = 'SPINNING';
  spinBtn.disabled = true;
  stopBtn.disabled = false;
  backBtn.disabled = true;
  resultDiv.textContent = '';

  function loop() {
    if (spinState === 'SPINNING') {
      currentAngle += spinSpeed;
      drawWheel();
      requestAnimationFrame(loop);
    }
  }
  loop();
}
function stopSpin() {
  if (spinState !== 'SPINNING') return;
  spinState = 'SLOWING';
  stopBtn.disabled = true;

  // 🎯 ターゲット判定の分岐
  let targetIndex;
  if (hasFinishedPachislotEffect) {
    // 2回目に回したコード固定の特殊ボーナス盤面は、完全ガチ（ランダム）で着地させる
    targetIndex = getCurrentPointerIndex();
  } else {
    // 通常の盤面の時は、設定したターゲットがあればそこを狙い撃ち、なければランダム
    targetIndex = secretTarget === 'random' ? getCurrentPointerIndex() : parseInt(secretTarget, 10);
  }

  if (targetIndex >= itemsData.length || targetIndex < 0) targetIndex = getCurrentPointerIndex();

  const range = getAngleRangeForItem(targetIndex);
  const offsetInArc = (Math.random() * 0.8 + 0.1) * range.size;
  const targetAngleInWheel = range.start + offsetInArc;
  const destinationAngle = (1.5 * Math.PI) - targetAngleInWheel;
  const extraRotations = 3 * 2 * Math.PI;

  let distance = destinationAngle - (currentAngle % (2 * Math.PI));
  if (distance < 0) distance += 2 * Math.PI;

  const totalRotation = distance + extraRotations;
  const startAngle = currentAngle;
  const startTime = performance.now();
  const duration = 2500;

  setTimeout(() => { stopJarajaraLoop(); }, duration - 800);

  function animateSlowdown(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    currentAngle = startAngle + totalRotation * (1 - Math.pow(1 - progress, 3));
    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(animateSlowdown);
    } else {
      spinState = 'STOPPED';
      spinBtn.disabled = false;
      
      // 🛑 完全に停止したので、「戻る」ボタンを100%活性化して確実に押せるようにする
      backBtn.disabled = false; 

      const finalIndex = getCurrentPointerIndex();
      resultDiv.textContent = `${itemsData[finalIndex].name}`;

      // 🎰 仕込み演出（2回目）経由での完全停止なら脳汁ファンファーレ、通常ならいつもの音
      if (hasFinishedPachislotEffect) {
        if (typeof playPachislotWinFanfare === 'function') playPachislotWinFanfare();
      } else {
        if (typeof playBanSound === 'function') playBanSound();
      }

      // 🎰 特殊ルーレットが完全に止まったので、赤丸ボタン（止めろっ！）は完全に非表示にする
      if (pachiActionBtn) {
        pachiActionBtn.style.display = 'none';
      }
      
      // 🎰 通常のスタート・ストップボタンは、まだここでは表示させずに隠したままにする
      spinBtn.style.display = 'none';
      stopBtn.style.display = 'none';

      // 🎰【バグ修正】ここではまだギラギラ背景クラス（.rainbow-flash）を外さない！
      // 背景をギラギラさせたままにすることで、CSSのルールが効き続け、戻るボタンが画面真ん中下に残り続けます！
      // document.querySelector('.app-container').classList.remove('rainbow-flash'); ➔ 🛑 ココを削除しました

      saveActiveState();
    }
  }
  requestAnimationFrame(animateSlowdown);
}


// --- ⚙️ イベントリスナーと初期化 ---

generateBtn.addEventListener('click', () => {
  if (itemsData.length === 0 || getTotalWeight() === 0) {
    alert('項目を1つ以上追加してください。');
    return;
  }
  setupView.classList.remove('active');
  wheelView.classList.add('active');
  wheelTitleDisplay.textContent = purposeInput.value ? `【 ${purposeInput.value} 】` : '';

  // 🎰 画面を移動する【直前】に隠しモーダルの入力欄から最新確率を確実に読み込む
  if (shikomiProbabilityInput) {
    shikomiProbability = parseFloat(shikomiProbabilityInput.value) || 0;
  }

  // 🎰 盤面移動時はすべての演出フラグとボタン状態を完全に初期化する
  spinState = 'STOPPED';
  isPachislotTriggered = false;
  hasFinishedPachislotEffect = false;
  spinBtn.textContent = 'スタート';
  spinBtn.disabled = false;
  stopBtn.disabled = true;
  backBtn.disabled = false; // 戻るボタンを確実に活性化
  resultDiv.textContent = '';

  setupCanvas();
});

backBtn.addEventListener('click', () => {
  if (spinState !== 'STOPPED') return;
  
  // 🎰【仕様変更】特殊ルーレットから戻る時は、設定画面ではなく「通常ルーレット画面」に復元する
  if (hasFinishedPachislotEffect && originalItemsData.length > 0) {
    // 裏に退避させていた元のユーザー入力データ（通常ルーレット）をここで復元
    itemsData = JSON.parse(JSON.stringify(originalItemsData));
    originalItemsData = [];
    
    // 通常モードの元のタイトル文字に自動で書き戻す
    wheelTitleDisplay.textContent = purposeInput.value ? `【 ${purposeInput.value} 】` : 'なにが出るかな？';
    
    // 🎰 ギラギラ背景クラスを剥ぎ取って、いつもの白背景に戻す！
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
      appContainer.classList.remove('rainbow-flash');
    }

    // 🎰 特殊赤丸ボタンは非表示にし、通常の「スタート」「ストップ」ボタンを大復活させる！
    if (pachiActionBtn) {
      pachiActionBtn.style.display = 'none';
    }
    spinBtn.style.display = 'block';
    stopBtn.style.display = 'block';

    // 🎰 演出用の内部フラグをすべて通常状態にクリーンリセット
    isPachislotTriggered = false;
    hasFinishedPachislotEffect = false;
    spinBtn.textContent = 'スタート';
    spinBtn.disabled = false;
    stopBtn.disabled = true;
    backBtn.disabled = false;
    resultDiv.textContent = ''; // 前回の結果表示を消してすっきりさせる

    // 🎰 元の通常盤面をキャンバスに正しく描き直して、いつでも回せる状態にする！
    currentAngle = 0;
    setupCanvas();

    saveActiveState();
    
    return; // 🛑 ここで処理を終了させて、設定画面に引っ込むのを完全にブロック！
  }

  // ＝ 通常ルーレット画面の時に「戻る」を押した場合は、今まで通り「設定画面」へ戻る ＝
  wheelView.classList.remove('active');
  setupView.classList.add('active');
  
  isPachislotTriggered = false;
  hasFinishedPachislotEffect = false;
  spinBtn.textContent = 'スタート';
  renderInputs(); 
  setupCanvas();

  saveActiveState();
});

// 📁 テンプレート操作のイベント
saveTemplateBtn.addEventListener('click', () => {
  if (itemsData.length === 0) {
    alert('空のルーレットは保存できません。');
    return;
  }
  const name = prompt('テンプレートの名前を入力してください:');
  if (!name) return;

  const templates = getStoredTemplates();
  templates[name] = {
    // 演出表示中に保存されてもバグらないよう、退避側の通常項目を保存する
    items: hasFinishedPachislotEffect ? originalItemsData : itemsData,
    purpose: purposeInput.value,
    shikomiProb: shikomiProbability,
    target: secretTarget
  };
  localStorage.setItem('roulette_templates_integrated', JSON.stringify(templates));
  updateTemplateList();
  templateSelect.value = name;
  alert(`「${name}」を保存しました！`);
});

deleteTemplateBtn.addEventListener('click', () => {
  const name = templateSelect.value;
  if (!name) {
    alert('削除するテンプレートを選択してください。');
    return;
  }
  if (!confirm(`「${name}」を削除してもよろしいですか？`)) return;

  const templates = getStoredTemplates();
  delete templates[name];
  localStorage.setItem('roulette_templates_integrated', JSON.stringify(templates));
  updateTemplateList();

  // 🎰 初期リセット
  itemsData = [];
  originalItemsData = [];
  secretTarget = 'random';
  shikomiProbability = 0;
  purposeInput.value = '';
  if (shikomiProbabilityInput) {
    shikomiProbabilityInput.value = 0;
  }
  renderInputs();
  saveActiveState();
  alert('削除しました。');
});

templateSelect.addEventListener('change', () => {
  const name = templateSelect.value;
  if (!name) return;
  const templates = getStoredTemplates();
  if (templates[name]) {
    itemsData = templates[name].items || [];
    originalItemsData = [];
    purposeInput.value = templates[name].purpose || '';
    secretTarget = templates[name].target || 'random';
    shikomiProbability = templates[name].shikomiProb || 0;

    if (shikomiProbabilityInput) {
      shikomiProbabilityInput.value = shikomiProbability;
    }

    isPachislotTriggered = false;
    hasFinishedPachislotEffect = false;
    spinBtn.textContent = 'スタート';

    renderInputs();
    saveActiveState();
  }
});

// リアルタイムオートセーブ
purposeInput.addEventListener('input', saveActiveState);

itemsContainer.addEventListener('input', (e) => {
  const idx = parseInt(e.target.dataset.index, 10);
  if (e.target.classList.contains('input-name')) {
    itemsData[idx].name = e.target.value;
  } else if (e.target.classList.contains('input-weight')) {
    itemsData[idx].weight = parseFloat(e.target.value) || 0.1;
  }
  updateSecretSelectOptions();
  saveActiveState();
});

itemsContainer.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-del')) {
    itemsData.splice(parseInt(e.target.dataset.index, 10), 1);
    renderInputs();
    saveActiveState();
  }
});

addBtn.addEventListener('click', () => {
  itemsData.push({ name: `項目${itemsData.length + 1}`, weight: 1 });
  renderInputs();
  saveActiveState();
});

spinBtn.addEventListener('click', startSpin);
stopBtn.addEventListener('click', stopSpin);

// 隠し設定用タイトルタップロジック
appTitle.addEventListener('click', () => {
  titleTapCount++;
  clearTimeout(titleTapTimer);
  titleTapTimer = setTimeout(() => { titleTapCount = 0; }, 1500);

  if (titleTapCount >= 3) {
    titleTapCount = 0;
    updateSecretSelectOptions(); // 🎰 常にセレクトボックスを最新化
    secretModal.style.display = 'flex';
  }
});

closeSecretBtn.addEventListener('click', () => {
  secretTarget = secretSelect.value;
  // 🎰 決定ボタンが押されたタイミングで確率を強制取得
  if (shikomiProbabilityInput) {
    shikomiProbability = parseFloat(shikomiProbabilityInput.value) || 0;
  }
  secretModal.style.display = 'none';
  saveActiveState();
});

// 【検索ワード：spinBtn.addEventListener】この周辺に以下のイベントを丸ごと追記してや

// 🎰 【新規追記】パチスロ専用デカ丸ボタンのクリックイベント
if (pachiActionBtn) {
  pachiActionBtn.addEventListener('click', () => {
    if (spinState === 'STOPPED') {
      // 👉 「押せっ！」が押された時：回転をスタートさせて「止めろっ！」に切り替える
      startSpin(); 
      
      pachiActionBtn.textContent = '止めろっ！';
      pachiActionBtn.classList.add('stop-mode'); // ストップ用の色（青系）に変える
      backBtn.disabled = true; // 回っている最中は戻るボタンを押させない
      
    } else if (spinState === 'SPINNING') {
      // 👉 「止めろっ！」が押された時：ルーレットをストップさせる
      stopSpin();
      
      pachiActionBtn.disabled = true; // 連打防止のために完全に止まるまではボタンを無効化
    }
  });
}

// 🎰 【上書き・追記】generateBtn（ルーレットを作成する）を押した時の初期リセット
generateBtn.addEventListener('click', () => {
  if (itemsData.length === 0 || getTotalWeight() === 0) {
    alert('項目を1つ以上追加してください。');
    return;
  }
  setupView.classList.remove('active');
  wheelView.classList.add('active');
  wheelTitleDisplay.textContent = purposeInput.value ? `【 ${purposeInput.value} 】` : '';
  
  if (shikomiProbabilityInput) {
    shikomiProbability = parseFloat(shikomiProbabilityInput.value) || 0;
  }

  // 🎰 画面を新しく作成したときは、必ずデカ丸ボタンを隠して通常ボタンの表示に戻す
  if (pachiActionBtn) pachiActionBtn.style.display = 'none';
  spinBtn.style.display = 'block';
  stopBtn.style.display = 'block';

  spinState = 'STOPPED';
  isPachislotTriggered = false;
  hasFinishedPachislotEffect = false;
  spinBtn.textContent = 'スタート';
  spinBtn.disabled = false;
  stopBtn.disabled = true;
  backBtn.disabled = false;
  resultDiv.textContent = '';
  
  setupCanvas();
});

// スペースキー・数字ショートカット
window.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || !wheelView.classList.contains('active')) return;

  if (e.code === 'Space') {
    e.preventDefault();
    if (spinState === 'STOPPED') startSpin();
    else if (spinState === 'SPINNING') stopSpin();
    return;
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('SW success'))
      .catch((err) => console.error(err));
  });
}

window.addEventListener('resize', setupCanvas);

window.addEventListener('load', () => {
  const checkInput = document.getElementById('secretProbability');
  if (checkInput) {
    loadActiveState();
  } else {
    setTimeout(loadActiveState, 100);
  }
  updateTemplateList();
  renderInputs();
});

