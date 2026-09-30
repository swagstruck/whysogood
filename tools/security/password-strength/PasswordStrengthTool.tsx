'use client';

import React, { useState } from 'react';
import { checkPasswordStrength } from '@/lib/security/engines';

export default function PasswordStrengthTool() {
  const [input, setInput] = useState('');
  const strength = input ? checkPasswordStrength(input) : null;

  return (
    <div className="card flex flex-col gap-4">
      <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Enter password to check..." className="w-full p-2" />
      {strength && (
        <div className="space-y-2">
          <div className="flex h-2 w-full gap-1">
            {[0,1,2,3,4].map(i => (
              <div key={i} className={`flex-1 rounded ${i <= strength.score ? 'bg-primary' : 'bg-surface2'}`} />
            ))}
          </div>
          <div className="font-bold">{strength.label} ({strength.entropy} bits)</div>
          <div className="text-sm text-muted">Crack time: {strength.crackTime}</div>
          <ul className="text-sm space-y-1 mt-4">
            {strength.suggestions.map((s, i) => <li key={i} className="text-danger">✗ {s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
