import Player from "./player.js";
import Background from "./background.js";
import { makeTile, tileMatrix } from "./matrix.js";
import { checkCollision, keyStrokes } from "./logic.js";

const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const tileSize = 64;
const cw = canvas.width = 1000;
const ch = canvas.height = tileMatrix.length * tileSize;

const player = new Player();
const background = new Background(0,0);


const tiles = makeTile(0, 0, context, tileSize);

function main() {

    context.clearRect(0, 0, cw, ch);

    background.draw(context, ch);
    player.update(context, ch);
    
    tiles.forEach(tile => {
        tile.drawTile();
        checkCollision(player, tile);
        keyStrokes(player, tile, background, cw);
    });
    
    requestAnimationFrame(main);
}
main();
