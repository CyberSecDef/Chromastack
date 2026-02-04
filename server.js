// server.js - WebSocket server and static file server

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { GameState } = require('./shared.js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Store game states for each client
const games = new Map();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Generate a unique client ID
  const clientId = Math.random().toString(36).substring(7);
  
  // Create new game for this client
  const game = new GameState(1);
  games.set(clientId, game);
  
  // Send initial game state
  ws.send(JSON.stringify({
    type: 'gameState',
    data: game.toJSON()
  }));
  
  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      const game = games.get(clientId);
      
      if (!game) return;
      
      switch (msg.type) {
        case 'move':
          const { fromColumn, toColumn } = msg.data;
          const success = game.moveBall(fromColumn, toColumn);
          
          ws.send(JSON.stringify({
            type: 'gameState',
            data: game.toJSON()
          }));
          
          if (game.isComplete) {
            ws.send(JSON.stringify({
              type: 'levelComplete',
              data: {
                level: game.level,
                moves: game.moves,
                time: game.getElapsedTime()
              }
            }));
          }
          break;
          
        case 'restart':
          game.generateLevel(game.level);
          ws.send(JSON.stringify({
            type: 'gameState',
            data: game.toJSON()
          }));
          break;
          
        case 'nextLevel':
          game.level++;
          game.generateLevel(game.level);
          ws.send(JSON.stringify({
            type: 'gameState',
            data: game.toJSON()
          }));
          break;
          
        case 'selectColumn':
          game.selectedColumn = msg.data.column;
          ws.send(JSON.stringify({
            type: 'gameState',
            data: game.toJSON()
          }));
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
    games.delete(clientId);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
