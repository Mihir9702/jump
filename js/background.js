export default class Background {
    constructor(x, y, context, ch) {
        this.pos = { x, y }
        this.background = new Image();
        this.background.src = "./assets/backgrounds.jpg";
        this.context = context;
        this.ch = ch;
        this.backgroundAudio = new Audio();
        this.backgroundAudio.src = "./assets/springField96.wav";
        this.backgroundAudio.volume = 0.2;
    }

    draw() {
        this.backgroundAudio.play();
        this.context.drawImage(this.background, this.pos.x, this.pos.y, this.background.width * 2, this.ch);
    }
}