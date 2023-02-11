import React from "react";
import { css } from "styled-components/macro";
import { Point } from "./components/math";

export default function App() {
  const [points, setPoints] = React.useState<Array<Point>>([
    new Point(10, 10, 10),
  ]);
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
        context.fillRect(point.x, point.y, 1, 1);
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
  }, []);
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
          const rect = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          if (event.buttons === 1) {
            points.push(new Point(x, y, 0));
          }
        }}
      />
    </div>
  );
}
