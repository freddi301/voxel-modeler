import React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { css } from "styled-components/macro";
import { useObjectEditor, ValueOfSchema } from "./components/ObjectEditor";
import { useOrbitControls } from "./components/useOrbitControls";
import { workbenchSchema } from "./components/workbench";
import { PointGrid } from "./components/PointGrid";
import { DoubleSide, Vector2, Vector3 } from "three";

export function App() {
  const workbench = useObjectEditor(workbenchSchema);
  const [pointGrid, setPointGrid] = React.useState(
    new PointGrid().add(new Vector3(0, 0, 0))
  );
  const orbitControls = useOrbitControls();
  React.useEffect(() => {
    workbench.onChange((workbench) => ({
      ...workbench,
      camera: { ...workbench.camera, ...orbitControls.camera },
      light: orbitControls.light,
    }));
  }, [orbitControls.camera, orbitControls.light, workbench.onChange]);
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
        <div>mouse right button to erase</div>
        <div>shift + mouse to move</div>
        <div>ctrl + mouse to rotate</div>
        <div>mouse wheel to zoom</div>
        <div>shift + mouse wheel to go move</div>
        <div>aly + mouse move to move schene light relative to camera</div>
        <div>
          <button
            onClick={() => {
              const a = document.createElement("a");
              a.href = window.URL.createObjectURL(
                new Blob(
                  [
                    JSON.stringify(
                      Array.from(pointGrid.iterate()).map(
                        ([, { x, y, z }]) => ({
                          x,
                          y,
                          z,
                        })
                      )
                    ),
                  ],
                  { type: "text/json" }
                )
              );
              a.download = "model.json";
              a.click();
            }}
          >
            export
          </button>
          <button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "application/json";
              input.onchange = (event) => {
                input.files![0].text().then((text: string) => {
                  setPointGrid(
                    JSON.parse(text).reduce(
                      (pointGrid: PointGrid, { x, y, z }: any) =>
                        pointGrid.add(new Vector3(x, y, z)),
                      pointGrid
                    )
                  );
                });
              };
              input.click();
            }}
          >
            import
          </button>
        </div>
      </div>
      <div
        css={css`
          grid-column: 2;
          position: relative;
        `}
      >
        <Canvas
          onMouseMove={(event) => {
            if (event.ctrlKey) {
              event.preventDefault();
              orbitControls.setXRotationClamped(
                (xRotation) => xRotation + event.movementY * 0.1
              );
              orbitControls.setYRotation(
                (yRotation) => yRotation + event.movementX * -0.1
              );
            } else if (event.shiftKey) {
              orbitControls.moveBy(
                event.movementX * 0.001,
                event.movementY * 0.001,
                0
              );
              event.preventDefault();
            } else if (event.altKey) {
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              const pointer = new Vector2(
                -(((event.clientX - rect.left) / rect.width) * 2 - 1),
                -(((event.clientY - rect.top) / rect.height) * 2 - 1)
              );
              orbitControls.setLightPosition(pointer);
            }
          }}
          onWheel={(event) => {
            if (event.shiftKey) {
              const delta = event.deltaY > 0 ? 0.01 : -0.01;
              orbitControls.moveBy(0, 0, delta);
            } else {
              const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
              orbitControls.setZoom((zoom) => zoom * zoomFactor);
            }
          }}
        >
          <CameraSync workbench={workbench.value} />
          <ambientLight intensity={0.1} />
          <directionalLight position={toVector3(workbench.value.light)} />
          <gridHelper args={[2, 2 / pointGrid.pointSize]} />
          <axesHelper
            position={toVector3(workbench.value.camera.target)}
            args={[0.1]}
          />
          {workbench.value.plane.show && (
            <mesh
              position={toVector3(workbench.value.camera.target)}
              rotation={orbitControls.rotation}
              onClick={(event) => {
                const intersection = event.intersections[0];
                setPointGrid(pointGrid.add(intersection.point));
              }}
            >
              <planeGeometry args={[1, 1]} />
              <meshStandardMaterial
                side={DoubleSide}
                transparent
                opacity={0.5}
                color={"orange"}
              />
            </mesh>
          )}
          {Array.from(pointGrid.iterate(), ([key, point]) => {
            return (
              <React.Fragment key={key}>
                <mesh
                  position={point}
                  onClick={(event) => {
                    const intersection = event.intersections[0];
                    setPointGrid(
                      pointGrid.add(
                        intersection.object.position
                          .clone()
                          .add(
                            intersection
                              .face!.normal.clone()
                              .multiplyScalar(pointGrid.pointSize)
                          )
                      )
                    );
                  }}
                  onContextMenu={(event) => {
                    event.nativeEvent.preventDefault();
                    const intersection = event.intersections[0];
                    setPointGrid(
                      pointGrid.remove(intersection.object.position)
                    );
                  }}
                >
                  <boxGeometry
                    args={[
                      pointGrid.pointSize,
                      pointGrid.pointSize,
                      pointGrid.pointSize,
                    ]}
                  />
                  <meshStandardMaterial />
                </mesh>
              </React.Fragment>
            );
          })}
        </Canvas>
      </div>
      <div
        css={css`
          grid-column: 3;
          border-left: 1px solid black;
          box-sizing: border-box;
        `}
      >
        {workbench.render}
      </div>
    </div>
  );
}

function CameraSync({
  workbench,
}: {
  workbench: ValueOfSchema<typeof workbenchSchema>;
}) {
  useFrame((state) => {
    state.camera.position.copy(toVector3(workbench.camera.position));
    state.camera.up.copy(toVector3(workbench.camera.up));
    state.camera.lookAt(toVector3(workbench.camera.target));
    state.camera.near = workbench.camera.near;
    state.camera.far = workbench.camera.far;
    if (state.camera.type === "PerspectiveCamera")
      state.camera.fov = workbench.camera.fov;
  });
  return <React.Fragment></React.Fragment>;
}

function toVector3({ x, y, z }: { x: number; y: number; z: number }) {
  return new Vector3(x, y, z);
}

function toXYZ(vec3: Vector3) {
  return { x: vec3.x, y: vec3.y, z: vec3.z };
}
