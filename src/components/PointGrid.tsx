import { Vector3 } from "three";

export class PointGrid {
  constructor(
    public readonly pointSize: number = 0.01,
    private map: Map<string, Vector3> = new Map()
  ) {}
  public readonly count = this.map.size;
  private align(point: Vector3): Vector3 {
    const truncated = new Vector3(
      point.x - (point.x % this.pointSize),
      point.y - (point.y % this.pointSize),
      point.z - (point.z % this.pointSize)
    );
    return getNearPoints()
      .map((p) => {
        p.multiplyScalar(this.pointSize);
        p.add(truncated);
        return p;
      })
      .sort((a, b) => a.distanceTo(point) - b.distanceTo(point))[0];
  }
  private key(alignedPoint: Vector3): string {
    return `${alignedPoint.x}-${alignedPoint.y}-${alignedPoint.z}`;
  }
  public add(point: Vector3) {
    const alignedPoint = this.align(point);
    const key = this.key(alignedPoint);
    const newMap = new Map(this.map);
    newMap.set(key, alignedPoint);
    return new PointGrid(this.pointSize, newMap);
  }
  public remove(point: Vector3) {
    const alignedPoint = this.align(point);
    const key = this.key(alignedPoint);
    const newMap = new Map(this.map);
    newMap.delete(key);
    return new PointGrid(this.pointSize, newMap);
  }
  public *iterate() {
    for (const [key, value] of this.map) {
      yield [key, value] as const;
    }
  }
}

function getNearPoints() {
  const points = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        points.push(new Vector3(x, y, z));
      }
    }
  }
  return points;
}
