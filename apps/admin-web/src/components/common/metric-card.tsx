import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'emerald' | 'blue' | 'orange' | 'red' | 'slate';
}

const tones = {
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  slate: 'bg-muted text-muted-foreground',
};

export function MetricCard({ title, value, icon: Icon, tone = 'slate' }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
