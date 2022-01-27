import Player from "./Player.js";
import Background from "./Background.js";
import Instructions from "./Instructions.js";
import { makeTile, tileMatrix } from "./Matrix.js";
import { checkCollision, keyStrokes } from "./Logic.js";
import { win, lose } from "./WinLose.js";

const mainMenu = document.querySelector(".mainMenu");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const tileSize = 64;
const cw = canvas.width = 1024;
const ch = canvas.height = tileMatrix.length * tileSize;

const background = new Background(-100,0);
const player = new Player(context, ch);
const instructions = new Instructions(context);

const tiles = makeTile(0, 0, context, tileSize); 
const tilesXPosition = []; 


function main() {
    canvas.style.display = "grid";
    
    context.clearRect(0, 0, cw, ch);
    
    background.draw(context, ch);
    instructions.draw();
    player.update();

    tiles.forEach(tile => {
        tile.drawTile();
        keyStrokes(player, tile, background, instructions);
        checkCollision(player, tile, background);
        tilesXPosition.push(tile.pos.x);
    });
    
    
    // Win Condition - | Player's X Position is at the Final Tile's X position | Player is not below the screen | Player is idle on the Tile | 
    if (player.pos.x >= 898 && player.pos.y < ch && player.vel.y === 0) { win(context, cw, ch) }

    // Lose Condition - | Player's Y Position is below the Canvas |
    if (player.pos.y > ch) { lose(context, cw, ch, player, tiles, tilesXPosition, background, instructions) }
    
    requestAnimationFrame(main);
}


// Loads the Canvas on Enter key from the Main Menu
addEventListener("keypress", key => { if (key.code === "Enter") { mainMenu.style.display = "none"; setTimeout(main, 500) } }, { once: true });
