import { BoxGeometry, Frustum, Matrix4, Mesh } from "three";

const ITERATIONS = 10000;

export const threeJsBenchmark = async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  for (let i = 0; i < ITERATIONS; i++) {
    moveAndIntersectBox();
  }
};

const moveAndIntersectBox = () => {
  const m = new Matrix4().makePerspective(-1, 1, 1, -1, 1, 100);
  const a = new Frustum().setFromProjectionMatrix(m);
  const object = new Mesh(new BoxGeometry(1, 1, 1));

  a.intersectsObject(object);

  object.position.set(-1, -1, -1);
  object.updateMatrixWorld();

  a.intersectsObject(object);

  object.position.set(1, 1, 1);
  object.updateMatrixWorld();

  a.intersectsObject(object);

  object.removeFromParent();
};
