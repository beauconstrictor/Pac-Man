const WALL    = 1;
const PATH    = 0;
const PELLET  = 2;
const POWERUP = 3;
const GATE    = 4;

const COLOURS = {
  [WALL]:    "#2121de",
  [PATH]:    "#000000",
  [PELLET]:  "#ffb8ae",
  [POWERUP]: "#ffb8ae",
  [GATE]:    "#bbaa00",
};

const PACMAN    = "#ffff00";

const BLINKY = "#ff0f00";
const PINKY = "#ffb8ff";
const INKY = "#00ffff";
const CLYDE = "#ffb852";

const CLYDE_HOME = [2, 29];
const CLYDE_CHASE_DIST = 8;
const PINKY_LOOKAHEAD = 2;
const INKY_HOME  = [2, 1];
const INKY_CHASE_DIST  = 2;

const SPEED = 1/15;

const TILESIZE = 24;
const PELLET_SIZE = 7;
const POWERUP_SIZE = 4;

const MAP = [
  "##############################",
  "##............##............##",
  "##.####.#####.##.#####.####.##",
  "##o####.#####.##.#####.####o##",
  "##.####.#####.##.#####.####.##",
  "##..........................##",
  "##.####.##.########.##.####.##",
  "##.####.##.########.##.####.##",
  "##......##....##....##......##",
  "#######.##### ## #####.#######",
  "#######.##### ## #####.#######",
  "#######.##          ##.#######",
  "#######.## ###--### ##.#######",
  "#######.## #      # ##.#######",
  "           #      #           ",
  "#######.## #      # ##.#######",
  "#######.## ######## ##.#######",
  "#######.##          ##.#######",
  "#######.## ######## ##.#######",
  "#######.## ######## ##.#######",
  "##............##............##",
  "##.####.#####.##.#####.####.##",
  "##.####.#####.##.#####.####.##",
  "##o..##................##..o##",
  "####.##.##.########.##.##.####",
  "####.##.##.########.##.##.####",
  "##......##....##....##......##",
  "##.##########.##.##########.##",
  "##.##########.##.##########.##",
  "##..........................##",
  "##############################",
];

const DRAW_OFFSET = [-1, 0];

class Pacman {
  constructor(game) {
    this.x = 14.5;
    this.y = 23;
    this.direction = [0, 0];
    this.game = game;

    this.inputQueue = [];
  }

  // returns the last full grid coord that pac-man was in
  gridCoord() {
    let col = this.direction[0] > 0 ? Math.floor(this.x) : Math.ceil(this.x);
    let row = this.direction[1] > 0 ? Math.floor(this.y) : Math.ceil(this.y);
    return [col, row];
  }

  // returns the next full grid coord that pac-man will be in
  nextGridCoord() {
    let col = this.direction[0] < 0 ? Math.floor(this.x) : Math.ceil(this.x);
    let row = this.direction[1] < 0 ? Math.floor(this.y) : Math.ceil(this.y);
    return [col, row];
  }

  draw(ctx) {
    ctx.fillStyle = PACMAN;
    ctx.beginPath();
    const xpx = (this.x+DRAW_OFFSET[0]) * TILESIZE + TILESIZE/2;
    const ypx = (this.y+DRAW_OFFSET[1]) * TILESIZE + TILESIZE/2;
    ctx.arc(xpx, ypx, TILESIZE/2, Math.PI * 2, 0);
    ctx.fill();

    // hide pacman as he wraps off the right
    ctx.fillStyle = "#000";
    ctx.fillRect(TILESIZE*(MAP[0].length-2),
      TILESIZE*(this.y+DRAW_OFFSET[1]),
      TILESIZE, TILESIZE
    );
  }

  changeDirection() {
    if (this.inputQueue.length === 0) return;

    const newDir = this.inputQueue[0];

    if (newDir.every((v, i) => v === this.direction[i])) {
      this.inputQueue.shift();
      return
    };


    const grid = this.game.grid;

    // only turn when aligned with the grid
    const alignedX = Math.abs(this.x - Math.round(this.x)) < SPEED;
    const alignedY = Math.abs(this.y - Math.round(this.y)) < SPEED;
    if (newDir[0] !== 0 && !alignedY) return;
    if (newDir[1] !== 0 && !alignedX) return;

    const col = Math.round(this.x);
    const row = Math.round(this.y);

    const nextCol = col + newDir[0];
    const nextRow = row + newDir[1];

    const cellType = grid[nextRow]?.[nextCol];
    if (cellType === WALL || cellType === GATE) return;

    // avoid floating point rounding drift
    this.x = col;
    this.y = row;

    this.direction = newDir;
    this.inputQueue.shift();
  }

  queueDirection(d) {
    const max_queued = 2;

    this.inputQueue.push(d);
    if (this.inputQueue.length > max_queued)
      this.inputQueue.shift();
  }

  goForward() {
    const grid = this.game.grid;
    const coord = this.nextGridCoord();
    const nextTile = grid[coord[1]][coord[0]];

    if (nextTile === WALL) {
      this.direction = [0, 0];
      this.x = Math.round(this.x);
      this.y = Math.round(this.y);
      return;
    };

    this.x += this.direction[0] * SPEED;
    this.y += this.direction[1] * SPEED;

    const width = MAP[0].length-1;

    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
  }

  step() {
    this.changeDirection();
    this.goForward();
  }
}

class Ghost {
  constructor(game, colour, x, y) {
    this.colour = colour;
    this.game = game;
    this.x = x;
    this.y = y;
    
    this.direction = this.computeDirection();
  }

  // returns the last full grid coord that the ghost was in
  gridCoord() {
    let col = Math.round(this.x);
    let row = Math.round(this.y);
    return [col, row];
  }

  draw(ctx) {
    ctx.fillStyle = this.colour;
    ctx.fillRect(TILESIZE*(this.x+DRAW_OFFSET[0]),
      TILESIZE*(this.y+DRAW_OFFSET[1]),
      TILESIZE, TILESIZE
    );

    // hide ghost as it wraps off the right
    ctx.fillStyle = "#000";
    ctx.fillRect(TILESIZE*(MAP[0].length-2),
      TILESIZE*(this.y+DRAW_OFFSET[1]),
      TILESIZE, TILESIZE
    );
  }

  aStar(target) {
    const start  = this.gridCoord();

    // already at target
    if (target[0] == start[0] && target[1] == start[1])
      return [0, 0];

    function g(cell) {
      let length = 0;
      while (cell) {
        length++;
        cell = cell.prev;
      }
      return length;
    }

    function h(cell) {
      // manhattan distance
      const dx = Math.abs(cell.coord[0] - target[0]);
      const dy = Math.abs(cell.coord[1] - target[1]);
      return dx + dy;
    }

    function f(cell) {
      return g(cell) + h(cell);
    }

    const open   = [];
    const closed = [];

    open.push({ coord: start, prev: null });

    while (open.length > 0) {
      open.sort((a, b) => f(a) - f(b));
      const cell = open.shift();
      closed.push(cell);

      const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      for (let i = 0; i < directions.length; i++) {
        const d = directions[i];
        const newCoord = [cell.coord[0] + d[0], cell.coord[1] + d[1]];

        if (newCoord[0] < 0)
          continue;
        if (newCoord[1] < 0 || newCoord[1] >= this.game.grid.length)
          continue;

        const cellType = this.game.grid[newCoord[1]][newCoord[0]];
        if (cellType == WALL) continue;

        if (open.some(c => c.coord[0] === newCoord[0] &&
            c.coord[1] === newCoord[1]))
          continue;
        if (closed.some(c => c.coord[0] === newCoord[0] &&
            c.coord[1] === newCoord[1]))
          continue;

        const newCell = { coord: newCoord, prev: cell };
        
        if (newCoord[0] === target[0] && newCoord[1] === target[1]) {
          let pathCell = newCell;
          while (pathCell.prev.prev)
            pathCell = pathCell.prev;
          const dx = pathCell.coord[0] - start[0];
          const dy = pathCell.coord[1] - start[1];
          return [dx, dy];
        } else {
          open.push(newCell);
        }
      }
    }

    alert("error: no route found to pac-man!");
    return [0, 0];
  }

  computeDirection() {
    const target = this.game.pacman.gridCoord();
    return this.aStar(target);
  }

  step() {
    // TODO: maybe think of another way to handle the movement

    // bloody floating points i swear
    function isNearlyInteger(value, margin=0.05) {
      return Math.abs(value - Math.round(value)) <= margin;
    }

    const onTile = isNearlyInteger(this.x) && isNearlyInteger(this.y);
    if (onTile) {
      this.direction = this.computeDirection();
      this.x = Math.round(this.x);
      this.y = Math.round(this.y);
    }

    this.x += this.direction[0] * SPEED;
    this.y += this.direction[1] * SPEED;

    const width = MAP[0].length-1;

    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
  }
}

class Clyde extends Ghost {
  computeDirection() {
    const pacman = this.game.pacman.gridCoord();
    const start  = this.gridCoord();
    const dx = Math.abs(start[0] - pacman[0]);
    const dy = Math.abs(start[1] - pacman[1]);
    const dist_sq = dx**2 + dy**2

    if (dist_sq > CLYDE_CHASE_DIST**2) {
      return this.aStar(pacman);
    } else {
      return this.aStar(CLYDE_HOME);
    }
  }
}

// TODO: implement the ai like it should be, not whatever this is
class Inky extends Ghost {
  computeDirection() {
    const blinky = this.game.blinky.gridCoord();
    const start  = this.gridCoord();
    const dx = Math.abs(start[0] - blinky[0]);
    const dy = Math.abs(start[1] - blinky[1]);
    const dist_sq = dx**2 + dy**2

    if (dist_sq > INKY_CHASE_DIST**2) {
      return this.aStar(blinky);
    } else {
      return this.aStar(INKY_HOME);
    }
  }
}

class Pinky extends Ghost {
  computeDirection() {
    const pacman = this.game.pacman;

    let target;
    let lookahead = PINKY_LOOKAHEAD+1;
    while (lookahead >= 0) {
      lookahead--;
      target = this.game.pacman.gridCoord();
      target[0] += pacman.direction[0] * lookahead;
      target[1] += pacman.direction[1] * lookahead;

      const ctx = document.querySelector("canvas").getContext("2d");

      if (target[0] < 0 || target[0] >= this.game.grid[0].length)
        continue
      if (target[1] < 0 || target[1] >= this.game.grid.length)
        continue

      const cellType = this.game.grid[target[1]][target[0]];
      if (cellType != WALL) break;
    }

    return this.aStar(target);
  }
}

class Game {
  constructor() {
    this.canvas = document.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.ctx.imageSmoothingEnabled = false;

    this.grid = MAP.map(row =>
      [...row].map(tile => {
        switch (tile) {
          case "#": return WALL;
          case ".": return PELLET;
          case "o": return POWERUP;
          case " ": return PATH;
          case "-": return GATE;
        }
      })
    );

    this.pacman = new Pacman(this);

    this.blinky = new Ghost(this, BLINKY, 14, 11);
    this.pinky  = new Pinky(this, PINKY,  14, 14);
    this.inky   = new Inky(this, INKY,   13, 14);
    this.clyde  = new Clyde(this, CLYDE,  16, 14);
    this.ghosts = [this.blinky, this.pinky, this.inky, this.clyde];

    window.addEventListener("resize", () => this.onResize());
    this.onResize();
    window.addEventListener("keydown", (e) => this.onKeydown(e));
  }

  onResize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.draw();
  }

  onKeydown(e) {
    switch(e.key.toLowerCase()) {
      case "arrowup":
      case "w":
        this.pacman.queueDirection([0, -1]);
        break;
      case "arrowdown":
      case "s":
        this.pacman.queueDirection([0, 1]);
        break;
      case "arrowleft":
      case "a":
        this.pacman.queueDirection([-1, 0]);
        break;
      case "arrowright":
      case "d":
        this.pacman.queueDirection([1, 0]);
        break;
    }
  }

  draw() {
    for (let y = 0; y < this.grid.length; y++) {
      const row = this.grid[y];
      for (let x = 0; x < row.length-1; x++) {
        const cell   = row[x];
        this.ctx.fillStyle = COLOURS[cell];

        const xpx = TILESIZE * (x+DRAW_OFFSET[0]);
        const ypx = TILESIZE * (y+DRAW_OFFSET[1]);

        if (cell === PELLET || cell === POWERUP) {
          const size = cell === PELLET ? PELLET_SIZE : POWERUP_SIZE;
          this.ctx.beginPath();
          this.ctx.arc(xpx + TILESIZE/2, ypx + TILESIZE/2,
            TILESIZE/size, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (cell === GATE) {
          this.ctx.fillRect(xpx, ypx+TILESIZE/3, TILESIZE, TILESIZE/3);
        } else {
          this.ctx.fillRect(xpx, ypx, TILESIZE, TILESIZE);
        }
      }
    }

    this.pacman.draw(this.ctx);
    for (let i = 0; i < this.ghosts.length; i++)
      this.ghosts[i].draw(this.ctx);
  }

  step() {
    this.pacman.step();
    for (let i = 0; i < this.ghosts.length; i++)
      this.ghosts[i].step();
  }

  clear() {
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  frame() {
    // an odd order, but this means we can draw debug overlays from
    // within step
    this.clear();
    this.draw();
    this.step()
    requestAnimationFrame(() => this.frame());
  }
}

(new Game).frame();
