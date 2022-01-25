export default class Player {
    constructor() {
        this.pos = { x: 100, y: 100 }
        this.vel = { x: 0, y: 0 }
        this.width = 25;
        this.height = 25;
        this.gravity = 1;
    }

    draw(context) {
        context.fillStyle = "aqua";
        context.fillRect(this.pos.x, this.pos.y, 25, 25);
    }

    update(context, ch) {
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
        this.draw(context);

        // Add gravity to the game
        if (this.pos.y + this.height + this.vel.y <= ch) { this.vel.y += this.gravity }

        // Potential Game Over screen if player falls below the canvas height 
    }


}

