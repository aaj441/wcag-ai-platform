import React from 'react';

export const KeywordBadge: React.FC<{ keyword: string }> = ({ keyword }) => {
  return (
    <span className="px-2 py-0.5 rounded text-xs bg-indigo-900 text-indigo-100 border border-indigo-700">
      {keyword}
    </span>
  );
};

export default KeywordBadge;
