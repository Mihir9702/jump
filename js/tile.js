export default class Tile {
    constructor(x, y, context, tileSize) {

        this.pos = { x, y }
        this.context = context;
        this.width = tileSize;
        this.height = tileSize / 4;
        this.image = new Image();
        this.image.src = "./assets/PLATFORM.png";

        this.image.onload = () => {
            this.drawTile();
        }
    }

    drawTile() {
        this.context.drawImage(this.image, this.pos.x, this.pos.y, this.width, this.height);
    }
}