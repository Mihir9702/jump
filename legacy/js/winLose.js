export function win(canvas, container, click) {
    
    canvas.remove();
    container.style.display = "grid";
    click.style.display = "grid";

}

export function lose(context, cw, ch, player, tiles, tilesXPosition, background, instructions) {

    context.clearRect(0,0, cw, ch);
    context.font = "50px monospace";
    context.fillText("Press R to Restart!", cw / 4, ch/2);

    // Restart Mechanic resets all the positions
    addEventListener("keypress", key => {
        if (key.code === "KeyR") {
            player.pos.x = 50;
            player.pos.y = 550; 
            background.pos.x = -100;
            instructions.x = 20;
            tiles.forEach((tile, tileIndex) => {
                tile.pos.x = tilesXPosition[tileIndex];
            });
        }
    }, { once: true });

}


