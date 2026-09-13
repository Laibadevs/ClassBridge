import type { AIUpdate } from '@/lib/types';
import Card from './ui/Card';
import { GlobeIcon, MessageIcon, LightbulbIcon, CheckIcon } from './icons';

export default function AIUpdateCard({ update }: { update: AIUpdate }) {
  return (
    <div className="animate-fadeIn space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-blue-100 bg-blue-50/40">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue text-white">
              <GlobeIcon className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-brand-blueDark">Simple English</h3>
          </div>
          <p className="leading-relaxed text-ink">{update.englishSummary}</p>
        </Card>

        <Card className="border-emerald-100 bg-emerald-50/40">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-green text-white">
              <MessageIcon className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-brand-greenDark">Friendly Roman Urdu</h3>
          </div>
          <p className="leading-relaxed text-ink">{update.romanUrduSummary}</p>
        </Card>
      </div>

      <Card className="border-brand-blue/20 bg-gradient-to-br from-blue-50 to-emerald-50">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-blue shadow-card">
            <CheckIcon className="h-4 w-4" />
          </span>
          <h3 className="font-semibold text-ink">Suggested parent action</h3>
        </div>
        <p className="font-medium leading-relaxed text-ink">{update.parentAction}</p>
      </Card>

      <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <LightbulbIcon className="h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <p className="text-sm font-semibold text-ink">Why this matters</p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{update.whyThisMatters}</p>
        </div>
      </div>
    </div>
  );
}
