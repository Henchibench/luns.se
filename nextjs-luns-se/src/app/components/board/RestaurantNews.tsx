'use client';

export default function RestaurantNews({ area, names, onSelect, onDismiss }: {
  area: string;
  names: string[];
  onSelect: (name: string) => void;
  onDismiss: () => void;
}) {
  if (!names.length) return null;
  return (
    <aside aria-label={`Nya restauranger på ${area}`}
      className="mt-3.5 mb-3 flex items-start gap-3 rounded-lg bg-[var(--accBg)] px-3.5 py-3 text-[var(--accStrong)]">
      <div className="min-w-0 flex-1">
        <p role="status" className="m-0 mb-1 text-13 font-semibold">Nytt på {area}</p>
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-13 leading-relaxed">
          {names.map(name => (
            <li key={name}>
              <button onClick={() => onSelect(name)}
                className="border-0 bg-transparent p-0 font-semibold text-inherit underline underline-offset-2 cursor-pointer">
                {name}
              </button>{' '}har lagts till. Se lunchmenyn.
            </li>
          ))}
        </ul>
      </div>
      <button onClick={onDismiss} aria-label="Stäng restaurangnyheten"
        className="shrink-0 rounded-md border-0 bg-transparent px-2 py-1 text-18 leading-none text-inherit cursor-pointer hover:bg-[var(--hi)]">
        ×
      </button>
    </aside>
  );
}
