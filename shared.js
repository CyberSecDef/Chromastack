// shared.js - Shared game logic for both client and server

class GameState {
  constructor(level = 1) {
    this.level = level;
    this.moves = 0;
    this.columns = [];
    this.selectedColumn = null;
    this.startTime = Date.now();
    this.elapsedTime = 0;
    this.isComplete = false;
    this.generateLevel(level);
  }

  // Generate a level based on difficulty
  generateLevel(level) {
    // Level determines grid size: level 1-2 = 4x4, 3-4 = 5x5, etc.
    const gridSize = Math.min(Math.floor((level + 1) / 2) + 3, 10);
    const stackHeight = gridSize;
    const numColors = gridSize - 1; // One column is empty
    
    this.columns = [];
    
    // Create balls array
    const balls = [];
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan', 'lime', 'magenta'];
    
    for (let i = 0; i < numColors; i++) {
      for (let j = 0; j < stackHeight; j++) {
        balls.push(colors[i]);
      }
    }
    
    // Shuffle balls
    for (let i = balls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [balls[i], balls[j]] = [balls[j], balls[i]];
    }
    
    // Distribute balls into columns
    for (let i = 0; i < numColors; i++) {
      this.columns.push(balls.slice(i * stackHeight, (i + 1) * stackHeight));
    }
    
    // Add one empty column
    this.columns.push([]);
    
    this.moves = 0;
    this.selectedColumn = null;
    this.isComplete = false;
    this.startTime = Date.now();
  }

  // Check if a move is valid
  canMoveBall(fromColumn, toColumn) {
    if (fromColumn === toColumn) return false;
    if (fromColumn < 0 || fromColumn >= this.columns.length) return false;
    if (toColumn < 0 || toColumn >= this.columns.length) return false;
    
    const fromStack = this.columns[fromColumn];
    const toStack = this.columns[toColumn];
    
    // Can't move from empty column
    if (fromStack.length === 0) return false;
    
    // Can always move to empty column
    if (toStack.length === 0) return true;
    
    // Can't move to full column
    if (toStack.length >= this.columns[0].length) return false;
    
    // Can only move to column with same color on top
    const fromBall = fromStack[fromStack.length - 1];
    const toBall = toStack[toStack.length - 1];
    
    return fromBall === toBall;
  }

  // Move a ball from one column to another
  moveBall(fromColumn, toColumn) {
    if (!this.canMoveBall(fromColumn, toColumn)) {
      return false;
    }
    
    const ball = this.columns[fromColumn].pop();
    this.columns[toColumn].push(ball);
    this.moves++;
    
    // Check if game is complete
    this.checkComplete();
    
    return true;
  }

  // Check if the game is complete
  checkComplete() {
    for (const column of this.columns) {
      if (column.length === 0) continue; // Empty column is OK
      
      // Check if all balls in column are same color
      const color = column[0];
      for (const ball of column) {
        if (ball !== color) {
          this.isComplete = false;
          return false;
        }
      }
    }
    
    this.isComplete = true;
    return true;
  }

  // Get elapsed time in seconds
  getElapsedTime() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  // Serialize game state
  toJSON() {
    return {
      level: this.level,
      moves: this.moves,
      columns: this.columns,
      selectedColumn: this.selectedColumn,
      elapsedTime: this.getElapsedTime(),
      isComplete: this.isComplete
    };
  }

  // Deserialize game state
  static fromJSON(data) {
    const game = new GameState(1);
    game.level = data.level;
    game.moves = data.moves;
    game.columns = data.columns;
    game.selectedColumn = data.selectedColumn;
    game.isComplete = data.isComplete;
    game.startTime = Date.now() - (data.elapsedTime * 1000);
    return game;
  }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameState };
}
