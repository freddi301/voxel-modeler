import React from "react";
import { Euler, Vector3 } from "three";

export function useOrbitControls() {
  const [xRotation, setXRotation] = React.useState(0);
  const [yRotation, setYRotation] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const camera = React.useMemo(() => {
    return {
      target: { x: 0, y: 0, z: 0 },
      position: toXYZ(
        new Vector3(0, 0, -zoom).applyEuler(
          new Euler(xRotation, yRotation, 0, "XYZ")
        )
      ),
    };
  }, [xRotation, yRotation, zoom]);
  return {
    camera,
    setXRotation,
    setYRotation,
    setZoom,
  };
}

function toXYZ(vec3: Vector3) {
  return { x: vec3.x, y: vec3.y, z: vec3.z };
}
