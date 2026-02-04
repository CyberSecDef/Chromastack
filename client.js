// client.js - Client-side game logic and UI

let ws = null;
let gameState = null;
let selectedColumn = null;
let timerInterval = null;

// Initialize WebSocket connection
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('Connected to server');
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
  
  // Calculate maximum stack height
  const maxHeight = Math.max(...gameState.columns.map(col => col.length));
  const stackHeight = gameState.columns.length > 0 ? gameState.columns[0].length : 4;
  
  // Render columns
  gameState.columns.forEach((column, columnIndex) => {
    const columnDiv = document.createElement('div');
    columnDiv.className = 'column';
    columnDiv.dataset.column = columnIndex;
    
    // Add selected class if this column is selected
    if (selectedColumn === columnIndex) {
      columnDiv.classList.add('selected');
    }
    
    // Render balls in reverse order (bottom to top)
    for (let i = 0; i < stackHeight; i++) {
      const ballDiv = document.createElement('div');
      ballDiv.className = 'ball-slot';
      
      if (i < column.length) {
        const ballColor = column[i];
        const ball = document.createElement('div');
        ball.className = `ball ${ballColor}`;
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
  
  // If no column is selected, select this column (if it has balls)
  if (selectedColumn === null) {
    if (gameState.columns[columnIndex].length > 0) {
      selectedColumn = columnIndex;
      sendMessage('selectColumn', { column: columnIndex });
    }
  } else {
    // If same column clicked, deselect
    if (selectedColumn === columnIndex) {
      selectedColumn = null;
      sendMessage('selectColumn', { column: null });
    } else {
      // Try to move ball from selected column to clicked column
      sendMessage('move', { fromColumn: selectedColumn, toColumn: columnIndex });
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
  const message = `Level ${data.level} Complete!\nMoves: ${data.moves}\nTime: ${formatTime(data.time)}`;
  alert(message);
  
  // Automatically go to next level after a short delay
  setTimeout(() => {
    sendMessage('nextLevel', {});
  }, 1000);
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
