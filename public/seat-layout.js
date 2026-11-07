// Keep one occupied seat on the centre line and mirror every other seat.
export function seatPositions(size, { spread = 82, centreY = 42, depth = 98 } = {}) {
  if (![3, 5, 7].includes(size)) throw new RangeError('Council size must be 3, 5 or 7');
  const middle = (size - 1) / 2;
  return Array.from({ length: size }, (_, index) => {
    const offset = (index - middle) / middle;
    return [Math.round((50 + offset * spread / 2) * 10) / 10,
      Math.round(centreY + depth * offset * offset)];
  });
}

export const previewPositions = size => seatPositions(size, {
  spread: size === 3 ? 56 : size === 5 ? 72 : 82,
  centreY: 72,
  depth: 68
});
