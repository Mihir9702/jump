export default class Background {
    constructor(x, y) {
        this.pos = { x, y }
    }

    draw(context, cw, ch) {
        const background = new Image();
        background.src = "../images/backgrounds.jpg";
        context.drawImage(background, this.pos.x, this.pos.y, background.width * 1.25, ch);
    }
}