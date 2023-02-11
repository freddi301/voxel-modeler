import { Vector3 } from "@math.gl/core";

export class PointGrid {
  constructor(public readonly pointSize: number = 0.01) {}
  map = new Map<string, Vector3>();
  align(point: Vector3): Vector3 {
    return new Vector3(
      point.x - (point.x % this.pointSize),
      point.y - (point.y % this.pointSize),
      point.z - (point.z % this.pointSize)
    );
  }
  key(alignedPoint: Vector3): string {
    return `${alignedPoint.x}-${alignedPoint.y}-${alignedPoint.z}`;
  }
  add(point: Vector3) {
    const alignedPoint = this.align(point);
    const key = this.key(alignedPoint);
    this.map.set(key, alignedPoint);
  }
  remove(point: Vector3) {
    const alignedPoint = this.align(point);
    const key = this.key(alignedPoint);
    this.map.delete(key);
  }
  *iterate() {
    for (const [key, value] of this.map) {
      yield value;
    }
  }
}
