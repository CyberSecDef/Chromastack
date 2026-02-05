// client.js - Client-side game logic and UI
'use strict';

let ws = null;
let gameState = null;
let selectedColumn = null;
let timerInterval = null;
let sessionId = null;
let countdownInterval = null;

// Get or create session ID
function getSessionId() {
  let id = localStorage.getItem('chromastack_session');
  if (!id) {
    id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('chromastack_session', id);
  }
  return id;
}

// Initialize WebSocket connection
function initWebSocket() {
  sessionId = getSessionId();
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('Connected to server');
    // Send session ID to server to restore or create game
    sendMessage('join', { sessionId: sessionId });
  };
  
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    
    switch (msg.type) {
      case 'gameState':
        gameState = msg.data;
        selectedColumn = gameState.selectedColumn;
        renderGame();
        break;
        
      case 'levelComplete':
        showLevelComplete(msg.data);
        break;
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  ws.onclose = () => {
    console.log('Disconnected from server');
    setTimeout(initWebSocket, 3000); // Reconnect after 3 seconds
  };
}

// Send message to server
function sendMessage(type, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, data }));
  }
}

// Render the game board
function renderGame() {
  if (!gameState) return;
  
  const gameBoard = document.getElementById('gameBoard');
  gameBoard.innerHTML = '';
  
  // Update status bar
  document.getElementById('level').textContent = gameState.level;
  document.getElementById('moves').textContent = gameState.moves;
  document.getElementById('timer').textContent = formatTime(gameState.elapsedTime);
  
  // Use the fixed stack height from game state
  const stackHeight = gameState.stackHeight || 4;
  
  // Emoji mapping for balls
  const emojiMap = {
    'apple': '🍎',
    'blueberry': '🫐',
    'broccoli': '🥦',
    'star': '⭐',
    'grape': '🍇',
    'orange': '🍊',
    'cherry': '🍒',
    'diamond': '💎',
    'lime': '🍈',
    'heart': '❤️'
  };
  
  // Render columns
  gameState.columns.forEach((column, columnIndex) => {
    const columnDiv = document.createElement('div');
    columnDiv.className = 'column';
    columnDiv.dataset.column = columnIndex;
    
    // Add selected class if this column is selected
    if (selectedColumn === columnIndex) {
      columnDiv.classList.add('selected');
    }
    
    // Add drop zone handlers
    columnDiv.addEventListener('dragover', (e) => {
      e.preventDefault();
      columnDiv.classList.add('drag-over');
    });
    columnDiv.addEventListener('dragleave', () => {
      columnDiv.classList.remove('drag-over');
    });
    columnDiv.addEventListener('drop', (e) => {
      e.preventDefault();
      columnDiv.classList.remove('drag-over');
      const fromColumn = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (!isNaN(fromColumn)) {
        // Attempt move - server will validate
        sendMessage('move', { fromColumn: fromColumn, toColumn: columnIndex });
      }
    });
    
    // Render balls in reverse order (bottom to top)
    for (let i = 0; i < stackHeight; i++) {
      const ballDiv = document.createElement('div');
      ballDiv.className = 'ball-slot';
      
      if (i < column.length) {
        const ballType = column[i];
        const ball = document.createElement('div');
        ball.className = 'ball';
        ball.textContent = emojiMap[ballType] || '⚪';
        
        // Make only the top ball draggable
        if (i === column.length - 1) {
          ball.draggable = true;
          ball.classList.add('draggable');
          ball.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', columnIndex.toString());
            ball.classList.add('dragging');
            // Small delay to allow the drag image to be captured
            setTimeout(() => ball.classList.add('drag-hidden'), 0);
          });
          ball.addEventListener('dragend', () => {
            ball.classList.remove('dragging', 'drag-hidden');
            // Remove drag-over from all columns
            document.querySelectorAll('.column').forEach(col => col.classList.remove('drag-over'));
          });
        }
        
        ballDiv.appendChild(ball);
      }
      
      columnDiv.appendChild(ballDiv);
    }
    
    // Add click handler
    columnDiv.addEventListener('click', () => handleColumnClick(columnIndex));
    
    gameBoard.appendChild(columnDiv);
  });
}

// Handle column click
function handleColumnClick(columnIndex) {
  if (gameState.isComplete) return;
  
  // If no column is selected, select this column as destination
  if (selectedColumn === null) {
    selectedColumn = columnIndex;
    sendMessage('selectColumn', { column: columnIndex });
  } else {
    // If same column clicked, deselect
    if (selectedColumn === columnIndex) {
      selectedColumn = null;
      sendMessage('selectColumn', { column: null });
    } else {
      // Move ball from clicked column (source) to selected column (destination)
      sendMessage('move', { fromColumn: columnIndex, toColumn: selectedColumn });
      selectedColumn = null;
    }
  }
}

// Format time as MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Show level complete message
function showLevelComplete(data) {
  const modal = document.getElementById('levelCompleteModal');
  const confettiContainer = document.getElementById('confettiContainer');
  
  // Set modal content
  document.getElementById('modalLevel').textContent = data.level;
  document.getElementById('modalMoves').textContent = data.moves;
  document.getElementById('modalTime').textContent = formatTime(data.time);
  
  // Show modal
  modal.classList.add('active');
  
  // Create confetti
  createConfetti(confettiContainer);
  
  // Clear any existing countdown
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  // Countdown timer
  let countdown = 10;
  const countdownEl = document.getElementById('modalCountdown');
  countdownEl.textContent = countdown;
  
  countdownInterval = setInterval(() => {
    countdown--;
    countdownEl.textContent = countdown;
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }, 1000);
  
  // Go to next level after 10 seconds
  setTimeout(() => {
    modal.classList.remove('active');
    confettiContainer.innerHTML = '';
    sendMessage('nextLevel', {});
  }, 10000);
}

// Create confetti particles
function createConfetti(container) {
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4', '#ffd700'];
  
  for (let i = 0; i < 150; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.width = (Math.random() * 10 + 5) + 'px';
      confetti.style.height = (Math.random() * 10 + 5) + 'px';
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
      container.appendChild(confetti);
      
      // Remove confetti after animation
      setTimeout(() => {
        confetti.remove();
      }, 5000);
    }, Math.random() * 3000);
  }
}

// Restart current level
function restartLevel() {
  selectedColumn = null;
  sendMessage('restart', {});
}

// Toggle theme
function toggleTheme() {
  const body = document.body;
  const currentTheme = body.dataset.theme || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  body.dataset.theme = newTheme;
  localStorage.setItem('theme', newTheme);
}

// Update timer every second
function startTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  timerInterval = setInterval(() => {
    if (gameState && !gameState.isComplete) {
      gameState.elapsedTime++;
      document.getElementById('timer').textContent = formatTime(gameState.elapsedTime);
    }
  }, 1000);
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.dataset.theme = savedTheme;
  
  // Set up event listeners
  document.getElementById('restartBtn').addEventListener('click', restartLevel);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  
  // Initialize WebSocket
  initWebSocket();
  
  // Start timer
  startTimer();
});
