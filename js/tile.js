export class Tile {
    constructor(x, y, context, tileSize) {
        this.pos = { x, y }
        this.context = context;
        this.width = tileSize;
        this.height = tileSize;
        this.drawTile();
    }

    drawTile() {
        this.context.fillStyle = "gray";
        this.context.fillRect(this.pos.x, this.pos.y, this.width, this.height);

        // Will use later to change tile from gray square to images // 
        // const image = new Image();
        // image.src = "../images/PLATFORM.png";
        // this.width = image.width / 2;
        // this.height = image.height / 2;
        // context.drawImage(image, this.pos.x, this.pos.y, this.width, this.height);
    }
}