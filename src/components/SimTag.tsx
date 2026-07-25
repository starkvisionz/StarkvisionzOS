/**
 * A small caution-toned tag marking a view/feature as simulated. Placed in every
 * view header so it is clear at the point of use that the feature is a front-end
 * mock with no backend or real side effects.
 */
export function SimTag({ label = "Simulated" }: { label?: string }) {
  return (
    <span className="sim-tag" title="Front-end simulation — mock data, no backend, no real side effects.">
      <i className="ph ph-flask" style={{ fontSize: "10px" }} />
      {label}
    </span>
  );
}
