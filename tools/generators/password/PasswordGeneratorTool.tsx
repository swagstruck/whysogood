'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { copyToClipboard } from '@/lib/utils';
import { generatePassword, generateMultiplePasswords } from '@/lib/generators/engines';
import { checkPasswordStrength } from '@/lib/security/engines';

export default function PasswordGeneratorTool() {
  const [length, setLength] = useState('16');
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [customSymbols, setCustomSymbols] = useState('');
  const [password, setPassword] = useState('');
  const [count, setCount] = useState('1');
  const [passwords, setPasswords] = useState<string[]>([]);
  const toast = useToast();

  const handleGenerate = () => {
    const opts = { length: parseInt(length), uppercase, lowercase, numbers, symbols, excludeAmbiguous, customSymbols };
    if (parseInt(count) > 1) {
      setPasswords(generateMultiplePasswords(opts, parseInt(count)));
      setPassword('');
    } else {
      setPassword(generatePassword(opts));
      setPasswords([]);
    }
  };

  useEffect(() => {
    handleGenerate();
  }, [length, uppercase, lowercase, numbers, symbols, excludeAmbiguous, customSymbols, count]);

  const strength = password ? checkPasswordStrength(password) : null;

  return (
    <div className="card">
      {password && (
        <div className="mb-4 text-center">
          <div className="text-2xl font-mono bg-surface2 p-4 rounded break-all">{password}</div>
          {strength && <div className="mt-2 text-sm text-muted">Strength: {strength.label} ({strength.entropy} bits)</div>}
          <Button onClick={() => { copyToClipboard(password); toast.success('Copied'); }} variant="primary" className="mt-2">Copy Password</Button>
        </div>
      )}
      {passwords.length > 0 && (
        <div className="mb-4">
          <div className="max-h-64 overflow-y-auto space-y-2">
            {passwords.map((p, i) => (
              <div key={i} className="flex justify-between p-2 bg-surface2 rounded font-mono">
                <span className="truncate">{p}</span>
                <Button onClick={() => { copyToClipboard(p); toast.success('Copied'); }} variant="ghost">Copy</Button>
              </div>
            ))}
          </div>
          <Button onClick={() => { copyToClipboard(passwords.join('\n')); toast.success('Copied All'); }} variant="primary" className="mt-2">Copy All</Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <label>Length: {length} <input type="range" min="4" max="128" value={length} onChange={e => setLength(e.target.value)} className="w-full" /></label>
        <label>Count: {count} <input type="range" min="1" max="20" value={count} onChange={e => setCount(e.target.value)} className="w-full" /></label>
        <label><input type="checkbox" checked={uppercase} onChange={e => setUppercase(e.target.checked)} /> Uppercase (A-Z)</label>
        <label><input type="checkbox" checked={lowercase} onChange={e => setLowercase(e.target.checked)} /> Lowercase (a-z)</label>
        <label><input type="checkbox" checked={numbers} onChange={e => setNumbers(e.target.checked)} /> Numbers (0-9)</label>
        <label><input type="checkbox" checked={symbols} onChange={e => setSymbols(e.target.checked)} /> Symbols</label>
        <label><input type="checkbox" checked={excludeAmbiguous} onChange={e => setExcludeAmbiguous(e.target.checked)} /> Exclude Ambiguous</label>
        <label>Custom Symbols: <input type="text" value={customSymbols} onChange={e => setCustomSymbols(e.target.value)} className="w-full" /></label>
      </div>
      <Button onClick={handleGenerate} variant="secondary" className="mt-4 w-full">Regenerate</Button>
    </div>
  );
}
