// server.js - WebSocket server and static file server
'use strict';

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { GameState } = require('./shared.js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Serve static files
app.use(express.static(path.join(__dirname)));

// Store game states by session ID (persists across disconnects)
const games = new Map();

// Session timeout (24 hours) - clean up old sessions periodically
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;
const SESSION_ID_PATTERN = /^[a-z0-9]{10,50}$/;
const MAX_MESSAGE_SIZE = 1024; // 1KB max message size
const RATE_LIMIT_WINDOW = 1000; // 1 second
const RATE_LIMIT_MAX = 20; // max messages per window

setInterval(() => {
  const now = Date.now();
  for (const [sessionId, gameData] of games.entries()) {
    if (now - gameData.lastActivity > SESSION_TIMEOUT) {
      games.delete(sessionId);
      console.log(`Session ${sessionId} expired and removed`);
    }
  }
}, 60 * 60 * 1000); // Check every hour

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  let sessionId = null;
  let messageCount = 0;
  let lastReset = Date.now();
  
  // Handle messages from client
  ws.on('message', (message) => {
    try {
      // Rate limiting
      const now = Date.now();
      if (now - lastReset > RATE_LIMIT_WINDOW) {
        messageCount = 0;
        lastReset = now;
      }
      messageCount++;
      if (messageCount > RATE_LIMIT_MAX) {
        console.log('Rate limit exceeded');
        return;
      }
      
      // Message size check
      if (message.length > MAX_MESSAGE_SIZE) {
        console.log('Message too large');
        return;
      }
      
      const msg = JSON.parse(message);
      
      // Handle join message to establish session
      if (msg.type === 'join') {
        const requestedSessionId = msg.data?.sessionId;
        
        // Validate session ID format
        if (!requestedSessionId || typeof requestedSessionId !== 'string' || 
            !SESSION_ID_PATTERN.test(requestedSessionId)) {
          console.log('Invalid session ID format');
          ws.close(1008, 'Invalid session ID');
          return;
        }
        
        sessionId = requestedSessionId;
        console.log(`Client joining with session: ${sessionId}`);
        
        // Check if session exists, otherwise create new game
        let gameData = games.get(sessionId);
        if (!gameData) {
          console.log(`Creating new game for session: ${sessionId}`);
          gameData = {
            game: new GameState(1),
            lastActivity: Date.now()
          };
          games.set(sessionId, gameData);
        } else {
          console.log(`Restoring game for session: ${sessionId}`);
          gameData.lastActivity = Date.now();
        }
        
        // Send current game state
        ws.send(JSON.stringify({
          type: 'gameState',
          data: gameData.game.toJSON()
        }));
        return;
      }
      
      // All other messages require a valid session
      if (!sessionId) return;
      
      const gameData = games.get(sessionId);
      if (!gameData) return;
      
      const game = gameData.game;
      gameData.lastActivity = Date.now();
      
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
          game.level = 1;
          game.generateLevel(1);
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
          const colIndex = msg.data?.column;
          if (colIndex !== null && (typeof colIndex !== 'number' || 
              colIndex < 0 || colIndex >= game.columns.length)) {
            return; // Invalid column index
          }
          game.selectedColumn = colIndex;
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
  
  // Handle disconnection - don't delete game, allow reconnection
  ws.on('close', () => {
    console.log(`Client disconnected (session: ${sessionId})`);
    // Game state is preserved in the games Map for reconnection
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
