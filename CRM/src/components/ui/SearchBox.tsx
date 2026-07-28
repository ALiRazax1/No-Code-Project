import { Search, X } from 'lucide-react';
import { Input } from './Input';

interface SearchBoxProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBox({ value, onChange, placeholder = 'Search…', className }: SearchBoxProps) {
  return (
    <div className={className}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        leftIcon={<Search className="h-4 w-4" />}
        rightIcon={
          value ? (
            <button onClick={() => onChange('')} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          ) : null
        }
        className="h-9"
      />
    </div>
  );
}
