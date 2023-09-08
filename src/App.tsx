import React from "react";
import { css } from "styled-components/macro";
import { useObjectEditor, ValueOfSchema } from "./components/ObjectEditor";
import { workbenchSchema } from "./components/workbench";
import { Atom } from "./components/Atom";
import { mat4, vec3, vec2 } from "gl-matrix";

export function App() {
  const workbench = useObjectEditor(workbenchSchema);
  const canvas3dRef = React.useRef<HTMLCanvasElement>(null);
  const canvas2dRef = React.useRef<HTMLCanvasElement>(null);
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
    const screenAtoms: Array<Atom | undefined> = new Array(width * height);
    const screenDepth: Array<number | undefined> = new Array(width * height);
    const getScreenIndex = (x: number, y: number) => x + y * width;
    const context2d = canvas2dRef.current!.getContext("2d")!;
    context2d.fillStyle = "black";
    context2d.fillRect(0, 0, width, height);
    // lets place atoms on the screen
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
      const existingDepth =
        screenDepth[getScreenIndex(screenPosition[0], screenPosition[1])];
      if (existingDepth === undefined || existingDepth > clipPosition[2]) {
        screenAtoms[
          getScreenIndex(
            Math.trunc(screenPosition[0]),
            Math.trunc(screenPosition[1])
          )
        ] = atom;
      }
      drawCircle(context2d, screenPosition[0], screenPosition[1], 5);
    }
    const context3d = canvas3dRef.current!.getContext("webgl")!;
    context3d.viewport(0, 0, width, height);
    const triangles: Array<[vec3, vec3, vec3]> = [];
    // for each atom on the screen, find the nearest 2 atoms, and make a triangle of it
    const maxAtomScreenDistance = 20; // pixels, aka kernel size
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const atom = screenAtoms[getScreenIndex(x, y)];
        if (atom) {
          const nearestAtoms: Array<Atom> = [];
          for (
            let dx = -maxAtomScreenDistance;
            dx <= maxAtomScreenDistance;
            dx++
          ) {
            for (
              let dy = -maxAtomScreenDistance;
              dy <= maxAtomScreenDistance;
              dy++
            ) {
              const neighbor = screenAtoms[getScreenIndex(x + dx, y + dy)];
              if (neighbor) {
                if (neighbor === atom) {
                  continue;
                }
                if (nearestAtoms.length < 4) {
                  nearestAtoms.push(neighbor);
                  continue;
                }
                const distance = vec3.distance(
                  atom.position,
                  neighbor.position
                );
                for (const [index, nearestAtom] of nearestAtoms.entries()) {
                  const nearestDistance = vec3.distance(
                    atom.position,
                    nearestAtom.position
                  );
                  if (distance < nearestDistance) {
                    nearestAtoms[index] = neighbor;
                    break;
                  }
                }
              }
            }
          }
          nearestAtoms.unshift(atom);
          for (let ni = 0; ni < nearestAtoms.length - 2; ni++) {
            triangles.push([
              nearestAtoms[ni + 0].position,
              nearestAtoms[ni + 1].position,
              nearestAtoms[ni + 2].position,
            ]);
          }
        }
      }
    }
    drawTriangles(context3d, projectionMatrix, viewMatrix, triangles);
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
        <canvas ref={canvas3dRef} width={width} height={height}></canvas>
        <canvas ref={canvas2dRef} width={width} height={height}></canvas>
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

function createCube(size: number, density: number, noise: number = 0) {
  const halfSize = size / 2;
  const step = size / density;
  const atoms: Array<Atom> = [];
  for (let x = -halfSize; x < halfSize; x += step) {
    for (let y = -halfSize; y < halfSize; y += step) {
      for (let z = -halfSize; z < halfSize; z += step) {
        atoms.push({
          position: vec3.fromValues(
            x + Math.random() * step * noise,
            y + Math.random() * step * noise,
            z + Math.random() * step * noise
          ),
        });
      }
    }
  }
  return atoms;
}

const atoms: Array<Atom> = createCube(0.2, 10, 0.01);

function vec3FromObject(object: { x: number; y: number; z: number }) {
  return vec3.fromValues(object.x, object.y, object.z);
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI); // Draw a full circle
  ctx.fillStyle = "red";
  ctx.fill(); // Fill the circle with the specified color
  ctx.closePath();
}

function drawTriangles(
  gl: WebGLRenderingContext,
  projectionMatrix: mat4,
  viewMatrix: mat4,
  triangles: Array<[vec3, vec3, vec3]>
) {
  // gl.disable(gl.CULL_FACE);

  // Define vertex shader source code
  const vertexShaderSource = `
    attribute vec4 coordinates;
    uniform mat4 projectionMatrix;
    uniform mat4 viewMatrix;
    
    void main(void) {
      gl_Position = projectionMatrix * viewMatrix * coordinates;
    }`;

  // Define fragment shader source code
  const fragmentShaderSource = `
    void main(void) {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red color
    }`;

  // Create vertex shader
  const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);

  // Create fragment shader
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);

  // Create shader program
  const shaderProgram = gl.createProgram()!;
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  gl.useProgram(shaderProgram);

  // Define and enable vertex attribute
  const coordinates = gl.getAttribLocation(shaderProgram, "coordinates");
  gl.enableVertexAttribArray(coordinates);

  // Create a buffer for vertex data
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  // Loop through triangles and draw each one
  triangles.forEach((triangle) => {
    // Flatten the vertices into a single array
    const vertices = [...triangle[0], ...triangle[1], ...triangle[2]];

    // Specify vertex data and send it to the GPU
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Configure the vertex attribute pointer
    gl.vertexAttribPointer(coordinates, 3, gl.FLOAT, false, 0, 0);

    // Set the uniform variables for projection and view matrices
    const projectionMatrixLocation = gl.getUniformLocation(
      shaderProgram,
      "projectionMatrix"
    );
    const viewMatrixLocation = gl.getUniformLocation(
      shaderProgram,
      "viewMatrix"
    );

    gl.uniformMatrix4fv(
      projectionMatrixLocation,
      false,
      new Float32Array(projectionMatrix)
    );
    gl.uniformMatrix4fv(
      viewMatrixLocation,
      false,
      new Float32Array(viewMatrix)
    );

    // Draw the triangle
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
  });
}
