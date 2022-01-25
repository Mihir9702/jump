import { Tile } from "./tile.js";

export const tileMatrix = [
    [" "," "," "," "," "," "," "," "," "," "],
    [" "," "," "," "," "," "," "," "," "," "],
    [" "," "," "," "," "," "," "," "," "," "],
    [" "," "," ","X","X","X"," "," ","X","X"],
    [" "," "," ","X","X","X"," "," ","X","X"],
    [" "," "," "," "," "," ","X","X","X","X"],
    [" "," "," "," "," "," ","X","X","X","X"],
    ["X","X","X","X","X","X","X","X","X","X"],
    ["X","X","X","X","X","X","X","X","X","X"],
    ["X","X","X","X","X","X","X","X","X","X"],
]

const tiles = [];

export function makeTile(x, y, context, tileSize) {
    tileMatrix.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            if (cell === "X") {
                x = colIndex * tileSize;
                y = rowIndex * tileSize;
                tiles.push(new Tile(x, y, context, tileSize));
            }
        });
    });
    return tiles;
}


