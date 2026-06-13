import { scoreColor } from '../../utils/scoring';

export default function ScoreBar({ score }) {
  const { bg, text, bar } = scoreColor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${bg} ${text}`}>
        {score}
      </span>
    </div>
  );
}
