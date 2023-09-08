import React from "react";
import { css } from "styled-components/macro";
import { useObjectEditor, ValueOfSchema } from "./components/ObjectEditor";
import { workbenchSchema } from "./components/workbench";
import { Atom } from "./components/Atom";
import { mat4, vec3, vec2 } from "gl-matrix";

export function App() {
  const workbench = useObjectEditor(workbenchSchema);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const width = workbench.value.viewport.width;
  const height = workbench.value.viewport.height;
  const camera = workbench.value.camera;
  React.useEffect(() => {
    const projectionMatrix = mat4.perspective(
      mat4.create(),
      camera.fovy,
      width / height,
      camera.near,
      camera.far
    );
    const viewMatrix = mat4.lookAt(
      mat4.create(),
      vec3FromObject(camera.position),
      vec3FromObject(camera.target),
      vec3FromObject(camera.up)
    );
    const viewProjectionMatrix = mat4.multiply(
      mat4.create(),
      projectionMatrix,
      viewMatrix
    );
    const context = canvasRef.current!.getContext("2d")!;
    context.clearRect(0, 0, width, height);
    for (const atom of atoms) {
      const clipPosition = vec3.transformMat4(
        vec3.create(),
        atom.position,
        viewProjectionMatrix
      );
      const screenPosition = vec2.fromValues(
        ((clipPosition[0] + 1) * width) / 2,
        ((clipPosition[1] + 1) * height) / 2
      );
      const atomSize = 9;
      context.fillStyle = "red";
      context.fillRect(
        screenPosition[0] - (atomSize + 1) / 2,
        screenPosition[1] - (atomSize + 1) / 2,
        atomSize,
        atomSize
      );
    }
  }, [
    camera.far,
    camera.fovy,
    camera.near,
    camera.position,
    camera.target,
    camera.up,
    height,
    width,
    workbench.value,
  ]);
  return (
    <div
      css={`
        display: flex;
      `}
    >
      <div
        css={`
          resize: both;
          overflow: auto;
          border: 1px solid black;
        `}
      >
        <canvas ref={canvasRef} width={width} height={height}></canvas>
      </div>
      <div
        css={`
          flex-grow: 1;
        `}
      >
        {workbench.render}
      </div>
    </div>
  );
}

function createCube(size: number, density: number) {
  const halfSize = size / 2;
  const step = size / density;
  const atoms: Array<Atom> = [];
  for (let x = -halfSize; x < halfSize; x += step) {
    for (let y = -halfSize; y < halfSize; y += step) {
      for (let z = -halfSize; z < halfSize; z += step) {
        atoms.push({
          position: vec3.fromValues(x, y, z),
        });
      }
    }
  }
  return atoms;
}

const atoms: Array<Atom> = createCube(1, 10);

function vec3FromObject(object: { x: number; y: number; z: number }) {
  return vec3.fromValues(object.x, object.y, object.z);
}
