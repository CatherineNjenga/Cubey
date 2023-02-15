/** @module gameLevels */

import { GAME_LEVELS } from "./gameLevels.js";
/**
 * @class Level
 * @classdesc It stores a level object
 * @type {object}
 * @param {string} plan - A string defining the level
 * @param {object} pos - An object representing the top,left position
 * @param {object} size - An object representing the width and height
 * @param {string} type - A string representing the background element
 * @returns {object} Level instance
 * @property {number} height - The height of the game
 * @property {number} width - The width of the game
 * @property {array} startActors - An array of 'moving' objects
 * @property {array} rows - An array of arrays of strings representing background elements
 * Positions stored as pairs of coordinates, top left being 0,0
 * Background squares are 1 unit high and wide
 */

class Level {
  constructor(plan) {
    let rows = plan.trim().split("\n").map(l => [...l]);
    this.height = rows.length;
    this.width = rows[0].length;
    this.startActors = [];
    // map passes the array index as a second argument which will map to
    // x- and y-coordinates of a given ch-character
    this.rows = rows.map((row, y) => {
      return row.map((ch, x) => {
        let type = levelChars[ch];
        if (typeof type == "string") return type;
        this.startActors.push(
          // creating 'moving' objects
          type.create(new Vec(x, y), ch));
        // return string 'empty' for the typeof != 'string'
        return "empty";
      });
    });
  }

  // Determines if a rectangle(position + size) touches a grid element of a given type
  touches(pos, size, type) {
    // Math.floor rounds down and returns the largest integer less than or equal to the given number
    // Math.ceil rounds up and returns the smaller integer greater than or equal to a given number
    let xStart = Math.floor(pos.x);
    let xEnd = Math.ceil(pos.x + size.x);
    let yStart = Math.floor(pos.y);
    let yEnd = Math.ceil(pos.y + size.y);
  
    for (let y = yStart; y < yEnd; y += 1) {
      for (let x = xStart; x < xEnd; x += 1) {
        let isOutside = x < 0 || x >= this.width ||
                        y < 0 || y >= this.height;
        let here = isOutside ? "wall" : this.rows[y][x];
        if (here == type) return true;
      }
    }
    return false;
  }
}

/**
 * @class State
 * @classdesc It tracks the state of a running game
 * @type {object}
 * @param {object} level - A level object 
 * @param {Array} actors - An array of actor objects
 * @param {string} status - The current status of a game, playing, won or lost
 * @param {number} time - A number representing time step
 * @param {Array} keys - An array indicating which keys are being held down
 * @returns {object} State instance
 * @property {object} level 
 * @property {Array} actors
 * @property {string} status
 */
class State {
  constructor(level, actors, status) {
    this.level = level;
    this.actors = actors;
    this.status = status;
  }

  static start(level) {
    return new State(level, level.startActors, "playing");
  }

  get player() {
    // find() returns the first element that satisfies the provided testing/callback function
    return this.actors.find(a => a.type == "player");  
  }

  update(time, keys) {
    let actors = this.actors
      .map(actor => actor.update(time, this, keys));
    let newState = new State(this.level, actors, this.status);
  
    if (newState.status != "playing") return newState;
  
    let player = newState.player;
    if (this.level.touches(player.pos, player.size, "lava")) {
      return new State(this.level, actors, "lost");
    }
  
    for (let actor of actors) {
      if (actor != player && overlap(actor, player)) {
        newState = actor.collide(newState);
      }
    }
    return newState;
  }
}

/**
 * 
 * @param {object} actor1 - Representing actor object 1
 * @param {object} actor2 - Representing actor object 2
 * @returns {boolean} An indication of whether actor1 overlaps actor2
 */

function overlap(actor1, actor2) {
  return actor1.pos.x + actor1.size.x > actor2.pos.x &&
         actor1.pos.x < actor2.pos.x + actor2.size.x &&
         actor1.pos.y + actor1.size.y > actor2.pos.y && 
         actor1.pos.y < actor2.pos.y + actor2.size.y;
}

/**
 * @class Vec
 * @classdesc This is a two-dimensional vector, an object with x and y properties
 * @type {object} 
 * @param {number} x The X-coordinate
 * @param {number} y The Y-coordinate
 * @param {number} other A value to be added to the x- or y-coordinate
 * @param {number} factor A value to be multiplied by the x- or y-coordinate
 * @returns {object} Vec instance
 * @property {number} x
 * @property {number} y
 */

class Vec {
  constructor(x, y) {
    this.x = x; this.y = y;
  }
  plus(other) {
    return new Vec(this.x + other.x, this.y + other.y);
  }
  times(factor) {
    return new Vec(this.x * factor, this.y * factor);
  }
}

/**
 * @class Player
 * @classdesc Defines the behavior of the player actor
 * @type {object}
 * @param {object} pos - An object representing the top,left position
 * @param {object} speed - An object with x property simulating momentum and y simulating gravity
 * @returns {object} Player instance
 * @property {object} pos
 * @property {object} speed
 */

const playerXSpeed = 7;
const gravity = 30;
const jumpSpeed = 17;

class Player {
  constructor(pos, speed) {
    this.pos = pos;
    this.speed = speed;
  }
  
  get type() { return "player"; }

  static create(pos) {
    return new Player(pos.plus(new Vec(0, -0.5)),
                      new Vec(0, 0));
  }

  update(time, state, keys) {
    let xSpeed = 0;
    if (keys.ArrowLeft) xSpeed -= playerXSpeed;
    if (keys.ArrowRight) xSpeed += playerXSpeed;
    let pos = this.pos;
    let movedX = pos.plus(new Vec(xSpeed * time, 0));
    if (!state.level.touches(movedX, this.size, "wall")) {
      pos = movedX;
    }
  
    let ySpeed = this.speed.y + time * gravity;
    let movedY = pos.plus(new Vec(0, ySpeed * time));
    if (!state.level.touches(movedY, this.size, "wall")) {
      pos = movedY;
    } else if (keys.ArrowUp && ySpeed > 0) {
      ySpeed = -jumpSpeed;
    } else {
      ySpeed = 0;
    }
    return new Player(pos, new Vec(xSpeed, ySpeed));
  }
}

Player.prototype.size = new Vec(0.8, 1.5);

/**
 * @class Lava
 * @classdesc Defines the behavior of the lava actors
 * @type {object}
 * @param {object} pos - An object representing the top,left position
 * @param {object} speed - An object simulating momentum either vertically or horizontally
 * @param {object} reset - An object simulating bouncing, the position set to the original 'pos' on colliding with wall
 * @param {string} ch - The character that the Level constructor passes
 * @param {object} state - A state instance
 * @param {number} time - A time step
 * @returns {object} Lava instance
 * @property {object} pos
 * @property {object} speed
 * @property {object} reset
 */

class Lava {
  constructor(pos, speed, reset) {
    this.pos = pos;
    this.speed = speed;
    this.reset = reset;
  }
  
  get type() {return "lava"; }

  static create(pos, ch) {
    if (ch == "=") {
      return new Lava(pos, new Vec(2, 0));
    } else if (ch == "|") {
      return new Lava(pos, new Vec(0, 2));
    } else if (ch == "v") {
      return new Lava(pos, new Vec(0, 3), pos);
    }
  }

  collide(state) {
    return new State(state.level, state.actors, "lost");
  }
  // Input -> time,? state,object
  update(time, state) {
    let newPos = this.pos.plus(this.speed.times(time));
    if (!state.level.touches(newPos, this.size, "wall")) {
      return new Lava(newPos, this.speed, this.reset);
    } else if (this.reset) {
      return new Lava(this.reset, this.speed, this.reset);
    } else {
      // bouncing lava inverts its speed by multiplying it by -1 moving it in the opposite direction
      return new Lava(this.pos, this.speed.times(-1));
    }
  }
}

Lava.prototype.size = new Vec(1, 1);

/**
 * @class Coin
 * @classdesc Defines the behavior of coin actors
 * @type {object}
 * @param {object} pos - An object representing an instance's top,left position
 * @param {object} basePos - An object simulating an instance's base position
 * @param {number} wobble - A slight vertical back-and-forth motion
 * @returns {object} Coin instance
 * @property {object} pos
 * @property {object} basePos
 * @property {number} wobble
 */

const wobbleSpeed = 8, wobbleDist = 0.09;

class Coin {
  constructor(pos, basePos, wobble) {
    this.pos = pos;
    this.basePos = basePos;
    this.wobble = wobble;
  }

  get type() { return "coin"; }

  static create(pos) {
    let basePos = pos.plus(new Vec(0.2, 0.1));
    return new Coin(basePos, basePos,
                    // Math.PI * 2 simulates working with a unit circle (radius = 1) 
                    // whose circumference is 2*PI*r*r-> 2*PI*1-> 2*PI
                    // Math.random simulates a random starting position on the wave
                    Math.random() * Math.PI * 2);
  }

  collide(state) {
    let filtered = state.actors.filter(a => a != this);
    let status = state.status;
    if (!filtered.some(a => a.type == "coin")) status = "won";
    return new State(state.level, filtered, status);
  }

  update(time) {
    let wobble = this.wobble + time * wobbleSpeed;
    // Math.sin gives the y-coordinate of a point on a unit circle
    let wobblePos = Math.sin(wobble) * wobbleDist;
    return new Coin(this.basePos.plus(new Vec(0, wobblePos)),
                    this.basePos, wobble);
  };
}

Coin.prototype.size = new Vec(0.6, 0.6);

/**
 * @class Monster
 * @classdesc Defines the behavior of the monster actor
 * @type {object}
 * @param {object} pos - An object simulating an instance's top,left position
 * @param {object} speed - An object simulating an instance's momentum
 * @returns Monster instance
 * @property {object} pos
 * @property {object} speed
 */

class Monster {
  constructor(pos, speed) {
    this.pos = pos;
    this.speed = speed;
  }

  get type() { return "monster"; }

  static create(pos) {
    return new Monster(pos.plus(new Vec(0, -1)), 
                       new Vec(2, 0));
  }

  collide(state) {
    let filtered = state.actors.filter(a => a != this);
    return new State(state.level, filtered, state.status);
  }

  update(time, state) {
    let newPos = this.pos.plus(this.speed.times(time));
    if (!state.level.touches(newPos, this.size, "wall")) {
      return new Monster(newPos, this.speed);
    } else {
      return new Monster(this.pos, this.speed.times(-1));
    }
  }  
}

Monster.prototype.size = new Vec(1.2, 2);

/**
 * It maps plan's string characters to either background grid types or actor classes
 * @type {object}
 */

const levelChars = {
  ".": "empty", "#": "wall", "+": "lava",
  "@": Player, "o": Coin,
  "=": Lava, "|": Lava, "v": Lava,
  "M": Monster,
};

/**
 * 
 * @param {string} name 
 * @param {object} attrs 
 * @param  {...Array} children 
 * @returns 
 */
function elt(name, attrs, ...children) {
  let dom = document.createElement(name);
  for (let attr of Object.keys(attrs)) {
    dom.setAttribute(attr, attrs[attr]);
  }
  for (let child of children) {
    dom.appendChild(child);
  }
  return dom;
}
/**
 * @class DOMDisplay
 * @classdesc A display is created by passing a parent element to append itself and a level object
 * @type {object}
 * @param {object} parent -  DOM element object
 * @param {object} level - A level instance
 * @returns {object} A DOMDisplay instance
 * @property {object} dom - A DOM object
 * @property {object} actorLayer - Tracks the element that holds actors for easy removal and replacement
 */

class DOMDisplay {
  constructor(parent, level) {
    // Level's background grid, which does not change, is drawn once
    this.dom = elt("div", {class: "game"}, drawGrid(level));
    // Actors are drawn every time the display is updated with a given state
    this.actorLayer = null;
    parent.appendChild(this.dom);
  }

  clear() { this.dom.remove(); }

  syncState(state) {
    if (this.actorLayer) this.actorLayer.remove();
    this.actorLayer = drawActors(state.actors);
    this.dom.appendChild(this.actorLayer);
    this.dom.className = `game ${state.status}`;
    this.scrollPlayerIntoView(state);
  }

  scrollPlayerIntoView(state) {
    let width = this.dom.clientWidth;
    let height = this.dom.clientHeight;
    let margin = width / 3;

    // The viewport
    let left = this.dom.scrollLeft , right = left + width;
    let top = this.dom.scrollTop, bottom = top + height;

    let player = state.player;
    let center = player.pos.plus(player.size.times(0.5))
                          .times(scale);
                      
    if (center.x < left + margin) {
      this.dom.scrollLeft = center.x - margin;
    } else if (center.x > right - margin) {
      this.dom.scrollLeft = center.x + margin - width;
    }
    if (center.y < top + margin) {
      this.dom.scrollTop = center.y - margin;
    } else if (center.y > bottom - margin) {
      this.dom.scrollTop = center.y + margin - height;
  }
  }
}

/**
 * It gives the number of pixels that a single unit takes up on the screen
 */

const scale = 20;

/**
 * 
 * @param {object} level - A level instance
 * @returns {object} A DOM object
 */

function drawGrid(level) {
  return elt("table", {
    class: "background",
    style: `width: ${level.width * scale}px`
  }, ...level.rows.map(row => 
    elt("tr", {style: `height: ${scale}px`},
        ...row.map(type => elt("td", {class: type})))
  ));
}

/**
 * 
 * @param {Array} actors - An array of actor objects 
 * @returns {object} A DOM object
 */

function drawActors(actors) {
  return elt("div", {}, ...actors.map(actor => {
    let rect = elt("div", {class: `actor ${actor.type}`});
    rect.style.width = `${actor.size.x * scale}px`;
    rect.style.height = `${actor.size.y * scale}px`;
    rect.style.left = `${actor.pos.x * scale}px`;
    rect.style.top = `${actor.pos.y * scale}px`;
    return rect;
  }));
}

/**
 * 
 * @param {Array} keys - An array of keys being held down 
 * @returns An object of the keys being held down
 */

function trackKeys(keys) {
  let down = Object.create(null);
  function track(event) {
    if (keys.includes(event.key)) {
      down[event.key] = event.type == "keydown";
      event.preventDefault();
    }
  }
  window.addEventListener("keydown", track);
  window.addEventListener("keyup", track);
  return down;
}

const arrowKeys =
  trackKeys(["ArrowLeft", "ArrowRight", "ArrowUp"]);

/**
 * 
 * @param {object} frameFunc 
 */

function runAnimation(frameFunc) {
  let lastTime = null;
  function frame(time) {
    if (lastTime != null) {
      let timeStep = Math.min(time - lastTime, 100) / 1000;
      if (frameFunc(timeStep) === false) return;
    }
    lastTime = time;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/**
 * 
 * @param {object} level - A level instance
 * @param {object} Display - A Display instance
 * @returns {object} - A new Promise object
 */

function runLevel(level, Display) {
  let display = new Display(document.body, level);
  let state = State.start(level);
  let ending = 1;
  return new Promise(resolve => {
    runAnimation(time => {
      state = state.update(time, arrowKeys);
      display.syncState(state);
      if (state.status == "playing") {
        return true;
      } else if (ending > 0) {
        ending -= time;
        return true;
      } else {
        display.clear();
        resolve(state.status);
        return false;
      }
    });
  });
}

/**
 * 
 * @param {Array} plans - An array of plans 
 * @param {object} Display - A Display instance 
 */

async function runGame(plans, Display) {
  for (let level = 0; level < plans.length;) {
    let status = await runLevel(new Level(plans[level]),
                                Display);
    if (status == "won") level += 1;
  }
  console.log("You've won!");
}


runGame(GAME_LEVELS, DOMDisplay);
