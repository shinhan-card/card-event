import SectionShell from "@/components/chrome/section-shell";
import ModuleClusterMap from "@/components/diagrams/module-cluster-map";
import { architectureContent } from "@/content/architecture-content";

export default function RealModuleMap() {
  return (
    <SectionShell
      eyebrow="모듈 현실"
      title="모듈 현실 지도"
      summary="현재 워크트리의 실코드와 승인된 상품 / 공시 축 설계를 함께 놓고, 어떤 레이어가 실제 파일로 뒷받침되는지 구조적으로 보여줍니다."
      id="module-reality"
    >
      <div className="module-cluster-map-intro">
        <p>{architectureContent.orchestration.summary}</p>
        <p>
          이벤트 축은 현재 리포의 실제 파일을 기준으로, 상품 / 공시 축은 발표에서 승인된 구조 기준으로
          분리해 배치했습니다. 그래서 구현 근거가 강한 영역과 추론이 필요한 영역을 한눈에 구분할 수 있습니다.
        </p>
      </div>
      <ModuleClusterMap />
    </SectionShell>
  );
}
