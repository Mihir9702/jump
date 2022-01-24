import Player from "./player.js";
import Ground from "./ground.js";
import Background from "./background.js";
import { checkCollision, keyStrokes } from "./logic.js";

const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const cw = canvas.width = 600;
const ch = canvas.height = 600;

const player = new Player();
const grounds = [new Ground(0, 400), new Ground(100, 300), new Ground(300, 500), new Ground(550, 500)];
const background = new Background(0,0);

function main() {

    context.clearRect(0, 0, cw, ch);

    background.draw(context, ch);
    player.update(context, ch);
    grounds.forEach(ground => {
        ground.draw(context);
        keyStrokes(player, ground, background, cw);
        checkCollision(player, ground);
    })


    

    requestAnimationFrame(main);
}

main();


