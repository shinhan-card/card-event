import { architectureContent } from "@/content/architecture-content";

function AxisItem({
  title,
  summary,
  technologies
}: {
  title: string;
  summary: string;
  technologies: readonly string[];
}) {
  return (
    <article className="diagram-card dual-axis-map-item">
      <h4>{title}</h4>
      <p>{summary}</p>
      <div className="diagram-chip-row">
        {technologies.map((technology) => (
          <span className="diagram-chip" key={technology}>
            {technology}
          </span>
        ))}
      </div>
    </article>
  );
}

export default function DualAxisMap() {
  const [eventLane, productLane] = architectureContent.dualAxisArchitecture.lanes;

  return (
    <div className="dual-axis-map" aria-label="이중 축 아키텍처 지도">
      <div className="dual-axis-map-lane dual-axis-map-lane--left">
        <p className="dual-axis-map-label">event lane</p>
        <h3>{eventLane.title}</h3>
        <p className="dual-axis-map-summary">{eventLane.summary}</p>
        <div className="dual-axis-map-items">
          {eventLane.items.map((item) => (
            <AxisItem
              key={item.key}
              title={item.title}
              summary={item.summary}
              technologies={item.technologies}
            />
          ))}
        </div>
      </div>

      <div className="dual-axis-map-bridge">
        <p className="dual-axis-map-label">shared bridge</p>
        <h3>{architectureContent.dualAxisArchitecture.bridge.title}</h3>
        <p className="dual-axis-map-summary">
          {architectureContent.dualAxisArchitecture.bridge.summary}
        </p>
        <div className="dual-axis-map-items dual-axis-map-items--bridge">
          {architectureContent.dualAxisArchitecture.bridge.items.map((item) => (
            <AxisItem
              key={item.key}
              title={item.title}
              summary={item.summary}
              technologies={item.technologies}
            />
          ))}
        </div>
      </div>

      <div className="dual-axis-map-lane dual-axis-map-lane--right">
        <p className="dual-axis-map-label">product lane</p>
        <h3>{productLane.title}</h3>
        <p className="dual-axis-map-summary">{productLane.summary}</p>
        <div className="dual-axis-map-items">
          {productLane.items.map((item) => (
            <AxisItem
              key={item.key}
              title={item.title}
              summary={item.summary}
              technologies={item.technologies}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
