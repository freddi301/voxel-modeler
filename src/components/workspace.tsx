import { number, object } from "./ObjectEditor";

const vector3 = (x: number, y: number, z: number) =>
  object({ x: number(x), y: number(y), z: number(z) });

const perspectiveCamera = object({
  position: vector3(0, 0, -1),
  target: vector3(0, 0, 0),
  up: vector3(0, 1, 0),
  fov: number(60),
  near: number(0.1),
  far: number(1000),
});

export const workspaceSchema = object({
  canvas: object({
    width: number(400),
    height: number(400),
  }),
  camera: perspectiveCamera,
});
