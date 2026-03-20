import { architectureContent } from "@/content/architecture-content";

function AxisItem({ title, summary }: { title: string; summary: string }) {
  return (
    <article className="diagram-card dual-axis-map-item">
      <h4>{title}</h4>
      <p>{summary}</p>
    </article>
  );
}

export default function DualAxisMap() {
  const [eventLane, productLane] = architectureContent.dualAxisArchitecture.lanes;

  return (
    <div className="dual-axis-map" aria-label="Dual axis architecture map">
      <div className="dual-axis-map-lane dual-axis-map-lane--left">
        <p className="dual-axis-map-label">Left lane</p>
        <h3>{eventLane.title}</h3>
        <p className="dual-axis-map-summary">{eventLane.summary}</p>
        <div className="dual-axis-map-items">
          {eventLane.items.map((item) => (
            <AxisItem key={item.key} title={item.title} summary={item.summary} />
          ))}
        </div>
      </div>

      <div className="dual-axis-map-bridge">
        <p className="dual-axis-map-label">Bridge area</p>
        <h3>{architectureContent.dualAxisArchitecture.bridge.title}</h3>
        <p className="dual-axis-map-summary">
          {architectureContent.dualAxisArchitecture.bridge.summary}
        </p>
        <div className="dual-axis-map-items dual-axis-map-items--bridge">
          {architectureContent.dualAxisArchitecture.bridge.items.map((item) => (
            <AxisItem key={item.key} title={item.title} summary={item.summary} />
          ))}
        </div>
      </div>

      <div className="dual-axis-map-lane dual-axis-map-lane--right">
        <p className="dual-axis-map-label">Right lane</p>
        <h3>{productLane.title}</h3>
        <p className="dual-axis-map-summary">{productLane.summary}</p>
        <div className="dual-axis-map-items">
          {productLane.items.map((item) => (
            <AxisItem key={item.key} title={item.title} summary={item.summary} />
          ))}
        </div>
      </div>
    </div>
  );
}
