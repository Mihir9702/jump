export function lose(context, cw, ch, player, tiles, tilesPosition, background) {

    context.clearRect(0,0, 1024, ch);
    context.font = "50px monospace";
    context.fillText("Press R to restart!", cw / 4, ch/2);

    // Restart Mechanic
    addEventListener("keydown", key => {
        if (key.code === "KeyR") {
            player.pos.x = 0;
            player.pos.y = 100;
            background.pos.x = 0;
            tiles.forEach((tile, tileIndex) => {
                tile.pos.x = tilesPosition[tileIndex];
            });
        }
    });
}