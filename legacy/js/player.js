export default class Player {

    constructor(context, ch) {

        this.pos = { x: 50, y: 0 }
        this.vel = { x: 0, y: 0 }
        this.width = 25;
        this.height = 25;
        this.gravity = 1;
        this.jump = false;
        this.context = context;
        this.canvasHeight = ch;
        this.fillStyle = "aqua";

    }
    
    draw() {

        this.context.fillStyle = this.fillStyle;
        this.context.fillRect(this.pos.x, this.pos.y, 25, 25);

    }

    update() {

        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
        
        // Simulate gravity by decreasing the player's Y velocity
        if (this.pos.y + this.height + this.vel.y <= this.canvasHeight) { this.vel.y += this.gravity }
        
        this.draw();

    }

}

