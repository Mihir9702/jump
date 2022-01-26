export default class Tile {
    constructor(x, y, context, tileSize) {
        this.pos = { x, y }
        this.context = context;
        this.width = tileSize;
        this.height = tileSize / 4;
        this.drawTile();
    }

    drawTile() {
        const image = new Image();
        image.src = "../images/PLATFORM.png";
        this.context.drawImage(image, this.pos.x, this.pos.y, this.width, this.height);
    }
}