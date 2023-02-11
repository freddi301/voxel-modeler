import React from "react";
import { css } from "styled-components/macro";
import { Vector3, Vector2, Matrix4, toRadians } from "@math.gl/core";
import { useObjectEditor } from "./components/ObjectEditor";
import { workspaceSchema } from "./components/workspace";
import { PointGrid } from "./components/PointGrid";
import { useElementSize } from "usehooks-ts";

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
  } = React.useMemo(() => {
    const canvas = workspace.value.canvas;
    const camera = workspace.value.camera;

    const viewMatrix = new Matrix4().lookAt({
      eye: toVector3(camera.position),
      center: toVector3(camera.target),
      up: toVector3(camera.up),
    });

    const projectionMatrix = new Matrix4().perspective({
      fovy: toRadians(camera.fov),
      aspect: canvas.width / canvas.height,
      near: camera.near,
      far: camera.far,
    });

    const viewProjectionMatrix = viewMatrix
      .clone()
      .multiplyLeft(projectionMatrix);

    const invertedViewProjectionMatrix = viewProjectionMatrix.clone().invert();

    const halfWidth = canvas.width / 2;
    const halfHeight = canvas.height / 2;

    const worldPointToScreenPoint = (worldPoint: Vector3) => {
      return worldPoint.clone().transform(viewProjectionMatrix);
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
      return screenPoint.clone().transform(invertedViewProjectionMatrix);
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
      context.save();
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.restore();

      context.save();
      context.fillStyle = "black";
      for (const worldPoint of pointGrid.iterate()) {
        const screenPoint = worldPointToScreenPoint(worldPoint);
        const canvasPoint = screenPointToCanvasPoint(screenPoint);

        context.fillRect(canvasPoint.x, canvasPoint.y, 2, 2);

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
    animate();
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

  return (
    <div
      css={css`
        width: 100vw;
        height: 100vh;
        display: grid;
        grid-template-columns: 10% 1fr 10%;
      `}
    >
      <div
        css={css`
          grid-column: 1;
          border-right: 1px solid black;
          box-sizing: border-box;
        `}
      ></div>
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
            if (event.buttons === 1) {
              const worldPoint = getMouseWorldPoint(event);
              pointGrid.add(worldPoint);
            }
          }}
          onMouseDown={(event) => {
            const worldPoint = getMouseWorldPoint(event);
            pointGrid.add(worldPoint);
          }}
          onWheel={(event) => {
            const zoomDirection = event.deltaY > 0 ? -1 : 1;
            const camera = workspace.value.camera;
            const cameraDirection = toVector3(camera.target).subtract(
              toVector3(camera.position)
            );
            const cameraPosition = toVector3(camera.position).add(
              cameraDirection.multiplyByScalar(0.1 * zoomDirection)
            );
            if (cameraPosition.distance(toVector3(camera.target)) > camera.near)
              workspace.onChange((workspace) => ({
                ...workspace,
                camera: {
                  ...workspace.camera,
                  position: cameraPosition,
                },
              }));
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
