// --- 🔊 効果音自動生成システム (Web Audio API) ---
let audioCtx = null;
let drumRollTimer = null; // ドラムロールのタイマー

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// ドラム（スネア・タム）を意識した、低音アタックのある1拍の音
function playSingleDrumHit() {
  initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  // 太さのある三角波（triangle）を採用
  osc.type = 'triangle'; 
  
  // ドラムロールの緊迫感を出す低めのピッチ
  osc.frequency.setValueAtTime(130, audioCtx.currentTime); 
  osc.frequency.linearRampToValueAtTime(70, audioCtx.currentTime + 0.04);

  // 連続して「ドドドド…」と聞こえるような音量と残響コントロール
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime); 
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.06);
}

// 1. 回転中一律で鳴り響く「ドドドドド…」を開始する関数
function startJarajaraLoop() {
  initAudio();
  if (drumRollTimer) return; // 二重発火防止

  // 疾走感のあるドラムロールのテンポ（55ミリ秒間隔）で等速ループ
  drumRollTimer = setInterval(() => {
    playSingleDrumHit();
  }, 55);
}

// 2. ドラムロールを完全に止める（鳴りやませる）関数
function stopJarajaraLoop() {
  if (drumRollTimer) {
    clearInterval(drumRollTimer);
    drumRollTimer = null;
  }
}

// 3. 当選時の「ばーーん！！」という大迫力・重厚クラッシュシンバル
function playBanSound() {
  initAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  
  // 1️⃣ シンバルの高周波（ホワイトノイズ）
  const bufferSize = audioCtx.sampleRate * 2.0; // 余韻を長めの2秒に
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass'; // 鋭い金属感を残しつつ、少し中音にも厚みを出す
  filter.frequency.setValueAtTime(2500, now); 
  filter.Q.setValueAtTime(1.5, now);

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.35, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

  // 2️⃣ 重厚感を出すための「ドォーーーン」というオーケストラ大太鼓（低音成分）
  const bassOsc1 = audioCtx.createOscillator();
  const bassGain1 = audioCtx.createGain();
  bassOsc1.type = 'triangle';
  bassOsc1.frequency.setValueAtTime(55, now); // 地響きのような超低音 (A1)
  bassOsc1.frequency.linearRampToValueAtTime(30, now + 0.3);
  bassGain1.gain.setValueAtTime(0.4, now); // 低音を太く主張
  bassGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

  // 3️⃣ シンバル自体の金属板のうねりを表現する「ブォン」という中低音成分
  const bassOsc2 = audioCtx.createOscillator();
  const bassGain2 = audioCtx.createGain();
  bassOsc2.type = 'sawtooth';
  bassOsc2.frequency.setValueAtTime(110, now); // 中低音 (A2)
  bassOsc2.frequency.linearRampToValueAtTime(80, now + 0.4);
  
  const lowPass = audioCtx.createBiquadFilter();
  lowPass.type = 'lowpass';
  lowPass.frequency.setValueAtTime(300, now);

  bassGain2.gain.setValueAtTime(0.15, now);
  bassGain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2); // 中音域の余韻を長く

  // スピーカーへの接続
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);

  bassOsc1.connect(bassGain1);
  bassGain1.connect(audioCtx.destination);

  bassOsc2.connect(lowPass);
  lowPass.connect(bassGain2);
  bassGain2.connect(audioCtx.destination);

  // 同時爆音再生
  noise.start(now);
  noise.stop(now + 2.0);
  bassOsc1.start(now);
  bassOsc1.stop(now + 0.9);
  bassOsc2.start(now);
  bassOsc2.stop(now + 1.3);
}

// ==========================================
// 🎰 新設：パチスロ確定演出用サウンドシステム
// ==========================================

// 4. 1回目のスタート時のパチスロ一発告知音「キュインインインイン！！」
function playKyuinEffectSound() {
  initAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const duration = 1.2; // 音が鳴る長さ（秒）
  const steps = 14;     // 「キュイン！」を繰り返す回数
  const interval = duration / steps;

  for (let i = 0; i < steps; i++) {
    const startTime = now + (i * interval);
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    
    // パチスロ特有の下から上に「キュイン！」と駆け上がる超高速ピッチ変更
    osc.frequency.setValueAtTime(900, startTime);
    osc.frequency.exponentialRampToValueAtTime(2200, startTime + interval * 0.8);
    
    // 一つ一つのアタック音をハッキリさせる
    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + interval * 0.9);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + interval);
  }

  // 最後のキュインの後にダメ押しの超高音「ピコーン！」を少し残響長めで鳴らす
  setTimeout(() => {
    const endNow = audioCtx.currentTime;
    const finalOsc = audioCtx.createOscillator();
    const finalGain = audioCtx.createGain();
    finalOsc.type = 'sine';
    finalOsc.frequency.setValueAtTime(2500, endNow);
    finalGain.gain.setValueAtTime(0.3, endNow);
    finalGain.gain.exponentialRampToValueAtTime(0.001, endNow + 0.5);
    finalOsc.connect(finalGain);
    finalGain.connect(audioCtx.destination);
    finalOsc.start(endNow);
    finalOsc.stop(endNow + 0.5);
  }, duration * 1000);
}

// 5. 仕込み当選してルーレットが完全停止した時のド派手ファンファーレ
function playPachislotWinFanfare() {
  initAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  
  // 既存のドォーーン（playBanSound）をベースに呼び出し
  playBanSound();

  // パチスロ特有のピコピコファンファーレのメロディ（ドミソドミソドーー！）
  const melody = [
    { note: 523.25, duration: 0.12 }, // C5
    { note: 659.25, duration: 0.12 }, // E5
    { note: 783.99, duration: 0.12 }, // G5
    { note: 523.25, duration: 0.12 }, // C5
    { note: 659.25, duration: 0.12 }, // E5
    { note: 783.99, duration: 0.12 }, // G5
    { note: 1046.50, duration: 0.6 }  // C6 (最後のキメのロングトーン)
  ];

  let currentMelodyTime = now + 0.1; // シンバルアタックの直後から開始

  melody.forEach((item) => {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator(); // 厚みを出すために2重に重ねる
    const gain = audioCtx.createGain();

    osc1.type = 'sawtooth'; // ピコピコ感
    osc1.frequency.setValueAtTime(item.note, currentMelodyTime);

    osc2.type = 'square';   // 矩形波を少しだけデチューン（音程ずらし）して太さを出す
    osc2.frequency.setValueAtTime(item.note + 4, currentMelodyTime);

    gain.gain.setValueAtTime(0.12, currentMelodyTime);
    gain.gain.exponentialRampToValueAtTime(0.001, currentMelodyTime + item.duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start(currentMelodyTime);
    osc1.stop(currentMelodyTime + item.duration);
    osc2.start(currentMelodyTime);
    osc2.stop(currentMelodyTime + item.duration);

    currentMelodyTime += item.duration - 0.02; // 音を滑らかに繋げる
  });
}