'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DataToolbarProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export function DataToolbar({ value, placeholder, onChange }: DataToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
    </div>
  );
}
