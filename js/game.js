import Player from "./player.js";
import Background from "./background.js";
import { makeTile, tileMatrix } from "./matrix.js";
import { checkCollision, keyStrokes } from "./logic.js";
import { win, lose } from "./winLose.js";

const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const tileSize = 64;
const cw = canvas.width = 1024;
const ch = canvas.height = tileMatrix.length * tileSize;

const background = new Background(-100,0);
const player = new Player(context, ch);

const tiles = makeTile(0, 0, context, tileSize); // Array of Tiles
const tilesPosition = []; // Tiles X Position

function main() {

    context.clearRect(0, 0, cw, ch);

    background.draw(context, ch);
    player.update();
    
    tiles.forEach(tile => {
        tile.drawTile();
        keyStrokes(player, tile, background);
        checkCollision(player, tile, background);
        tilesPosition.push(tile.pos.x);
    });

    
    // Win / Lose Condition
    if (player.pos.x >= 900 && player.pos.y < ch && player.vel.y === 0) { win(context, cw, ch); }
    if (player.pos.y > ch) { lose(context, cw, ch, player, tiles, tilesPosition, background) }
    
    requestAnimationFrame(main);
}

main();


// 644 422



