// Movement feel, ported from the playable hero on the portfolio site.
// The numbers are the same; they are written in "feel units" and scaled to tiles here.
// The hero measured its world in 1% of the heading's font size. In Jump one tile is 30 of
// those units, which gives a full jump of about four tiles and a top speed of nine tiles
// a second. Changing FEEL_UNIT rescales the whole feel without changing its timing.
export const FEEL_UNIT = 1 / 30

export const GRAVITY = 1900 * FEEL_UNIT
export const JUMP_SPEED = 680 * FEEL_UNIT
export const RUN_SPEED = 270 * FEEL_UNIT
export const GROUND_ACCEL = 2600 * FEEL_UNIT
export const AIR_ACCEL = 1700 * FEEL_UNIT
export const GROUND_FRICTION = 3000 * FEEL_UNIT
export const AIR_FRICTION = 500 * FEEL_UNIT
export const MAX_FALL = 1500 * FEEL_UNIT
// Letting go of jump while rising keeps this much of the upward speed
export const JUMP_CUT = 0.45

// Grace periods in seconds that make jumps feel fair: jumping just after running off a
// ledge, or pressing jump just before landing, still counts
export const COYOTE_TIME = 0.09
export const JUMP_BUFFER = 0.12
// How long one-way platforms ignore the player after pressing down on one
export const DROP_TIME = 0.25
// Pressing down just before landing on a one-way platform still drops through it
export const DROP_BUFFER = 0.1

// The simulation runs at a fixed rate and rendering interpolates between steps
export const STEP_RATE = 120
export const STEP = 1 / STEP_RATE

// The player is a cube, measured in tiles
export const PLAYER_SIZE = 0.8
export const PLAYER_HALF = PLAYER_SIZE / 2

// When a jump clips the corner of a ceiling by less than this, slide around it instead
export const CORNER_NUDGE = 0.3

// How far below the bottom of the map the player can fall before the level restarts
export const FALL_LIMIT = 2.5
