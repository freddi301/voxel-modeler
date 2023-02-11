import React from "react";
import { css } from "styled-components/macro";
import { Vector3, Vector2, Matrix4, toRadians } from "@math.gl/core";

export default function App() {
  const canvas = React.useMemo(() => ({ width: 400, height: 400 }), []);
  const {
    points,
    canvasPointToScreenPoint,
    screenPointToCanvasPoint,
    screenPointToWorldPoint,
    viewProjectionMatrix,
  } = React.useMemo(() => {
    const points: Array<Vector3> = [
      new Vector3(0, 0, 0),
      new Vector3(0.1, 0, 0),
      new Vector3(-0.1, 0, 0),
      new Vector3(0, 0.1, 0),
      new Vector3(0, -0.1, 0),
    ];

    const viewMatrix = new Matrix4().lookAt({
      eye: new Vector3(0, 0, 1),
      center: new Vector3(0, 0, 0),
      up: new Vector3(0, 1, 0),
    });

    const projectionMatrix = new Matrix4().perspective({
      fovy: toRadians(60),
      aspect: canvas.width / canvas.height,
      near: 0.3,
      far: 1000,
    });

    const viewProjectionMatrix = viewMatrix
      .clone()
      .multiplyLeft(projectionMatrix);

    const halfWidth = canvas.width / 2;
    const halfHeight = canvas.height / 2;

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

    const invertedViewProjectionMatrix = viewProjectionMatrix.clone().invert();

    const screenPointToWorldPoint = (screenPoint: Vector3): Vector3 => {
      return screenPoint.clone().transform(invertedViewProjectionMatrix);
    };

    return {
      points,
      canvasPointToScreenPoint,
      screenPointToCanvasPoint,
      screenPointToWorldPoint,
      viewProjectionMatrix,
    };
  }, [canvas.height, canvas.width]);

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
      for (const point of points) {
        const screenPoint = point.clone().transform(viewProjectionMatrix);
        const canvasPoint = screenPointToCanvasPoint(screenPoint);
        context.fillRect(canvasPoint.x, canvasPoint.y, 1, 1);
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
  }, [points, screenPointToCanvasPoint, viewProjectionMatrix]);
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
    const screenPoint = canvasPointToScreenPoint(canvasPoint, 0.4);
    const worldPoint = screenPointToWorldPoint(screenPoint);
    return worldPoint;
  };
  return (
    <div>
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        css={css`
          border: 1px solid black;
        `}
        onMouseMove={(event) => {
          if (event.buttons === 1) {
            const worldPoint = getMouseWorldPoint(event);
            points.push(worldPoint);
          }
        }}
        onMouseDown={(event) => {
          const worldPoint = getMouseWorldPoint(event);
          points.push(worldPoint);
        }}
      />
    </div>
  );
}
