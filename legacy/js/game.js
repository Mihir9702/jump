import Player from "./player.js";
import Background from "./background.js";
import Instructions from "./instructions.js";
import { makeTile, tileMatrix } from "./matrix.js";
import { checkCollision, keyStrokes } from "./logic.js";
import { win, lose } from "./winLose.js";

// Grabbing elements from the DOM
const mainMenu = document.querySelector(".mainMenu");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const container = document.getElementById("container");
const click = document.getElementById("click");

// Resizing the canvas
const tileSize = 64;
const cw = (canvas.width = 1024);
const ch = (canvas.height = tileMatrix.length * tileSize);

// Instances of the classes
const background = new Background(-100, 0, context, ch);
const player = new Player(context, ch);
const instructions = new Instructions(context);

// Array of the tiles
const tiles = makeTile(0, 0, context, tileSize);
const tilesXPosition = [];

background.onload = () => {};

function main() {
  canvas.style.display = "grid";
  context.clearRect(0, 0, cw, ch);

  background.draw();
  player.update();
  instructions.draw();

  tiles.forEach((tile) => {
    tile.drawTile();
    keyStrokes(player, tile, background, instructions);
    checkCollision(player, tile);
    tilesXPosition.push(tile.pos.x);
  });

  // Win Condition - | Player's X Position is at the Final Tile's X position | Player is not below the screen | Player is idle on the Tile |
  if (player.pos.x >= 450 && player.pos.y < ch && player.vel.y === 0) {
    win(canvas, container, click);
  }

  // Lose Condition - | Player's Y Position is below the Canvas |
  if (player.pos.y > ch) {
    lose(
      context,
      cw,
      ch,
      player,
      tiles,
      tilesXPosition,
      background,
      instructions
    );
  }

  requestAnimationFrame(main);
}

// Loads the Canvas on Enter key from the Main Menu
document.addEventListener(
  "keypress",
  (key) => {
    if (key.code === "Enter") {
      mainMenu.style.display = "none";
      setTimeout(main, 500);
    }
  },
  { once: true }
);
