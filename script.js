const WALL    = 1;
const PATH    = 0;
const PELLET  = 2;
const POWERUP = 3;

const COLOURS = {
  [WALL]:   "#2121de",
  [PATH]:   "#000000",
  [PELLET]: "#ffb8ae",
  [POWERUP]: "#ffb8ae",
};

const PACMAN = "#ffff00";

const TILESIZE = 24;

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
  "#     #.##### ## #####.#     #",
  "#     #.##          ##.#     #",
  "#     #.## ######## ##.#     #",
  "#######.## #      # ##.#######",
  "           #      #           ",
  "#######.## #      # ##.#######",
  "#     #.## ######## ##.#     #",
  "#     #.##          ##.#     #",
  "#     #.## ######## ##.#     #",
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
    this.x = 13.5;
    this.y = 23;
    this.direction = [0, 0];
    this.speed = 1/15;
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
    ctx.fillRect(TILESIZE*(this.x+DRAW_OFFSET[0]),
      TILESIZE*(this.y+DRAW_OFFSET[1]),
      TILESIZE, TILESIZE
    );

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
    const alignedX = Math.abs(this.x - Math.round(this.x)) < this.speed;
    const alignedY = Math.abs(this.y - Math.round(this.y)) < this.speed;
    if (newDir[0] !== 0 && !alignedY) return;
    if (newDir[1] !== 0 && !alignedX) return;

    const col = Math.round(this.x);
    const row = Math.round(this.y);

    const nextCol = col + newDir[0];
    const nextRow = row + newDir[1];

    if (grid[nextRow]?.[nextCol] === WALL) return;

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

    if (nextTile == WALL) {
      this.direction = [0, 0];
      return;
    };

    this.x += this.direction[0] * this.speed;
    this.y += this.direction[1] * this.speed;

    const width = MAP[0].length-1;

    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
  }

  step() {
    this.changeDirection();
    this.goForward();
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
        }
      })
    );

    this.pacman = new Pacman(this);

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
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y = 0; y < this.grid.length; y++) {
      const row = this.grid[y];
      for (let x = 0; x < row.length-1; x++) {
        const cell   = row[x];
        this.ctx.fillStyle = COLOURS[cell];
        this.ctx.fillRect(TILESIZE*(x+DRAW_OFFSET[0]),
          TILESIZE*(y+DRAW_OFFSET[1]),
          TILESIZE, TILESIZE);
      }
    }

    this.pacman.draw(this.ctx);
  }

  step() {
    this.pacman.step()
  }

  frame() {
    this.step()
    this.draw();
    requestAnimationFrame(() => this.frame());
  }
}

(new Game).frame();
