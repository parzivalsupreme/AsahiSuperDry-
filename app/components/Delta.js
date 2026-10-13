const fmt = (n) => n.toLocaleString();

// ▲/▼ with the change, so direction never relies on color alone.
export default function Delta({ c }) {
  if (!c.diff) return <span className="delta flat">■ 0</span>;
  const up = c.diff > 0;
  const pct = c.pct === null ? '' : ` (${up ? '+' : ''}${(c.pct * 100).toFixed(0)}%)`;
  return (
    <span className={`delta ${up ? 'up' : 'down'}`}>
      {up ? '▲ +' : '▼ '}{fmt(c.diff)}{pct}
    </span>
  );
}
