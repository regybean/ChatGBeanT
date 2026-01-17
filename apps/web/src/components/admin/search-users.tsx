'use client';

import { Search } from 'lucide-react';

import { Input } from '@chatgbeant/ui/input';

interface SearchUsersProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchUsers({ value, onChange }: SearchUsersProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search users by email or name..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
