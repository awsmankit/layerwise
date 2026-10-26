import { useRecords } from './shared';

/** "2 of 3 solved" for a game, from the browser's saved results. */
export default function GameBadge({ prefix, ids }: { prefix: string; ids: string[] }) {
  const records = useRecords();
  const played = ids.filter((id) => records[`${prefix}:${id}`]).length;
  return (
    <span className="num">
      {played === 0 ? `${ids.length} levels` : `${played} of ${ids.length} played`}
    </span>
  );
}
