export default class Instructions {
    constructor(context) {
        this.x = 20;
        this.context = context;
        this.fillStyle = "white";
        this.font = "28px monospace";
    }

    draw() {
        this.context.fillStyle = this.fillStyle;
        this.context.font = this.font;

        // Instructions
        this.context.fillText("Jump on the platforms to get", this.x, 50);
        this.context.fillText("to the end but remember,", this.x, 100);
        this.context.fillText("DO NOT LOOK DOWN 👀", this.x, 150);

        // Keybinds
        this.context.fillText("W - Jump", this.x, 200);
        this.context.fillText("A - Move Left", this.x, 250);
        this.context.fillText("D - Move Right", this.x, 300);
    }
}