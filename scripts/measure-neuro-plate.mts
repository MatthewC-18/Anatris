// scripts/measure-neuro-plate.mts
//
// Print each plate figure's real bounding box against its authored viewBox, so a
// crop that slices a hand off is caught by a number instead of by squinting at a
// PNG. Control points are included, so the box is a slight overestimate -- which
// is the safe direction for a crop.
import { buildPlateGeometry, PLATES, type PlateFigure } from '../src/data/neuro/plate';

for (const figure of Object.keys(PLATES) as PlateFigure[]) {
  const g = buildPlateGeometry(figure);
  const nums = (
    [...g.bodyShapes, ...g.limbShapes].join(' ').match(/-?\d+(\.\d+)?/g) ?? []
  ).map(Number);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < nums.length; i += 2) {
    xs.push(nums[i]);
    ys.push(nums[i + 1]);
  }
  const [vx, vy, vw, vh] = g.spec.viewBox.split(/\s+/).map(Number);
  const fits =
    Math.min(...xs) >= vx && Math.max(...xs) <= vx + vw ? 'x ok' : 'x CLIPPED';
  console.log(`${figure}  viewBox ${g.spec.viewBox}  aspect ${(vw / vh).toFixed(3)}`);
  console.log(
    `  drawn x ${Math.min(...xs).toFixed(1)} .. ${Math.max(...xs).toFixed(1)}` +
      `   frame x ${vx} .. ${vx + vw}   ${fits}`,
  );
  console.log(
    `  drawn y ${Math.min(...ys).toFixed(1)} .. ${Math.max(...ys).toFixed(1)}` +
      `   frame y ${vy} .. ${vy + vh}`,
  );
}
