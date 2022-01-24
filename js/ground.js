export default class Ground {
    constructor(x, y) {
        this.pos = { x, y }

    }

    draw(context) {
        const image = new Image();
        image.src = "../images/PLATFORM.png";
        this.width = image.width / 2;
        this.height = image.height / 2;
        context.drawImage(image, this.pos.x, this.pos.y, this.width, this.height);
    }
}