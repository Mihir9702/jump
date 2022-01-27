export default class Tile {
    constructor(x, y, context, tileSize) {
        this.pos = { x, y }
        this.context = context;
        this.width = tileSize;
        this.height = tileSize / 4;
        this.image = new Image();
        this.image.src = "../images/PLATFORM.png";

        this.drawTile();
    }

    drawTile() {
        this.context.drawImage(this.image, this.pos.x, this.pos.y, this.width, this.height);
    }
}