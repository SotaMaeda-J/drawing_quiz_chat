// ======== 接続とチャット機能 ======== //
const socket = io();

const messages = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');
const tools = document.getElementById('tools'); // パレット＋ツール表示用
const gameControlDiv = document.createElement('div');
gameControlDiv.style.margin = '10px 0';
tools.parentNode.insertBefore(gameControlDiv, tools.nextSibling); // ツールの下に設置

// ニックネーム入力
let name = '';
while (!name) {
  name = prompt('ニックネームを入力してください（Enterで確定）')?.trim();
}
socket.emit('join', name);

// HTMLエスケープ
function escapeHTML(s) {
  return s.replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#039;');
}

// メッセージ追加
function addMessage(html) {
  const li = document.createElement('li');
  li.innerHTML = html;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;

  // 最大30行までに制限
  while (messages.children.length > 30) {
    messages.removeChild(messages.firstChild);
  }
}

// チャット送信
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value.trim() === '') return;
  socket.emit('chat message', input.value);
  input.value = '';
  input.focus();
});

// チャット受信
socket.on('chat message', (data) => {
  const t = new Date(data.time).toLocaleTimeString();
  addMessage(`<strong>${escapeHTML(data.name)}</strong> <small>${t}</small>: ${escapeHTML(data.msg)}`);
});

// システムメッセージ受信
socket.on('system message', (msg) => {
  addMessage(`<em>${escapeHTML(msg)}</em>`);
});

// Enter送信（Shift+Enterは改行）
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form.dispatchEvent(new Event('submit'));
  }
});

// ======== 描画機能 ======== //
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

let isDrawing = false;  // 現在マウス押下で描画中か
let isLocked = false;   // ゲームロック状態
let currentColor = 'black';
let selectedColor = currentColor;
let selectedSize = 2;

ctx.strokeStyle = currentColor;
ctx.lineWidth = selectedSize;

// マウス座標取得
function getMousePos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY
  };
}

// 描画開始
canvas.addEventListener('mousedown', (e) => {
  if (isLocked) return;
  isDrawing = true;
  const pos = getMousePos(canvas, e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  socket.emit('draw', { x: pos.x, y: pos.y, color: currentColor, size: selectedSize, begin: true });
});

// 描画中
canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing || isLocked) return;
  const pos = getMousePos(canvas, e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  socket.emit('draw', { x: pos.x, y: pos.y, color: currentColor, size: selectedSize });
});

// 描画終了（マウスアップ）
canvas.addEventListener('mouseup', () => {
  if (!isDrawing) return;
  isDrawing = false;
  ctx.closePath();
  socket.emit('draw', { end: true });
});

// 描画終了（パレット外に出たら終了）
canvas.addEventListener('mouseleave', () => {
  if (!isDrawing) return;
  isDrawing = false;
  ctx.closePath();
  socket.emit('draw', { end: true });
});

// 他ユーザーの描画受信
socket.on('draw', (data) => {
  if (data.begin) {
    ctx.beginPath();
    ctx.moveTo(data.x, data.y);
  } else if (data.end) {
    ctx.closePath();
  } else {
    ctx.strokeStyle = data.color || 'black';
    ctx.lineWidth = data.size || 2;
    ctx.lineTo(data.x, data.y);
    ctx.stroke();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = selectedSize;
  }
});

// 全消し受信
socket.on('clear', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  addMessage(`<em>全消しが実行されました</em>`);
});

// ======== パレットとサイズ選択 ======== //
const colors = ['black', 'red', 'blue', 'yellow', 'green', 'purple', 'white'];
const sizes = [2, 5, 8, 13, 20];

function renderTools() {
  tools.innerHTML = '';

  // 色ボタン
  const colorContainer = document.createElement('div');
  colorContainer.style.display = 'flex';
  colorContainer.style.alignItems = 'center';
  colorContainer.style.marginBottom = '10px';

  colors.forEach(color => {
    const btn = document.createElement('button');
    btn.style.backgroundColor = color;
    btn.style.width = '30px';
    btn.style.height = '30px';
    btn.style.marginRight = '5px';
    btn.style.position = 'relative';
    btn.title = color;

    if (selectedColor === color) {
      const heart = document.createElement('span');
      heart.textContent = '❤';
      heart.style.position = 'absolute';
      heart.style.top = '-20px';
      heart.style.left = '5px';
      heart.style.fontSize = '18px';
      heart.style.color = 'black';
      btn.appendChild(heart);
    }

    btn.onclick = () => {
      currentColor = color;
      selectedColor = color;
      ctx.strokeStyle = currentColor;
      renderTools();
    };
    colorContainer.appendChild(btn);
  });
  tools.appendChild(colorContainer);

  // ペンサイズ
  const sizeContainer = document.createElement('div');
  sizeContainer.style.display = 'flex';
  sizeContainer.style.alignItems = 'center';
  sizeContainer.style.marginBottom = '10px';

  sizes.forEach(size => {
    const sizeBtn = document.createElement('button');
    sizeBtn.style.width = '40px';
    sizeBtn.style.height = '40px';
    sizeBtn.style.marginRight = '5px';
    sizeBtn.style.position = 'relative';
    sizeBtn.style.display = 'flex';
    sizeBtn.style.alignItems = 'center';
    sizeBtn.style.justifyContent = 'center';
    sizeBtn.style.backgroundColor = 'white';
    sizeBtn.style.border = '1px solid black';
    sizeBtn.style.borderRadius = '5px';

    const circle = document.createElement('div');
    circle.style.width = size + 'px';
    circle.style.height = size + 'px';
    circle.style.backgroundColor = 'black';
    circle.style.borderRadius = '50%';
    sizeBtn.appendChild(circle);

    if (selectedSize === size) {
      const marker = document.createElement('div');
      marker.style.width = '10px';
      marker.style.height = '10px';
      marker.style.backgroundColor = 'white';
      marker.style.borderRadius = '50%';
      marker.style.position = 'absolute';
      marker.style.top = '5px';
      marker.style.right = '5px';
      marker.style.border = '1px solid black';
      sizeBtn.appendChild(marker);
    }

    sizeBtn.onclick = () => {
      selectedSize = size;
      ctx.lineWidth = selectedSize;
      renderTools();
    };

    sizeContainer.appendChild(sizeBtn);
  });
  tools.appendChild(sizeContainer);

  // 全消しボタン
  const clearBtn = document.createElement('button');
  clearBtn.textContent = '全消し';
  clearBtn.style.marginTop = '10px';
  clearBtn.onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear');
  };
  tools.appendChild(clearBtn);
}

renderTools();

// ======== ゲーム開始の同期制御 ======== //
function addHostControls() {
  // 既にあれば作らない
  if(document.getElementById('startGameBtn')) return;

  const startBtn = document.createElement('button');
  startBtn.textContent = 'ゲーム開始';
  startBtn.id = 'startGameBtn';
  startBtn.style.marginLeft = '10px';
  startBtn.onclick = () => socket.emit('start game request');
  gameControlDiv.appendChild(startBtn);

  const stopBtn = document.createElement('button');
  stopBtn.textContent = '緊急停止';
  stopBtn.id = 'emergencyStopBtn';
  stopBtn.style.marginLeft = '10px';
  stopBtn.onclick = () => socket.emit('emergency stop');
  gameControlDiv.appendChild(stopBtn);
}

socket.on('host assigned', () => {
  addHostControls();
});

socket.on('prepare game', () => {
  // OKボタンあれば削除
  const existingBtn = document.getElementById('readyBtn');
  if (existingBtn) existingBtn.remove();

  const okBtn = document.createElement('button');
  okBtn.id = 'readyBtn';
  okBtn.textContent = '開始OK';
  okBtn.onclick = () => {
    socket.emit('player ready');
    okBtn.disabled = true;
  };
  gameControlDiv.appendChild(okBtn);
});

socket.on('start game', () => {
  isLocked = true;
  // OKボタン削除
  const btn = document.getElementById('readyBtn');
  if (btn) btn.remove();
});
