import React from "react";
import { Euler, Vector2, Vector3 } from "three";
import { clamp, degToRad } from "three/src/math/MathUtils";

export function useOrbitControls() {
  const [xRotation, setXRotation] = React.useState(0);
  const [yRotation, setYRotation] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [position, setPosition] = React.useState(new Vector3(0, 0, 0));
  const rotation = React.useMemo(
    () => new Euler(degToRad(xRotation), degToRad(yRotation), 0, "YXZ"),
    [xRotation, yRotation]
  );
  const setXRotationClamped = React.useCallback(
    (mapper: (xRotation: number) => number) => {
      setXRotation((xRotation) => clamp(mapper(xRotation), -90, 90));
    },
    []
  );
  const moveBy = React.useCallback(
    (x: number, y: number, z: number) => {
      setPosition((position) =>
        new Vector3(x, y, z).applyEuler(rotation).add(position)
      );
    },
    [rotation]
  );
  const camera = React.useMemo(() => {
    return {
      target: toXYZ(position),
      position: toXYZ(
        new Vector3(0, 0, -zoom).applyEuler(rotation).add(position)
      ),
    };
  }, [position, rotation, zoom]);
  const [lightPosition, setLightPosition] = React.useState(new Vector2(0, 0));
  const light = React.useMemo(() => {
    const direction = new Vector3(
      lightPosition.x,
      lightPosition.y,
      -(1 - lightPosition.length())
    ).normalize();
    return direction.applyEuler(rotation);
  }, [lightPosition, rotation]);
  return {
    camera,
    light,
    rotation,
    setXRotationClamped,
    setYRotation,
    setZoom,
    moveBy,
    setLightPosition,
  };
}

function toXYZ(vec3: Vector3) {
  return { x: vec3.x, y: vec3.y, z: vec3.z };
}
