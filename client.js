// client.js - Client-side game logic and UI
'use strict';

let ws = null;
let gameState = null;
let selectedColumn = null;
let timerInterval = null;
let sessionId = null;
let countdownInterval = null;

// Touch drag state
let touchDragState = null;
let touchDragClone = null;

// Cleanup function to prevent memory leaks
function cleanup() {
  // Clear intervals
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  
  // Close WebSocket connection
  if (ws) {
    ws.close();
    ws = null;
  }
  
  // Remove touch drag clone if it exists
  if (touchDragClone) {
    touchDragClone.remove();
    touchDragClone = null;
  }
  
  // Reset drag state
  touchDragState = null;
}

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
    // Send queued messages first
    while (messageQueue.length > 0) {
      ws.send(messageQueue.shift());
    }
    // Send session ID and player name to server to restore or create game
    const playerName = localStorage.getItem('playerName') || '';
    sendMessage('join', { sessionId: sessionId, name: playerName });
  };
  
  ws.onmessage = (event) => {
    try {
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
          
        case 'leaderboard':
          renderLeaderboard(msg.data);
          break;
          
        default:
          console.warn('Unknown message type:', msg.type);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
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

// Message queue for when WebSocket is not ready
let messageQueue = [];

// Send message to server
function sendMessage(type, data) {
  const message = JSON.stringify({ type, data });
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(message);
  } else {
    // Queue the message to send when connected
    messageQueue.push(message);
  }
}

// Render the game board
function renderGame() {
  if (!gameState) return;
  
  try {
    const gameBoard = document.getElementById('gameBoard');
    
    // Clean up existing event listeners by removing all child elements
    // This prevents memory leaks from accumulating event listeners
    while (gameBoard.firstChild) {
      gameBoard.removeChild(gameBoard.firstChild);
    }
  
  // Update status bar
  document.getElementById('level').textContent = gameState.level;
  document.getElementById('moves').textContent = gameState.moves;
  document.getElementById('timer').textContent = formatTime(gameState.elapsedTime);
  document.getElementById('score').textContent = gameState.totalScore.toLocaleString();
  
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
          
          // Desktop drag events
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
          
          // Touch events for mobile
          ball.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            touchDragState = {
              fromColumn: columnIndex,
              startX: touch.clientX,
              startY: touch.clientY
            };
            
            // Create a clone to follow the finger
            touchDragClone = ball.cloneNode(true);
            touchDragClone.classList.add('touch-dragging');
            touchDragClone.style.left = touch.clientX + 'px';
            touchDragClone.style.top = touch.clientY + 'px';
            document.body.appendChild(touchDragClone);
            
            ball.classList.add('drag-hidden');
          }, { passive: false });
          
          ball.addEventListener('touchmove', (e) => {
            if (!touchDragState || !touchDragClone) return;
            e.preventDefault();
            const touch = e.touches[0];
            
            // Move the clone
            touchDragClone.style.left = touch.clientX + 'px';
            touchDragClone.style.top = touch.clientY + 'px';
            
            // Highlight column under finger
            const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
            document.querySelectorAll('.column').forEach(col => col.classList.remove('drag-over'));
            if (elementUnder) {
              const column = elementUnder.closest('.column');
              if (column) {
                column.classList.add('drag-over');
              }
            }
          }, { passive: false });
          
          ball.addEventListener('touchend', (e) => {
            if (!touchDragState) return;
            
            // Find column under finger
            const touch = e.changedTouches[0];
            const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
            
            if (elementUnder) {
              const column = elementUnder.closest('.column');
              if (column) {
                const toColumn = parseInt(column.dataset.column, 10);
                if (!isNaN(toColumn)) {
                  sendMessage('move', { fromColumn: touchDragState.fromColumn, toColumn: toColumn });
                }
              }
            }
            
            // Cleanup
            if (touchDragClone) {
              touchDragClone.remove();
              touchDragClone = null;
            }
            document.querySelectorAll('.column').forEach(col => col.classList.remove('drag-over'));
            document.querySelectorAll('.ball').forEach(b => b.classList.remove('drag-hidden'));
            touchDragState = null;
          }, { passive: false });
        }
        
        ballDiv.appendChild(ball);
      }
      
      columnDiv.appendChild(ballDiv);
    }
    
    // Add click handler
    columnDiv.addEventListener('click', () => handleColumnClick(columnIndex));
    
    gameBoard.appendChild(columnDiv);
  });
  } catch (error) {
    console.error('Error rendering game:', error);
  }
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
  
  if (!modal) {
    console.error('Modal not found');
    return;
  }
  
  // Update score display with total score
  const scoreEl = document.getElementById('score');
  if (scoreEl) {
    scoreEl.textContent = data.totalScore.toLocaleString();
  }
  
  // Set modal content
  const modalLevelEl = document.getElementById('modalLevel');
  if (modalLevelEl) modalLevelEl.textContent = data.level;
  
  const modalMovesEl = document.getElementById('modalMoves');
  if (modalMovesEl) modalMovesEl.textContent = data.moves;
  
  const modalTimeEl = document.getElementById('modalTime');
  if (modalTimeEl) modalTimeEl.textContent = formatTime(data.time);
  
  const modalScoreEl = document.getElementById('modalScore');
  if (modalScoreEl) modalScoreEl.textContent = data.levelScore.toLocaleString();
  
  // Update modal title and message based on game reset
  const modalTitle = modal.querySelector('h2');
  const modalNext = modal.querySelector('.modal-next');
  
  if (modalTitle) {
    if (data.gameReset) {
      modalTitle.textContent = '🎉 Game Complete! 🎉';
    } else {
      modalTitle.textContent = '🎉 Level Complete! 🎉';
    }
  }
  
  if (modalNext) {
    if (data.gameReset) {
      modalNext.innerHTML = 'Next game starting in <span id="modalCountdown">10</span> seconds...';
    } else {
      modalNext.innerHTML = 'Next level starting in <span id="modalCountdown">10</span> seconds...';
    }
  }
  
  // Show modal
  modal.classList.add('active');
  
  // Create confetti
  if (confettiContainer) {
    createConfetti(confettiContainer);
  }
  
  // Clear any existing countdown
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  // Countdown timer
  let countdown = 10;
  const countdownEl = document.getElementById('modalCountdown');
  if (countdownEl) {
    countdownEl.textContent = countdown;
    
    countdownInterval = setInterval(() => {
      countdown--;
      countdownEl.textContent = countdown;
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    }, 1000);
  }
  
  // Go to next level after 10 seconds (or restart game if completed)
  setTimeout(() => {
    modal.classList.remove('active');
    if (confettiContainer) {
      confettiContainer.innerHTML = '';
    }
    if (data.gameReset) {
      // Game was reset, just refresh the current state
      sendMessage('getState', {});
    } else {
      sendMessage('nextLevel', {});
    }
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

// Render leaderboard
function renderLeaderboard(leaderboard) {
  const leaderboardList = document.getElementById('leaderboardList');
  leaderboardList.innerHTML = '';
  
  leaderboard.forEach((entry, index) => {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'leaderboard-entry';
    
    if (entry.sessionId === sessionId) {
      entryDiv.classList.add('current-player');
    }
    
    entryDiv.innerHTML = `
      <span class="rank">${index + 1}</span>
      <span class="name">${entry.name || 'Anonymous'}</span>
      <span class="score">${entry.score.toLocaleString()}</span>
    `;
    
    leaderboardList.appendChild(entryDiv);
  });
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.dataset.theme = savedTheme;
  
  // Initialize player name
  const playerNameInput = document.getElementById('playerName');
  const savedName = localStorage.getItem('playerName') || '';
  playerNameInput.value = savedName;
  
  // Save name on input change
  playerNameInput.addEventListener('input', () => {
    const newName = playerNameInput.value.trim();
    localStorage.setItem('playerName', newName);
    // Send name update to server
    sendMessage('updateName', { name: newName });
  });
  
  // Set up event listeners
  document.getElementById('restartBtn').addEventListener('click', restartLevel);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  
  // Help button modal
  const helpBtn = document.getElementById('helpBtn');
  const instructionsModal = document.getElementById('instructionsModal');
  const closeInstructionsBtn = document.getElementById('closeInstructionsBtn');
  
  helpBtn.addEventListener('click', () => {
    instructionsModal.classList.add('active');
  });
  
  closeInstructionsBtn.addEventListener('click', () => {
    instructionsModal.classList.remove('active');
  });
  
  // Close modal when clicking outside
  instructionsModal.addEventListener('click', (e) => {
    if (e.target === instructionsModal) {
      instructionsModal.classList.remove('active');
    }
  });
  
  // Initialize WebSocket
  initWebSocket();
  
  // Start timer
  startTimer();
  
  // Add cleanup on page unload
  window.addEventListener('beforeunload', cleanup);
});
