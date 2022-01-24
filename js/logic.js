export function checkCollision(player, ground) {
    if (player.pos.y + player.height <= ground.pos.y 
        && player.pos.y + player.height + player.vel.y >= ground.pos.y
        && player.pos.x + player.width >= ground.pos.x
        && player.pos.x <= ground.pos.x + ground.width) { player.vel.y = 0 }
}


const keys = {
    up: { pressed: false },
    right: { pressed: false },
    left: { pressed: false }
}

export function keyStrokes(player, ground, background, cw) {
    addEventListener("keydown", key => {
        switch(key.code) {
            case "KeyW":
                keys.up.pressed = true;
                break;
            case "KeyA":
                keys.left.pressed = true;
                break;
            case "KeyS":
                break;
            case "KeyD":
                keys.right.pressed = true;
                break;
        }
    })

    addEventListener("keyup", key => {
        switch(key.code) {
            case "KeyW":
                keys.up.pressed = false;
                break;
            case "KeyA":
                keys.left.pressed = false;
                break;
            case "KeyS":
                break;
            case "KeyD":
                keys.right.pressed = false;
                break;
        }
    })

    // CHANGE PLAYER POSITION BASED OFF KEYSTROKE
    if (keys.right.pressed && player.pos.x < cw - player.width) player.vel.x = 3
    else if (keys.left.pressed && player.pos.x > 0) player.vel.x = -3
    else if (keys.up.pressed) player.vel.y = -7 
    else player.vel.x = 0 


    // GROUND MOVEMENT BASED ON PLAYER POSITION
    if (keys.right.pressed) {
        ground.pos.x -= 2
        background.pos.x -= 0.25
    } else if (keys.left.pressed ) {
        ground.pos.x += 2
        background.pos.x += 0.25
    }

    // if (player.x.pos >= 10000) { }  WIN CONDITION ?? FINISH LINE / FLAG
}