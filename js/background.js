export default class Background {
    constructor(x, y) {
        this.pos = { x, y }
        this.background = new Image();
        this.background.src = "../images/backgrounds.jpg";
    }

    draw(context, ch) {
        context.drawImage(this.background, this.pos.x, this.pos.y, this.background.width * 2, ch);
    }
}