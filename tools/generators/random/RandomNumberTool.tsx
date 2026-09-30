'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { generateRandomInt, generateRandomFloat, generateRandomSet } from '@/lib/generators/engines';
import { copyToClipboard } from '@/lib/utils';

export default function RandomNumberTool() {
  const [min, setMin] = useState('1');
  const [max, setMax] = useState('100');
  const [count, setCount] = useState('1');
  const [decimals, setDecimals] = useState('0');
  const [unique, setUnique] = useState(false);
  const [result, setResult] = useState<number[]>([]);
  const toast = useToast();

  const handleGenerate = () => {
    const mn = parseFloat(min);
    const mx = parseFloat(max);
    const cnt = parseInt(count);
    const dec = parseInt(decimals);

    if (cnt === 1) {
      setResult([dec > 0 ? generateRandomFloat(mn, mx, dec) : generateRandomInt(mn, mx)]);
    } else {
      setResult(generateRandomSet(mn, mx, cnt, unique));
    }
  };

  return (
    <div className="card">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <label>Min: <input type="number" value={min} onChange={e => setMin(e.target.value)} className="w-full p-2" /></label>
        <label>Max: <input type="number" value={max} onChange={e => setMax(e.target.value)} className="w-full p-2" /></label>
        <label>Count: <input type="number" value={count} onChange={e => setCount(e.target.value)} className="w-full p-2" /></label>
        <label>Decimals: <input type="number" value={decimals} onChange={e => setDecimals(e.target.value)} className="w-full p-2" /></label>
        <label><input type="checkbox" checked={unique} onChange={e => setUnique(e.target.checked)} /> Unique (Sets only)</label>
      </div>
      <Button onClick={handleGenerate} variant="primary" className="mb-4">Generate</Button>
      {result.length > 0 && (
        <div className="bg-surface2 p-4 rounded">
          <div className="text-xl font-mono mb-2">{result.join(', ')}</div>
          <Button onClick={() => { copyToClipboard(result.join(', ')); toast.success('Copied'); }} variant="secondary">Copy</Button>
        </div>
      )}
    </div>
  );
}
