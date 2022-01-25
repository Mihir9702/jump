const keys = {
    up: { pressed: false },
    right: { pressed: false },
    left: { pressed: false }
}

export function checkCollision(player, tile) {
    if (
        player.pos.y + player.height <= tile.pos.y 
        && player.pos.y + player.height + player.vel.y >= tile.pos.y
        && player.pos.x + player.width >= tile.pos.x
        && player.pos.x <= tile.pos.x + tile.width
        ) { player.vel.y = 0; player.vel.x = 0; }
}

export function keyStrokes(player, tile, background, cw) {


    // Increase player's Y velocity 
    if (keys.up.pressed) player.vel.y = -7 


    // Camera functionality while increasing/decreasing player's X velocity
    if (keys.right.pressed) {
        player.vel.x = 3
        tile.pos.x -= 1
        background.pos.x -= 0.01
    } else if (keys.left.pressed) {
        player.vel.x = -3
        tile.pos.x += 1
        background.pos.x += 0.01
    }

    // Create Win condition for player if player reaches a certain x position
    // if (player.x.pos >= 10000) {} 
}


// Logging player's input to check if they pressed or released the WASD keys
addEventListener("keydown", key => {
    switch(key.code) {
        case "KeyW": keys.up.pressed = true; break;
        case "KeyA": keys.left.pressed = true; break;
        case "KeyS": break;
        case "KeyD": keys.right.pressed = true; break;
    }
});

addEventListener("keyup", key => {
    switch(key.code) {
        case "KeyW": keys.up.pressed = false; break;
        case "KeyA": keys.left.pressed = false; break;
        case "KeyS": break;
        case "KeyD": keys.right.pressed = false; break;
    }
});