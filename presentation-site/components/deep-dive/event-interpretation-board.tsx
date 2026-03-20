import SectionShell from "@/components/chrome/section-shell";
import { architectureContent } from "@/content/architecture-content";

export default function EventInterpretationBoard() {
  return (
    <SectionShell
      eyebrow="이벤트 해석 체인"
      title={architectureContent.copy.deepDiveEvent}
      summary={`${architectureContent.eventInterpretation.steps[0].title}부터 ${architectureContent.eventInterpretation.steps.at(-1)?.title}까지, 규칙 해석과 Gemini 보강을 포함한 전체 시퀀스를 공개 계약 그대로 펼칩니다.`}
      id="event-interpretation"
    >
      <div className="event-interpretation-board" aria-label="이벤트 해석 보드">
        {architectureContent.eventInterpretation.steps.map((step, index) => (
          <article
            className={`diagram-card event-interpretation-step${step.key.includes("gemini") || step.key.includes("rule") ? " event-interpretation-step--focus" : ""}`}
            key={step.key}
          >
            <p className="section-shell-eyebrow">단계 {String(index + 1).padStart(2, "0")}</p>
            <h3>{step.title}</h3>
            <p>{step.summary}</p>
            <div className="diagram-chip-row">
              {step.technologies.map((technology) => (
                <span className="diagram-chip" key={technology}>
                  {technology}
                </span>
              ))}
            </div>
            <dl className="event-interpretation-output">
              <dt>출력</dt>
              <dd>{step.output}</dd>
            </dl>
            {index < architectureContent.eventInterpretation.steps.length - 1 ? (
              <div className="event-interpretation-connector" aria-hidden="true" />
            ) : null}
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
