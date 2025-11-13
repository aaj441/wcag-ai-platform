import React from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export const KeywordFilter: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filter by keyword..."
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-600"
      />
    </div>
  );
};

export default KeywordFilter;
