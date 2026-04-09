import React from 'react';
import { Search } from 'lucide-react';

interface PanelSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const PanelSearch: React.FC<PanelSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
}) => {
  return (
    <div className="relative shrink-0">
      <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid="panel-search"
        className="w-full pl-6 pr-2 py-1 glass-item rounded text-[9px] font-bold text-white placeholder-slate-600 bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-500/30"
      />
    </div>
  );
};

export default PanelSearch;
