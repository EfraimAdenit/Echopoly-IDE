const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const PORT = 9002;
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

const server = http.createServer((req, res) => {
  // Parse URL without query string
  const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  
  let filePath = path.join(__dirname, urlPath);
  
  // Route root to index.html
  if (urlPath === '/' || urlPath === '') {
    filePath = path.join(__dirname, 'index.html');
  }
  
  // Prevent directory traversal
  if (!filePath.startsWith(path.join(__dirname))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found: ' + filePath);
    return;
  }

  // Serve file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Server Error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    // Add headers to prevent caching for development
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(data);
  });
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const activeRooms = {};

function getRoomUsers(projectId) {
  const room = activeRooms[projectId];
  if (!room) return [];
  return Object.values(room.users).map(user => ({
    id: user.id,
    name: user.name,
    role: user.isHost ? 'Host' : (user.role || 'Participant'),
    username: user.username || user.id,
    avatar: (user.name || 'G').charAt(0).toUpperCase(),
    online: true,
    isLocal: false,
    isHost: user.isHost
  }));
}

function emitActiveUsers(projectId) {
  const users = getRoomUsers(projectId);
  io.to(projectId).emit('activeUsersUpdate', users);
}

io.on('connection', (socket) => {
  socket.on('joinProject', (payload) => {
    if (!payload || !payload.projectId || !payload.user) return;
    const projectId = payload.projectId;
    socket.join(projectId);

    if (!activeRooms[projectId]) {
      activeRooms[projectId] = {
        users: {},
        hostSocketId: null
      };
    }

    const room = activeRooms[projectId];
    const isHost = !room.hostSocketId;
    if (isHost) {
      room.hostSocketId = socket.id;
    }

    const userData = {
      ...payload.user,
      socketId: socket.id,
      isHost
    };

    room.users[socket.id] = userData;
    socket.data.projectId = projectId;
    socket.data.user = userData;

    socket.emit('activeUsersUpdate', getRoomUsers(projectId));
    socket.to(projectId).emit('participantJoined', { user: userData });
    emitActiveUsers(projectId);
  });

  socket.on('openProject', (payload) => {
    if (!payload || !payload.projectId) return;
    const projectId = payload.projectId;
    const projectDetails = {
      projectId,
      title: `Project ${projectId}`,
      description: 'Shared project loaded successfully.',
      timestamp: Date.now()
    };
    socket.emit('projectDetails', projectDetails);
  });

  socket.on('sendMessage', (message) => {
    const projectId = socket.data.projectId;
    if (!projectId || !message) return;
    io.to(projectId).emit('newMessage', message);
  });

  // Collaborative editor events
  socket.on('editorContentUpdate', (data) => {
    const projectId = socket.data.projectId;
    if (!projectId || !data) return;
    
    // Broadcast to all other users in the project
    socket.to(projectId).emit('editorContentUpdate', {
      ...data,
      userId: socket.data.user.id
    });
  });

  socket.on('cursorPositionUpdate', (data) => {
    const projectId = socket.data.projectId;
    if (!projectId || !data) return;
    
    // Broadcast to all other users in the project
    socket.to(projectId).emit('cursorPositionUpdate', {
      ...data,
      userId: socket.data.user.id
    });
  });

  socket.on('projectShared', (data) => {
    const projectId = socket.data.projectId;
    if (!projectId || !data) return;
    
    // Broadcast to all users in the project
    io.to(projectId).emit('projectShared', data);
  });

  socket.on('disconnect', () => {
    const projectId = socket.data.projectId;
    if (!projectId) return;
    const room = activeRooms[projectId];
    if (!room) return;

    const user = room.users[socket.id];
    delete room.users[socket.id];
    if (room.hostSocketId === socket.id) {
      const remainingSockets = Object.keys(room.users);
      room.hostSocketId = remainingSockets.length > 0 ? remainingSockets[0] : null;
      if (room.hostSocketId) {
        room.users[room.hostSocketId].isHost = true;
      }
    }

    socket.to(projectId).emit('participantLeft', { user: socket.data.user || {} });
    emitActiveUsers(projectId);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Press Ctrl+C to stop the server`);
});
