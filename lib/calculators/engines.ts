export function calcPercentage(value: number, percent: number): number {
  return (value * percent) / 100;
}
export function calcPercentageOf(part: number, whole: number): number {
  if (whole === 0) return 0;
  return (part / whole) * 100;
}
export function calcPercentageChange(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / from) * 100;
}
export function calcPercentageIncrease(value: number, percent: number): number {
  return value + (value * percent) / 100;
}
export function calcPercentageDecrease(value: number, percent: number): number {
  return value - (value * percent) / 100;
}

export interface AgeResult { years: number; months: number; days: number; totalDays: number; nextBirthday: string; zodiacSign: string; }
export function calcAge(dob: Date, asOf: Date): AgeResult {
  const diffTime = asOf.getTime() - dob.getTime();
  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  let years = asOf.getFullYear() - dob.getFullYear();
  let months = asOf.getMonth() - dob.getMonth();
  let days = asOf.getDate() - dob.getDate();
  if (days < 0) {
    months--;
    const prevMonth = new Date(asOf.getFullYear(), asOf.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  const nextBirthdayDate = new Date(asOf.getFullYear(), dob.getMonth(), dob.getDate());
  if (nextBirthdayDate < asOf) nextBirthdayDate.setFullYear(nextBirthdayDate.getFullYear() + 1);
  const nextBirthdayDays = Math.ceil((nextBirthdayDate.getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24));
  
  const m = dob.getMonth() + 1;
  const d = dob.getDate();
  let zodiacSign = '';
  if ((m == 1 && d <= 19) || (m == 12 && d >= 22)) zodiacSign = 'Capricorn';
  else if ((m == 1 && d >= 20) || (m == 2 && d <= 18)) zodiacSign = 'Aquarius';
  else if ((m == 2 && d >= 19) || (m == 3 && d <= 20)) zodiacSign = 'Pisces';
  else if ((m == 3 && d >= 21) || (m == 4 && d <= 19)) zodiacSign = 'Aries';
  else if ((m == 4 && d >= 20) || (m == 5 && d <= 20)) zodiacSign = 'Taurus';
  else if ((m == 5 && d >= 21) || (m == 6 && d <= 20)) zodiacSign = 'Gemini';
  else if ((m == 6 && d >= 21) || (m == 7 && d <= 22)) zodiacSign = 'Cancer';
  else if ((m == 7 && d >= 23) || (m == 8 && d <= 22)) zodiacSign = 'Leo';
  else if ((m == 8 && d >= 23) || (m == 9 && d <= 22)) zodiacSign = 'Virgo';
  else if ((m == 9 && d >= 23) || (m == 10 && d <= 22)) zodiacSign = 'Libra';
  else if ((m == 10 && d >= 23) || (m == 11 && d <= 21)) zodiacSign = 'Scorpio';
  else if ((m == 11 && d >= 22) || (m == 12 && d <= 21)) zodiacSign = 'Sagittarius';

  return { years, months, days, totalDays, nextBirthday: nextBirthdayDays + ' days', zodiacSign };
}

export interface BmiResult { bmi: number; category: string; minHealthyWeight: number; maxHealthyWeight: number; }
export function calcBmi(weightKg: number, heightCm: number): BmiResult {
  const hM = heightCm / 100;
  const bmi = weightKg / (hM * hM);
  let category = '';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  
  const minHealthyWeight = 18.5 * (hM * hM);
  const maxHealthyWeight = 24.9 * (hM * hM);
  
  return { bmi: parseFloat(bmi.toFixed(1)), category, minHealthyWeight, maxHealthyWeight };
}

export interface EmiResult { emi: number; totalPayment: number; totalInterest: number; schedule: { month: number; principal: number; interest: number; balance: number }[]; }
export function calcEmi(principal: number, annualRate: number, tenureMonths: number): EmiResult {
  if (annualRate === 0) {
    const emi = principal / tenureMonths;
    return {
      emi, totalPayment: principal, totalInterest: 0,
      schedule: Array.from({length: tenureMonths}, (_, i) => ({ month: i+1, principal: emi, interest: 0, balance: principal - emi * (i+1) }))
    };
  }
  const r = annualRate / 12 / 100;
  const emi = principal * r * Math.pow(1 + r, tenureMonths) / (Math.pow(1 + r, tenureMonths) - 1);
  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - principal;
  
  let balance = principal;
  const schedule = [];
  for (let i = 1; i <= tenureMonths; i++) {
    const interest = balance * r;
    const princ = emi - interest;
    balance -= princ;
    if (balance < 0) balance = 0;
    schedule.push({ month: i, principal: princ, interest, balance });
  }
  
  return { emi, totalPayment, totalInterest, schedule };
}

export interface LoanResult { emi: number; totalPayment: number; totalInterest: number; yearlySchedule: { year: number; principalPaid: number; interestPaid: number; balance: number }[]; }
export function calcLoan(principal: number, annualRate: number, tenureYears: number): LoanResult {
  const emiRes = calcEmi(principal, annualRate, tenureYears * 12);
  const yearlySchedule = [];
  for (let y = 1; y <= tenureYears; y++) {
    let yearPrin = 0, yearInt = 0, balance = 0;
    for (let m = 1; m <= 12; m++) {
      const s = emiRes.schedule[(y - 1) * 12 + m - 1];
      if (s) {
        yearPrin += s.principal;
        yearInt += s.interest;
        balance = s.balance;
      }
    }
    yearlySchedule.push({ year: y, principalPaid: yearPrin, interestPaid: yearInt, balance });
  }
  return { emi: emiRes.emi, totalPayment: emiRes.totalPayment, totalInterest: emiRes.totalInterest, yearlySchedule };
}

export type CompoundFrequency = 'annually' | 'semi-annually' | 'quarterly' | 'monthly' | 'daily';
export interface CIResult { maturityAmount: number; totalInterest: number; principalAmount: number; yearlyBreakdown: { year: number; amount: number; interest: number }[]; }
export function calcCompoundInterest(principal: number, annualRate: number, years: number, frequency: CompoundFrequency): CIResult {
  const freqMap = { 'annually': 1, 'semi-annually': 2, 'quarterly': 4, 'monthly': 12, 'daily': 365 };
  const n = freqMap[frequency];
  const r = annualRate / 100;
  const maturityAmount = principal * Math.pow(1 + r / n, n * years);
  const totalInterest = maturityAmount - principal;
  
  const yearlyBreakdown = [];
  for (let y = 1; y <= years; y++) {
    const amount = principal * Math.pow(1 + r / n, n * y);
    yearlyBreakdown.push({ year: y, amount, interest: amount - principal });
  }
  
  return { maturityAmount, totalInterest, principalAmount: principal, yearlyBreakdown };
}

export interface SIResult { interest: number; totalAmount: number; }
export function calcSimpleInterest(principal: number, annualRate: number, years: number): SIResult {
  const interest = (principal * annualRate * years) / 100;
  return { interest, totalAmount: principal + interest };
}

export type GstRate = 0 | 3 | 5 | 12 | 18 | 28;
export interface GstResult { basePrice: number; gstAmount: number; totalPrice: number; cgst: number; sgst: number; igst: number; }
export function calcGstExclusive(basePrice: number, rate: GstRate): GstResult {
  const gstAmount = (basePrice * rate) / 100;
  return { basePrice, gstAmount, totalPrice: basePrice + gstAmount, cgst: gstAmount / 2, sgst: gstAmount / 2, igst: gstAmount };
}
export function calcGstInclusive(totalPrice: number, rate: GstRate): GstResult {
  const basePrice = totalPrice / (1 + rate / 100);
  const gstAmount = totalPrice - basePrice;
  return { basePrice, gstAmount, totalPrice, cgst: gstAmount / 2, sgst: gstAmount / 2, igst: gstAmount };
}

export interface DiscountResult { originalPrice: number; discountAmount: number; finalPrice: number; savingPercent: number; }
export function calcDiscount(originalPrice: number, discountPercent: number): DiscountResult {
  const discountAmount = (originalPrice * discountPercent) / 100;
  return { originalPrice, discountAmount, finalPrice: originalPrice - discountAmount, savingPercent: discountPercent };
}
export function calcDiscountFromPrices(originalPrice: number, salePrice: number): DiscountResult {
  const discountAmount = originalPrice - salePrice;
  const savingPercent = (discountAmount / originalPrice) * 100;
  return { originalPrice, discountAmount, finalPrice: salePrice, savingPercent };
}

export type FdCompounding = 'monthly' | 'quarterly' | 'half-yearly' | 'annually';
export interface FdResult { maturityAmount: number; totalInterest: number; principalAmount: number; yearlyBreakdown: { year: number; amount: number; interest: number }[]; }
export function calcFd(principal: number, annualRate: number, years: number, compounding: FdCompounding): FdResult {
  const freqMap = { 'annually': 1, 'half-yearly': 2, 'quarterly': 4, 'monthly': 12 };
  const n = freqMap[compounding] || 4;
  const r = annualRate / 100;
  const maturityAmount = principal * Math.pow(1 + r / n, n * years);
  const totalInterest = maturityAmount - principal;
  
  const yearlyBreakdown = [];
  for (let y = 1; y <= years; y++) {
    const amount = principal * Math.pow(1 + r / n, n * y);
    yearlyBreakdown.push({ year: y, amount, interest: amount - principal });
  }
  return { maturityAmount, totalInterest, principalAmount: principal, yearlyBreakdown };
}

export interface DateDiffResult { totalDays: number; years: number; months: number; days: number; weeks: number; hours: number; minutes: number; seconds: number; businessDays: number; weekendDays: number; }
export function calcDateDiff(from: Date, to: Date): DateDiffResult {
  const diffTime = Math.abs(to.getTime() - from.getTime());
  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const totalSeconds = Math.floor(diffTime / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const weeks = Math.floor(totalDays / 7);
  
  const minDate = new Date(from < to ? from : to);
  const maxDate = new Date(from > to ? from : to);
  
  let years = maxDate.getFullYear() - minDate.getFullYear();
  let months = maxDate.getMonth() - minDate.getMonth();
  let days = maxDate.getDate() - minDate.getDate();
  
  if (days < 0) {
    months--;
    const prevMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  // Calculate working/weekend days
  let businessDays = 0;
  let weekendDays = 0;
  const cur = new Date(minDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(maxDate);
  end.setHours(0, 0, 0, 0);
  while (cur < end) {
    const day = cur.getDay();
    if (day === 0 || day === 6) {
      weekendDays++;
    } else {
      businessDays++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  
  return { totalDays, years, months, days, weeks, hours: totalHours, minutes: totalMinutes, seconds: totalSeconds, businessDays, weekendDays };
}

export type UnitCategory = 'length' | 'weight' | 'temperature' | 'area' | 'volume' | 'speed' | 'data' | 'time';
const factors: Record<string, Record<string, number>> = {
  length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
  weight: { mg: 0.000001, g: 0.001, kg: 1, t: 1000, oz: 0.0283495, lb: 0.453592 },
  area: { mm2: 0.000001, cm2: 0.0001, m2: 1, km2: 1000000, in2: 0.00064516, ft2: 0.092903, ac: 4046.86, ha: 10000 },
  volume: { ml: 0.001, L: 1, m3: 1000, tsp: 0.00492892, tbsp: 0.0147868, floz: 0.0295735, cup: 0.24, pt: 0.473176, qt: 0.946353, gal: 3.78541 },
  speed: { 'm/s': 1, 'km/h': 0.277778, mph: 0.44704, knot: 0.514444, 'ft/s': 0.3048 },
  data: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776, PB: 1125899906842624 },
  time: { ms: 0.001, s: 1, min: 60, h: 3600, d: 86400, wk: 604800, mo: 2592000, yr: 31536000 }
};
const unitLabels: Record<string, string> = {
  mm: 'Millimeters (mm)', cm: 'Centimeters (cm)', m: 'Meters (m)', km: 'Kilometers (km)', in: 'Inches (in)', ft: 'Feet (ft)', yd: 'Yards (yd)', mi: 'Miles (mi)',
  mg: 'Milligrams (mg)', g: 'Grams (g)', kg: 'Kilograms (kg)', t: 'Metric Tons (t)', oz: 'Ounces (oz)', lb: 'Pounds (lb)',
  C: 'Celsius (°C)', F: 'Fahrenheit (°F)', K: 'Kelvin (K)',
  mm2: 'Square Millimeters (mm²)', cm2: 'Square Centimeters (cm²)', m2: 'Square Meters (m²)', km2: 'Square Kilometers (km²)', in2: 'Square Inches (in²)', ft2: 'Square Feet (ft²)', ac: 'Acres (ac)', ha: 'Hectares (ha)',
  ml: 'Milliliters (ml)', L: 'Liters (L)', m3: 'Cubic Meters (m³)', tsp: 'Teaspoons (tsp)', tbsp: 'Tablespoons (tbsp)', floz: 'Fluid Ounces (fl oz)', cup: 'Cups', pt: 'Pints (pt)', qt: 'Quarts (qt)', gal: 'Gallons (gal)',
  'm/s': 'Meters/second (m/s)', 'km/h': 'Kilometers/hour (km/h)', mph: 'Miles/hour (mph)', knot: 'Knots (kn)', 'ft/s': 'Feet/second (ft/s)',
  B: 'Bytes (B)', KB: 'Kilobytes (KB)', MB: 'Megabytes (MB)', GB: 'Gigabytes (GB)', TB: 'Terabytes (TB)', PB: 'Petabytes (PB)',
  ms: 'Milliseconds (ms)', s: 'Seconds (s)', min: 'Minutes (min)', h: 'Hours (h)', d: 'Days (d)', wk: 'Weeks (wk)', mo: 'Months (30d)', yr: 'Years (365d)'
};
export function convertUnit(value: number, fromUnit: string, toUnit: string, category: UnitCategory): number {
  if (category === 'temperature') {
    let c = value;
    if (fromUnit === 'F') c = (value - 32) * 5/9;
    else if (fromUnit === 'K') c = value - 273.15;
    
    if (toUnit === 'F') return c * 9/5 + 32;
    if (toUnit === 'K') return c + 273.15;
    return c;
  }
  const factorList = factors[category];
  if (!factorList || !factorList[fromUnit] || !factorList[toUnit]) return value;
  const inBase = value * factorList[fromUnit];
  return inBase / factorList[toUnit];
}
export function getUnitsForCategory(category: UnitCategory): { label: string; value: string }[] {
  if (category === 'temperature') return [{label:'Celsius (°C)', value:'C'}, {label:'Fahrenheit (°F)', value:'F'}, {label:'Kelvin (K)', value:'K'}];
  const factorList = factors[category];
  if (!factorList) return [];
  return Object.keys(factorList).map(k => ({ label: unitLabels[k] || k, value: k }));
}
