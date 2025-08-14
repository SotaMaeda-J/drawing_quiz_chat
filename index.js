// index.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let hostSocketId = null;
let readyPlayers = new Set();
let totalPlayers = 0;

const drawingLocks = new Map(); // socket.id => boolean（trueならロック中）
const currentDrawingData = [];  // 描画の履歴を保持
const chatHistory = [];         // チャット履歴（最大100件程度）

const PORT = process.env.PORT || 3000;
/*const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});
*/
// public フォルダを静的ファイル配信
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
  totalPlayers++;
  drawingLocks.set(socket.id, false); // 初期はロック解除

  console.log('a user connected', socket.id);

  socket.on('join', (name) => {
    socket.username = name || '名無し';
    io.emit('system message', `${socket.username}さんが参加しました`);

    if (!hostSocketId) {
      hostSocketId = socket.id;
      io.to(hostSocketId).emit('host assigned');
      io.emit('system message', `${socket.username}さんがホストになりました`);
    }

    // 新規参加者へ現在の描画履歴とチャット履歴を送信
    socket.emit('init drawing', currentDrawingData);
    socket.emit('init chat', chatHistory);
  });

  socket.on('chat message', (msg) => {
    const payload = {
      name: socket.username || '名無し',
      msg: msg,
      time: new Date().toISOString(),
    };
    io.emit('chat message', payload);

    // チャット履歴管理（最大100件）
    chatHistory.push(payload);
    if (chatHistory.length > 100) chatHistory.shift();
  });

  socket.on('draw', (data) => {
    if (drawingLocks.get(socket.id)) {
      // ロック中は描画無効化
      return;
    }
    currentDrawingData.push(data);
    io.emit('draw', data);
  });

  socket.on('clear', () => {
    currentDrawingData.length = 0; // 描画履歴クリア
    io.emit('clear');
    io.emit('system message', '全消しが実行されました');
  });

  socket.on('start game request', () => {
    if (socket.id === hostSocketId) {
      readyPlayers.clear();
      io.emit('system message', 'ゲーム開始準備中…各プレイヤーは「開始OK」を押してください。');
      io.emit('prepare game'); // 全員に「開始OK」表示
      currentDrawingData.length = 0;  // ゲーム開始時に全消し
      io.emit('clear');
    }
  });

  socket.on('player ready', () => {
    readyPlayers.add(socket.id);
    if (readyPlayers.size === totalPlayers) {
      io.emit('system message', '全員準備完了！ゲーム開始！');
      io.emit('start game');
      // ゲーム開始で全員描画ロックON
      drawingLocks.forEach((_, key) => drawingLocks.set(key, true));
    }
  });

  socket.on('emergency stop', () => {
    if (socket.id === hostSocketId) {
      drawingLocks.forEach((_, key) => drawingLocks.set(key, false)); // 全員ロック解除
      currentDrawingData.length = 0;
      io.emit('clear');
      io.emit('system message', 'ゲームが緊急停止されました。描画ロックを解除し、全消ししました。');
    }
  });

  socket.on('disconnect', () => {
    totalPlayers--;
    readyPlayers.delete(socket.id);
    drawingLocks.delete(socket.id);
    if (socket.username) {
      io.emit('system message', `${socket.username}さんが退出しました`);
    }
    console.log('a user disconnected', socket.id);

    if (socket.id === hostSocketId) {
      const sockets = Array.from(io.sockets.sockets.values());
      if (sockets.length > 0) {
        hostSocketId = sockets[0].id;
        io.to(hostSocketId).emit('host assigned');
        io.emit('system message', `${sockets[0].username || '名無し'}さんがホストになりました`);
      } else {
        hostSocketId = null;
      }
    }
  });
});

http.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});