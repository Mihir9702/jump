const gravity = 0.5;


export default class Player {
    constructor() {
        this.pos = { x: 100, y: 200 }
        this.vel = { x: 0, y: 1 }
        this.width = 25;
        this.height = 25;
    }

    draw(context) {
        context.fillStyle = "aqua";
        context.fillRect(this.pos.x, this.pos.y, this.width, this.height);
    }

    update(context, ch) {
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
        this.draw(context);

        if (this.pos.y + this.height + this.vel.y <= ch) { this.vel.y += gravity }
        else { this.vel.y = 0 }
        
    }
}