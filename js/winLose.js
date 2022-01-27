
export function win(context, cw, ch) {

    context.clearRect(0,0, cw, ch);
    context.fillStyle = "#1D1F20";
    context.fillRect(0,0, cw, ch);
    context.fillStyle = "white";
    context.font = "50px monospace";
    context.fillText("Congratulations!", cw / 4, ch / 2);


    removeEventListener("keydown");

}

export function lose(context, cw, ch, player, tiles, tilesPosition, background) {

    context.clearRect(0,0, cw, ch);
    context.font = "50px monospace";
    context.fillText("Press R to Restart!", cw / 4, ch/2);

    // Restart Mechanic
    addEventListener("keydown", key => {
        if (key.code === "KeyR") {
            player.pos.x = 150;
            player.pos.y = 0; // Properly place the player on top of the starting tile
            background.pos.x = -100;
            tiles.forEach((tile, tileIndex) => {
                tile.pos.x = tilesPosition[tileIndex];
            });
        }
    });
}


