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

const PORT = process.env.PORT || 8016;
const HOST = '0.0.0.0';

// Serve static files
app.use(express.static(path.join(__dirname)));

// Store game states by session ID (persists across disconnects)
const games = new Map();

// Global leaderboard - top 5 high scores across all sessions
const leaderboard = [];

// Track high scores for each session (sessionId -> highScore)
const highScores = new Map();

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

// Update leaderboard with new high score (only if higher than previous)
function updateLeaderboard(sessionId, score, level, name) {
  // Check if this is a new high score for this session
  const currentHighScore = highScores.get(sessionId) || 0;
  if (score <= currentHighScore) {
    return; // Don't update if not a new high score
  }
  
  // Update high score for this session
  highScores.set(sessionId, score);
  
  // Remove existing entry for this session
  const existingIndex = leaderboard.findIndex(entry => entry.sessionId === sessionId);
  if (existingIndex !== -1) {
    leaderboard.splice(existingIndex, 1);
  }
  
  // Add new entry
  leaderboard.push({
    sessionId,
    score,
    level,
    name: name || 'Anonymous',
    timestamp: Date.now()
  });
  
  // Sort by score descending and keep top 5
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard.splice(5);
  
  // Broadcast updated leaderboard to all connected clients
  broadcastLeaderboard();
}

// Broadcast leaderboard to all connected clients
function broadcastLeaderboard() {
  const leaderboardData = leaderboard.map(entry => ({
    sessionId: entry.sessionId,
    score: entry.score,
    level: entry.level,
    name: entry.name || 'Anonymous'
  }));
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'leaderboard',
        data: leaderboardData
      }));
    }
  });
}

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
        const playerName = msg.data?.name || '';
        
        // Validate session ID format
        if (!requestedSessionId || typeof requestedSessionId !== 'string' || 
            !SESSION_ID_PATTERN.test(requestedSessionId)) {
          console.log('Invalid session ID format');
          ws.close(1008, 'Invalid session ID');
          return;
        }
        
        sessionId = requestedSessionId;
        console.log(`Client joining with session: ${sessionId}, name: ${playerName || 'Anonymous'}`);
        
        // Check if session exists, otherwise create new game
        let gameData = games.get(sessionId);
        if (!gameData) {
          console.log(`Creating new game for session: ${sessionId}`);
          gameData = {
            game: new GameState(1),
            playerName: playerName,
            lastActivity: Date.now()
          };
          games.set(sessionId, gameData);
        } else {
          console.log(`Restoring game for session: ${sessionId}`);
          // Update player name if provided
          if (playerName) {
            gameData.playerName = playerName;
          }
          gameData.lastActivity = Date.now();
        }
        
        // Send current game state
        ws.send(JSON.stringify({
          type: 'gameState',
          data: gameData.game.toJSON()
        }));
        
        // Send current leaderboard
        broadcastLeaderboard();
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
            // Calculate level score
            const gridSize = game.level + 3;
            const numColors = gridSize - 1;
            const totalTokens = numColors * gridSize;
            const levelScore = Math.round((totalTokens * 10000) / (game.moves * .25 * Math.max(game.getElapsedTime(), 1)));
            
            // Add to total score
            game.totalScore += levelScore;
            
            // Update leaderboard
            const playerName = gameData.playerName || 'Anonymous';
            updateLeaderboard(sessionId, game.totalScore, game.level, playerName);
            
            ws.send(JSON.stringify({
              type: 'levelComplete',
              data: {
                level: game.level,
                moves: game.moves,
                time: game.getElapsedTime(),
                levelScore: levelScore,
                totalScore: game.totalScore,
                gameReset: game.level >= 10 // Indicate if game is resetting
              }
            }));
            
            // Reset game after level 10
            if (game.level >= 10) {
              console.log(`Player ${sessionId} completed level 10, resetting game`);
              game.level = 1;
              game.totalScore = 0;
              game.generateLevel(1);
            }
          }
          break;
          
        case 'updateName':
          const newName = msg.data?.name || '';
          gameData.playerName = newName;
          console.log(`Player ${sessionId} updated name to: ${newName || 'Anonymous'}`);
          // Update leaderboard if player has a score
          if (game.totalScore > 0) {
            updateLeaderboard(sessionId, game.totalScore, game.level, newName);
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
          
        case 'getState':
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
