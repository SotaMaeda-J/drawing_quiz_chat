// index.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

// public フォルダを静的ファイル配信
app.use(express.static('public'));

// シンプルなトップページ（public/index.html が表示されます）
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Socket.IO の接続処理
io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  // ユーザーがニックネームを送ってきたとき
  socket.on('join', (name) => {
    socket.username = name || '名無し';
    io.emit('system message', `${socket.username}さんが参加しました`);
  });

  // チャットメッセージを受け取ったら全員に送る
  socket.on('chat message', (msg) => {
    const payload = {
      name: socket.username || '名無し',
      msg: msg,
      time: new Date().toISOString()
    };
    io.emit('chat message', payload);
  });

  // 切断時
  socket.on('disconnect', () => {
    if (socket.username) {
      io.emit('system message', `${socket.username}さんが退出しました`);
    }
    console.log('a user disconnected', socket.id);
  });
});

http.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});
