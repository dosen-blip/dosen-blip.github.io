/**
 * Dark mode's LED light for the pen. Three blurs of the line, each tinted blue and boosted (a thin line blurs to almost
 * nothing): a tight tube around the white-hot core, a halo, and a wide spill of light, with the line itself on top.
 * `scale` turns the blurs into the units of the art it lights, and `region` is the area they may reach, as [x, y, w, h].
 */
export function NeonFilter({ id, tube, halo, spill, scale = 1, region = [-20, -20, 244, 72] }) {
  const layers = [["tube", .3, tube], ["halo", 1.1, halo], ["spill", 3.4, spill]]
  const [x, y, width, height] = region
  return (
    <filter id={id} filterUnits="userSpaceOnUse" x={x} y={y} width={width} height={height} colorInterpolationFilters="sRGB">
      <feFlood className="neon-flood" result="blue" />
      {layers.map(([name, blur, gain]) => [
        <feGaussianBlur key={`${name}-blur`} in="SourceAlpha" stdDeviation={blur * scale} />,
        <feComponentTransfer key={`${name}-gain`} result={`${name}-alpha`}><feFuncA type="linear" slope={gain} /></feComponentTransfer>,
        <feComposite key={name} in="blue" in2={`${name}-alpha`} operator="in" result={name} />,
      ])}
      <feMerge>
        <feMergeNode in="spill" />
        <feMergeNode in="halo" />
        <feMergeNode in="tube" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  )
}
