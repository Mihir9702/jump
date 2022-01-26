const keys = {
    up: { pressed: false },
    right: { pressed: false },
    left: { pressed: false }
}

export function checkCollision(player, tile, background) {

    // Player is inbounds of the Tiles on the X Plane  
    if (
        player.pos.y + player.height <= tile.pos.y 
        && player.pos.y + player.height + player.vel.y >= tile.pos.y
        && player.pos.x + player.width >= tile.pos.x
        && player.pos.x <= tile.pos.x + tile.width 
        ) { 
            // Player on top of tile
            player.vel.y = 0; 
            player.vel.x = 0; 
            player.jump = false;
        }

    if (
        player.pos.y + player.height >= tile.pos.y 
        && player.pos.y + player.height + player.vel.y <= tile.pos.y + tile.height
        && player.pos.x + player.width >= tile.pos.x
        && player.pos.x <= tile.pos.x + tile.width 
        ) { 
            // Player below the tile
            player.pos.y = tile.pos.y + tile.height + 25;
            player.vel.y = 0; 
        }
}



export function keyStrokes(player, tile, background) {

    // Increase player's Y velocity 
    if (keys.up.pressed && !player.jump) {
        player.jump = true;
        player.vel.y = -15;
    } 

    // Camera functionality while increasing/decreasing player's X velocity
    if (keys.right.pressed) {
        player.vel.x = 2;
        tile.pos.x -= 8;
        background.pos.x -= 0.05;
    } else if (keys.left.pressed) {
        player.vel.x = -2;
        tile.pos.x += 8;
        background.pos.x += 0.05;
    }
}


// Logging player's input to check if they pressed or released the WASD keys
addEventListener("keydown", key => {
    switch(key.code) {
        case "KeyW": keys.up.pressed = true; break;
        case "KeyA": keys.left.pressed = true; break;
        case "KeyD": keys.right.pressed = true; break;
    }
});

addEventListener("keyup", key => {
    switch(key.code) {
        case "KeyW": keys.up.pressed = false; break;
        case "KeyA": keys.left.pressed = false; break;
        case "KeyD": keys.right.pressed = false; break;
    }
});

