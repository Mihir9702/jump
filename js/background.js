export default class Background {
    constructor(x, y, context, ch) {
        this.pos = { x, y }
        this.background = new Image();
        this.background.src = "./images/backgrounds.jpg";
        this.context = context;
        this.ch = ch;
    }

    draw() {
        this.context.drawImage(this.background, this.pos.x, this.pos.y, this.background.width * 2, this.ch);
    }
}