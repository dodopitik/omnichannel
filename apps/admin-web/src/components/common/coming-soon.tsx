import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
  sprint?: string;
}

export function ComingSoon({ title, description, sprint }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Construction className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
        {sprint && (
          <span className="inline-block mt-3 px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm rounded-full font-medium">
            Tersedia di {sprint}
          </span>
        )}
      </div>
    </div>
  );
}
