import React from "react";
import { css } from "styled-components/macro";
import { useObjectEditor } from "./components/ObjectEditor";
import { workspaceSchema } from "./components/workspace";
import { PointGrid } from "./components/PointGrid";
import { useElementSize } from "usehooks-ts";
import { useOrbitControls } from "./components/useOrbitControls";
import { Matrix4, Vector2, Vector3, MathUtils } from "three";

export default function App() {
  const workspace = useObjectEditor(workspaceSchema);
  const pointGrid = React.useMemo(() => {
    const pointGrid = new PointGrid();
    pointGrid.add(new Vector3(0, 0, 0));
    pointGrid.add(new Vector3(0.1, 0, 0));
    pointGrid.add(new Vector3(-0.1, 0, 0));
    pointGrid.add(new Vector3(0, 0.1, 0));
    pointGrid.add(new Vector3(0, -0.1, 0));
    return pointGrid;
  }, []);
  const {
    worldPointToScreenPoint,
    screenPointToCanvasPoint,
    canvasPointToScreenPoint,
    screenPointToWorldPoint,
    viewProjectionMatrix,
  } = React.useMemo(() => {
    const canvas = workspace.value.canvas;
    const camera = workspace.value.camera;

    const viewMatrix = new Matrix4().lookAt(
      toVector3(camera.position),
      toVector3(camera.target),
      toVector3(camera.up)
    );

    const projectionMatrix = makePerspective(
      camera.fov,
      canvas.width / canvas.height,
      camera.near,
      camera.far
    );

    const viewProjectionMatrix = new Matrix4()
      // .makeTranslation(camera.position.x, camera.position.y, camera.position.z)
      .multiply(viewMatrix)
      .multiply(projectionMatrix);

    const invertedViewProjectionMatrix = viewProjectionMatrix.clone().invert();

    const halfWidth = canvas.width / 2;
    const halfHeight = canvas.height / 2;

    const worldPointToScreenPoint = (worldPoint: Vector3) => {
      return worldPoint.clone().applyMatrix4(viewProjectionMatrix);
    };

    const screenPointToCanvasPoint = (screenPoint: Vector3): Vector2 => {
      return new Vector2(
        screenPoint.x * halfWidth + halfWidth,
        -screenPoint.y * halfHeight + halfHeight
      );
    };

    const canvasPointToScreenPoint = (
      canvasPoint: Vector2,
      z: number
    ): Vector3 => {
      return new Vector3(
        (canvasPoint.x - halfWidth) / halfWidth,
        -(canvasPoint.y - halfHeight) / halfHeight,
        z
      );
    };

    const screenPointToWorldPoint = (screenPoint: Vector3): Vector3 => {
      return screenPoint.clone().applyMatrix4(invertedViewProjectionMatrix);
    };

    return {
      pointGrid,
      canvasPointToScreenPoint,
      screenPointToCanvasPoint,
      screenPointToWorldPoint,
      viewProjectionMatrix,
      worldPointToScreenPoint,
    };
  }, [pointGrid, workspace.value.camera, workspace.value.canvas]);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvasRef.current.getContext("2d");
    if (!context) return;
    const render = () => {
      console.log(viewProjectionMatrix);
      context.save();
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.restore();

      context.save();
      context.fillStyle = "black";
      for (const worldPoint of pointGrid.iterate()) {
        const screenPoint = worldPointToScreenPoint(worldPoint);
        const canvasPoint = screenPointToCanvasPoint(screenPoint);

        console.log(worldPoint, screenPoint, canvasPoint);

        context.fillRect(canvasPoint.x, canvasPoint.y, 4, 4);

        // context.save();
        // context.beginPath();
        // context.arc(canvasPoint.x, canvasPoint.y, 3, 0, 2 * Math.PI, false);
        // context.fill();
        // context.restore();
      }
      context.restore();
    };
    let isActive = true;
    const animate = () => {
      render();
      if (isActive) {
        requestAnimationFrame(animate);
      }
    };
    // animate();
    render();
    return () => {
      isActive = false;
    };
  }, [pointGrid, screenPointToCanvasPoint, worldPointToScreenPoint]);
  const getMouseCanvasPoint = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const canvasPoint = new Vector2(
      event.clientX - rect.left,
      event.clientY - rect.top
    );
    return canvasPoint;
  };
  const getMouseWorldPoint = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvasPoint = getMouseCanvasPoint(event);
    const screenPoint = canvasPointToScreenPoint(
      canvasPoint,
      worldPointToScreenPoint(toVector3(workspace.value.camera.target)).z
    );
    const worldPoint = screenPointToWorldPoint(screenPoint);
    return worldPoint;
  };
  const [
    convasContainerRef,
    { width: canvasContainerWidth, height: canvasContainerHeight },
  ] = useElementSize();
  React.useEffect(() => {
    workspace.onChange((workspace) => ({
      ...workspace,
      canvas: {
        width: canvasContainerWidth,
        height: canvasContainerHeight,
      },
    }));
  }, [canvasContainerHeight, canvasContainerWidth, workspace.onChange]);

  const orbitControls = useOrbitControls();
  // React.useEffect(() => {
  //   workspace.onChange((workspace) => ({
  //     ...workspace,
  //     camera: { ...workspace.camera, ...orbitControls.camera },
  //   }));
  // }, [orbitControls.camera, workspace.onChange]);

  return (
    <div
      css={css`
        width: 100vw;
        height: 100vh;
        display: grid;
        grid-template-columns: 20% 1fr 20%;
      `}
    >
      <div
        css={css`
          grid-column: 1;
          border-right: 1px solid black;
          box-sizing: border-box;
        `}
      >
        <div>mouse left button to draw</div>
        <div>ctrl + mouse to move</div>
        <div>ctrl + mouse to rotate</div>
        <div>moue wheel to zoom</div>
      </div>
      <div
        ref={convasContainerRef}
        css={css`
          grid-column: 2;
          position: relative;
        `}
      >
        <canvas
          ref={canvasRef}
          width={workspace.value.canvas.width}
          height={workspace.value.canvas.height}
          css={css`
            position: absolute;
          `}
          onMouseMove={(event) => {
            if (event.ctrlKey) {
              event.preventDefault();
              orbitControls.setXRotation(
                (xRotation) => xRotation + event.movementY * 0.1
              );
              orbitControls.setYRotation(
                (yRotation) => yRotation + event.movementX * -0.1
              );
            } else if (event.shiftKey) {
              event.preventDefault();
            } else if (event.buttons === 1) {
              event.preventDefault();
              const worldPoint = getMouseWorldPoint(event);
              pointGrid.add(worldPoint);
            }
          }}
          onMouseDown={(event) => {
            const worldPoint = getMouseWorldPoint(event);
            pointGrid.add(worldPoint);
          }}
          onWheel={(event) => {
            const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
            orbitControls.setZoom((zoom) => zoom * zoomFactor);
          }}
        />
      </div>
      <div
        css={css`
          grid-column: 3;
          border-left: 1px solid black;
          box-sizing: border-box;
        `}
      >
        {workspace.render}
      </div>
    </div>
  );
}

function toVector3({ x, y, z }: { x: number; y: number; z: number }) {
  return new Vector3(x, y, z);
}

function makePerspective(
  fov: number,
  aspect: number,
  near: number,
  far: number
) {
  const top = near * Math.tan(MathUtils.DEG2RAD * 0.5 * fov);
  const height = 2 * top;
  const width = aspect * height;
  const left = -0.5 * width;
  return new Matrix4().makePerspective(
    left,
    left + width,
    top,
    top - height,
    near,
    far
  );
}
