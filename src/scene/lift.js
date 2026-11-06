// Shared between the camera and the chairlift: how far up the line your chair is (0 at the bottom station,
// 1 at the top). The camera sets it while you ride; the chairs on the cable all move with it.
export const ride = { t: 0 }

// Where your eye is, relative to the grip on the cable, in world units (the Blender model is in metres, scaled
// by 0.5): a touch right of the hanger, 0.81 under the cable, a hair forward.
export const EYE = { x: 0.14, y: -0.81, z: 0.04 }
