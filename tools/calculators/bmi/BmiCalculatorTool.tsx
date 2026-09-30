'use client';
import React, { useState, useMemo } from 'react';
import { Activity, Heart, Info, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, formatNumber } from '@/lib/utils';
import { calcBmi } from '@/lib/calculators/engines';

export default function BmiCalculatorTool() {
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  // Metric state
  const [weightKg, setWeightKg] = useState<number>(70);
  const [heightCm, setHeightCm] = useState<number>(175);

  // Imperial state
  const [weightLbs, setWeightLbs] = useState<number>(154);
  const [heightFeet, setHeightFeet] = useState<number>(5);
  const [heightInches, setHeightInches] = useState<number>(9);

  // Synchronize values when toggling units
  const handleUnitToggle = (system: 'metric' | 'imperial') => {
    if (system === unitSystem) return;
    if (system === 'imperial') {
      // Metric -> Imperial
      const totalInches = heightCm / 2.54;
      setHeightFeet(Math.floor(totalInches / 12));
      setHeightInches(Math.round(totalInches % 12));
      setWeightLbs(Math.round(weightKg * 2.20462));
    } else {
      // Imperial -> Metric
      const totalInches = heightFeet * 12 + heightInches;
      setHeightCm(Math.round(totalInches * 2.54));
      setWeightKg(Math.round(weightLbs / 2.20462));
    }
    setUnitSystem(system);
  };

  const bmiData = useMemo(() => {
    let effectiveWeight = weightKg;
    let effectiveHeight = heightCm;

    if (unitSystem === 'imperial') {
      effectiveWeight = weightLbs / 2.20462;
      const totalIn = heightFeet * 12 + heightInches;
      effectiveHeight = totalIn * 2.54;
    }

    if (effectiveHeight <= 0 || effectiveWeight <= 0) return null;

    const res = calcBmi(effectiveWeight, effectiveHeight);
    
    // Position on visual scale (clamped between 15 and 40)
    const scaleMin = 15;
    const scaleMax = 40;
    const markerPct = Math.max(0, Math.min(100, ((res.bmi - scaleMin) / (scaleMax - scaleMin)) * 100));

    // Category styling
    let catColor = 'var(--brand)';
    let catBg = 'var(--brand-subtle)';
    let advice = 'You are in the healthy BMI range. Keep maintaining balanced nutrition and active habits!';

    if (res.category === 'Underweight') {
      catColor = '#3b82f6';
      catBg = 'rgba(59, 130, 246, 0.12)';
      const diff = res.minHealthyWeight - effectiveWeight;
      advice = `Consider gaining ${formatNumber(unitSystem === 'metric' ? diff : diff * 2.20462, 1)} ${unitSystem === 'metric' ? 'kg' : 'lbs'} to reach the recommended weight range.`;
    } else if (res.category === 'Normal') {
      catColor = 'var(--pos)';
      catBg = 'var(--pos-subtle)';
    } else if (res.category === 'Overweight') {
      catColor = '#f59e0b';
      catBg = 'rgba(245, 158, 11, 0.12)';
      const diff = effectiveWeight - res.maxHealthyWeight;
      advice = `Consider losing ${formatNumber(unitSystem === 'metric' ? diff : diff * 2.20462, 1)} ${unitSystem === 'metric' ? 'kg' : 'lbs'} to reach the recommended weight range.`;
    } else {
      catColor = 'var(--neg)';
      catBg = 'rgba(239, 68, 68, 0.12)';
      const diff = effectiveWeight - res.maxHealthyWeight;
      advice = `Targeting a weight reduction of ${formatNumber(unitSystem === 'metric' ? diff : diff * 2.20462, 1)} ${unitSystem === 'metric' ? 'kg' : 'lbs'} can substantially lower cardiovascular risks.`;
    }

    const minWeightDisplay = unitSystem === 'metric' ? `${formatNumber(res.minHealthyWeight, 1)} kg` : `${formatNumber(res.minHealthyWeight * 2.20462, 1)} lbs`;
    const maxWeightDisplay = unitSystem === 'metric' ? `${formatNumber(res.maxHealthyWeight, 1)} kg` : `${formatNumber(res.maxHealthyWeight * 2.20462, 1)} lbs`;

    return {
      ...res,
      markerPct,
      catColor,
      catBg,
      advice,
      healthyRangeStr: `${minWeightDisplay} – ${maxWeightDisplay}`,
    };
  }, [unitSystem, weightKg, heightCm, weightLbs, heightFeet, heightInches]);

  const handleCopy = () => {
    if (!bmiData) return;
    copyToClipboard(`BMI: ${bmiData.bmi} (${bmiData.category}). Healthy range: ${bmiData.healthyRangeStr}`);
    setCopied(true);
    toast.success('Copied BMI results to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Unit Toggle */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => handleUnitToggle('metric')}
          className="c-btn"
          style={{
            padding: '7px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: unitSystem === 'metric' ? 600 : 500,
            background: unitSystem === 'metric' ? 'var(--brand)' : 'var(--bg-2)',
            color: unitSystem === 'metric' ? '#ffffff' : 'var(--ink-2)',
            border: unitSystem === 'metric' ? '1px solid var(--brand)' : '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          Metric (kg, cm)
        </button>
        <button
          onClick={() => handleUnitToggle('imperial')}
          className="c-btn"
          style={{
            padding: '7px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: unitSystem === 'imperial' ? 600 : 500,
            background: unitSystem === 'imperial' ? 'var(--brand)' : 'var(--bg-2)',
            color: unitSystem === 'imperial' ? '#ffffff' : 'var(--ink-2)',
            border: unitSystem === 'imperial' ? '1px solid var(--brand)' : '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          Imperial (lbs, ft+in)
        </button>
      </div>

      {/* Main Grid: Controls + Results */}
      <div
        className="tool-split-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}
      >
        {/* Controls Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
            Body Measurements
          </h3>

          {unitSystem === 'metric' ? (
            <>
              {/* Weight Metric */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Weight</label>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)' }}>{weightKg} kg</span>
                </div>
                <input
                  type="range" min={30} max={200} step={0.5} value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--brand)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                  <span>30 kg</span>
                  <span>200 kg</span>
                </div>
              </div>

              {/* Height Metric */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Height</label>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)' }}>{heightCm} cm</span>
                </div>
                <input
                  type="range" min={100} max={230} step={1} value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--brand)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                  <span>100 cm</span>
                  <span>230 cm</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Weight Imperial */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Weight</label>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)' }}>{weightLbs} lbs</span>
                </div>
                <input
                  type="range" min={65} max={440} step={1} value={weightLbs}
                  onChange={(e) => setWeightLbs(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--brand)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                  <span>65 lbs</span>
                  <span>440 lbs</span>
                </div>
              </div>

              {/* Height Imperial: Feet + Inches */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Height</label>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)' }}>{heightFeet} ft {heightInches} in</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Feet</span>
                    <input
                      type="number" min={3} max={7} value={heightFeet}
                      onChange={(e) => setHeightFeet(Number(e.target.value))}
                      className="input-base"
                      style={{ width: '100%', height: 38, marginTop: 4 }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Inches</span>
                    <input
                      type="number" min={0} max={11} value={heightInches}
                      onChange={(e) => setHeightInches(Number(e.target.value))}
                      className="input-base"
                      style={{ width: '100%', height: 38, marginTop: 4 }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Results Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
          {bmiData && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Your Body Mass Index</span>
                  <Button variant="ghost" size="sm" onClick={handleCopy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
                  <div style={{ fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {bmiData.bmi}
                  </div>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 13,
                      fontWeight: 700,
                      background: bmiData.catBg,
                      color: bmiData.catColor,
                    }}
                  >
                    {bmiData.category}
                  </span>
                </div>
              </div>

              {/* Visual Gauge Bar */}
              <div>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  {/* Gauge Gradient Bar */}
                  <div
                    style={{
                      height: 12,
                      width: '100%',
                      borderRadius: 'var(--radius-full)',
                      background: 'linear-gradient(to right, #3b82f6 0%, #3b82f6 14%, #22c55e 14%, #22c55e 39.6%, #f59e0b 39.6%, #f59e0b 60%, #ef4444 60%, #ef4444 100%)',
                    }}
                  />
                  {/* Marker Pin */}
                  <div
                    style={{
                      position: 'absolute',
                      top: -4,
                      left: `${bmiData.markerPct}%`,
                      transform: 'translateX(-50%)',
                      width: 20,
                      height: 20,
                      background: '#ffffff',
                      border: '3px solid var(--ink)',
                      borderRadius: '50%',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      transition: 'left 0.2s ease',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)' }}>
                  <span>15 (Under)</span>
                  <span>18.5 (Normal)</span>
                  <span>25 (Over)</span>
                  <span>30+ (Obese)</span>
                </div>
              </div>

              {/* Healthy Weight Card */}
              <div style={{ padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ink-2)' }}>Healthy Weight Range:</span>
                  <strong style={{ color: 'var(--ink)' }}>{bmiData.healthyRangeStr}</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.4 }}>
                  {bmiData.advice}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* WHO Classification Reference Table */}
      <div className="c-card" style={{ padding: 20 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: 'var(--ink)' }}>
          WHO Body Mass Index (BMI) Classifications
        </h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--ink-3)' }}>
                <th style={{ padding: '8px 12px' }}>Category</th>
                <th style={{ padding: '8px 12px' }}>BMI Range (kg/m²)</th>
                <th style={{ padding: '8px 12px' }}>Health Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cat: 'Underweight', range: '< 18.5', risk: 'Increased risk of nutritional deficiency', color: '#3b82f6' },
                { cat: 'Normal Weight', range: '18.5 – 24.9', risk: 'Lowest risk for cardiovascular issues', color: 'var(--pos)' },
                { cat: 'Overweight', range: '25.0 – 29.9', risk: 'Moderate risk, lifestyle modifications suggested', color: '#f59e0b' },
                { cat: 'Obesity Class I', range: '30.0 – 34.9', risk: 'High health risk', color: 'var(--neg)' },
                { cat: 'Obesity Class II & III', range: '≥ 35.0', risk: 'Extremely high risk, clinical guidance advised', color: 'var(--neg)' },
              ].map((row) => (
                <tr key={row.cat} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: row.color }}>{row.cat}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--ink)' }}>{row.range}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>{row.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}