import { number, object, boolean } from "./ObjectEditor";

const vector3 = (x: number, y: number, z: number) =>
  object({ x: number(x), y: number(y), z: number(z) });

const perspectiveCamera = object({
  position: vector3(0, 0, -1),
  target: vector3(0, 0, 0),
  up: vector3(0, 1, 0),
  fov: number(60),
  near: number(0.01),
  far: number(1000),
});

export const workbenchSchema = object({
  camera: perspectiveCamera,
  light: vector3(0, 0, -1),
  plane: object({
    show: boolean(true),
  }),
});
