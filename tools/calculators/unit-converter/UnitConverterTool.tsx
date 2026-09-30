'use client';
import React, { useState, useMemo } from 'react';
import { Ruler, Scale, Thermometer, Box, Database, Gauge, Clock, ArrowLeftRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import { formatNumber, copyToClipboard } from '@/lib/utils';
import { convertUnit, getUnitsForCategory, UnitCategory } from '@/lib/calculators/engines';

export default function UnitConverterTool() {
  const [category, setCategory] = useState<UnitCategory>('length');
  const [inputValue, setInputValue] = useState<number>(10);
  const [fromUnit, setFromUnit] = useState<string>('m');
  const [toUnit, setToUnit] = useState<string>('ft');
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const categories: { id: UnitCategory; label: string; icon: React.ReactNode; defaultFrom: string; defaultTo: string }[] = [
    { id: 'length', label: 'Length', icon: <Ruler size={16} />, defaultFrom: 'm', defaultTo: 'ft' },
    { id: 'weight', label: 'Weight / Mass', icon: <Scale size={16} />, defaultFrom: 'kg', defaultTo: 'lb' },
    { id: 'temperature', label: 'Temperature', icon: <Thermometer size={16} />, defaultFrom: 'C', defaultTo: 'F' },
    { id: 'area', label: 'Area', icon: <Box size={16} />, defaultFrom: 'm2', defaultTo: 'ft2' },
    { id: 'volume', label: 'Volume', icon: <Box size={16} />, defaultFrom: 'L', defaultTo: 'gal' },
    { id: 'speed', label: 'Speed', icon: <Gauge size={16} />, defaultFrom: 'km/h', defaultTo: 'mph' },
    { id: 'data', label: 'Digital Data', icon: <Database size={16} />, defaultFrom: 'MB', defaultTo: 'GB' },
    { id: 'time', label: 'Time', icon: <Clock size={16} />, defaultFrom: 'h', defaultTo: 'min' },
  ];

  const handleCategoryChange = (cat: UnitCategory) => {
    setCategory(cat);
    const catObj = categories.find((c) => c.id === cat);
    if (catObj) {
      setFromUnit(catObj.defaultFrom);
      setToUnit(catObj.defaultTo);
    }
  };

  const handleSwap = () => {
    const temp = fromUnit;
    setFromUnit(toUnit);
    setToUnit(temp);
  };

  const unitOptions = useMemo(() => {
    return getUnitsForCategory(category);
  }, [category]);

  const convertedResult = useMemo(() => {
    if (isNaN(inputValue)) return 0;
    return convertUnit(inputValue, fromUnit, toUnit, category);
  }, [inputValue, fromUnit, toUnit, category]);

  // Conversion matrix across all units in this category
  const matrixData = useMemo(() => {
    return unitOptions.map((u) => {
      const val = convertUnit(inputValue, fromUnit, u.value, category);
      return {
        unit: u.value,
        label: u.label,
        value: val,
      };
    });
  }, [inputValue, fromUnit, category, unitOptions]);

  const handleCopy = () => {
    const fromLabel = unitOptions.find((u) => u.value === fromUnit)?.label || fromUnit;
    const toLabel = unitOptions.find((u) => u.value === toUnit)?.label || toUnit;
    const text = `${formatNumber(inputValue)} ${fromLabel} = ${formatNumber(convertedResult, 6)} ${toLabel}`;
    copyToClipboard(text);
    setCopied(true);
    toast.success('Copied conversion to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const fromLabel = unitOptions.find((u) => u.value === fromUnit)?.label || fromUnit;
  const toLabel = unitOptions.find((u) => u.value === toUnit)?.label || toUnit;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Category Selection Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {categories.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              onClick={() => handleCategoryChange(c.id)}
              className="c-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                background: active ? 'var(--brand)' : 'var(--bg-2)',
                color: active ? '#ffffff' : 'var(--ink-2)',
                border: active ? '1px solid var(--brand)' : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {c.icon}
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Controls + Results */}
      <div
        className="tool-split-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}
      >
        {/* Controls Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Input Value */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
              Value to Convert
            </label>
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(Number(e.target.value))}
              className="input-base"
              style={{ width: '100%', height: 44, fontSize: 18, fontWeight: 700 }}
            />
          </div>

          {/* Unit Selectors with Swap */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                From Unit
              </label>
              <Select
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
                options={unitOptions}
              />
            </div>

            <button
              onClick={handleSwap}
              title="Swap Units"
              style={{
                marginTop: 22,
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-2)',
                color: 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <ArrowLeftRight size={16} />
            </button>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                To Unit
              </label>
              <Select
                value={toUnit}
                onChange={(e) => setToUnit(e.target.value)}
                options={unitOptions}
              />
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>
                {inputValue} {fromUnit} =
              </span>
              <Button variant="ghost" size="sm" onClick={handleCopy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 4, wordBreak: 'break-word' }}>
              {formatNumber(convertedResult, 6)} <span style={{ fontSize: '0.5em', fontWeight: 600, color: 'var(--brand)' }}>{toUnit}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
              {toLabel}
            </div>
          </div>

          <div style={{ padding: 12, background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase' }}>Conversion Factor:</div>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--ink)', marginTop: 4 }}>
              1 {fromUnit} = {formatNumber(convertUnit(1, fromUnit, toUnit, category), 6)} {toUnit}
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Matrix Table */}
      <div className="c-card" style={{ padding: 20 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: 'var(--ink)' }}>
          All {category.charAt(0).toUpperCase() + category.slice(1)} Conversions for {inputValue} {fromUnit}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {matrixData.map((item) => (
            <div
              key={item.unit}
              style={{
                padding: '10px 12px',
                background: item.unit === toUnit ? 'var(--brand-subtle)' : 'var(--bg-2)',
                borderRadius: 'var(--radius-md)',
                border: item.unit === toUnit ? '1px solid var(--brand)' : '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{item.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginTop: 2, wordBreak: 'break-word' }}>
                {formatNumber(item.value, 6)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>{item.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}