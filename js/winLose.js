export function win(context, cw, ch) {

    context.clearRect(0,0, cw, ch);
    context.fillStyle = "#1D1F20";
    context.fillRect(0,0, cw, ch);
    context.fillStyle = "white";
    context.font = "50px monospace";
    context.fillText("Congratulations!", cw / 4, ch / 2);

    removeEventListener("keydown");

}

export function lose(context, cw, ch, player, tiles, tilesXPosition, background, instructions) {

    context.clearRect(0,0, cw, ch);
    context.font = "50px monospace";
    context.fillText("Press R to Restart!", cw / 4, ch/2);

    // Restart Mechanic resets all the positions
    addEventListener("keypress", key => {
        if (key.code === "KeyR") {
            player.pos.x = 150;
            player.pos.y = 550; 
            background.pos.x = -100;
            instructions.x = 20;
            tiles.forEach((tile, tileIndex) => {
                tile.pos.x = tilesXPosition[tileIndex];
            });
        }
    }, { once: true });

}


