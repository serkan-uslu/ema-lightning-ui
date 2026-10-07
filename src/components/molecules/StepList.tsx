export function StepList({
  steps,
}: {
  steps: { title: string; text: string }[];
}) {
  return (
    <ol className="steps">
      {steps.map((step, i) => (
        <li key={step.title}>
          <span className="step-number">{String(i + 1).padStart(2, "0")}</span>
          <div>
            <strong>{step.title}</strong>
            <small>{step.text}</small>
          </div>
        </li>
      ))}
    </ol>
  );
}
