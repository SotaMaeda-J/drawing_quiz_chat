// client.js
const socket = io();

const messages = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');

// ニックネームを聞く（簡単な実装）
let name = '';
while (!name) {
  name = prompt('ニックネームを入力してください（Enterで確定）') || '';
  name = name.trim();
}
socket.emit('join', name);

// HTML エスケープ（簡易）
function escapeHTML(s) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function addMessage(html) {
  const li = document.createElement('li');
  li.innerHTML = html;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value.trim() === '') return;
  socket.emit('chat message', input.value);
  input.value = '';
  input.focus();
});

socket.on('chat message', (data) => {
  const t = new Date(data.time).toLocaleTimeString();
  addMessage(`<strong>${escapeHTML(data.name)}</strong> <small>${t}</small>: ${escapeHTML(data.msg)}`);
});

socket.on('system message', (msg) => {
  addMessage(`<em>${escapeHTML(msg)}</em>`);
});

// 簡易的に Enter で送信（ボタンがなくても行けます）
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form.dispatchEvent(new Event('submit'));
  }
});
