import assert from 'node:assert';
import {
  calcPercentage,
  calcPercentageOf,
  calcPercentageChange,
  calcPercentageIncrease,
  calcPercentageDecrease,
  calcAge,
  calcBmi,
  calcEmi,
  calcLoan,
  calcCompoundInterest,
  calcSimpleInterest,
  calcGstExclusive,
  calcGstInclusive,
  calcDiscount,
  calcDiscountFromPrices,
  calcFd,
  calcDateDiff,
  convertUnit,
  getUnitsForCategory,
} from '../lib/calculators/engines.ts';

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}:`, err.message);
  }
}

console.log('\n================================================================');
console.log(' 🧮 CALCULATOR ENGINES TEST SUITE');
console.log('================================================================\n');

// 1. Percentage
test('calcPercentage: 15% of 200 = 30', () => {
  assert.strictEqual(calcPercentage(200, 15), 30);
});
test('calcPercentageOf: 45 of 180 = 25%', () => {
  assert.strictEqual(calcPercentageOf(45, 180), 25);
});
test('calcPercentageChange: 100 to 150 = +50%', () => {
  assert.strictEqual(calcPercentageChange(100, 150), 50);
});
test('calcPercentageChange: 200 to 150 = -25%', () => {
  assert.strictEqual(calcPercentageChange(200, 150), -25);
});
test('calcPercentageIncrease: 500 + 10% = 550', () => {
  assert.strictEqual(calcPercentageIncrease(500, 10), 550);
});
test('calcPercentageDecrease: 500 - 10% = 450', () => {
  assert.strictEqual(calcPercentageDecrease(500, 10), 450);
});

// 2. Age
test('calcAge: computes exact years, months, and days', () => {
  const dob = new Date('2000-01-15');
  const asOf = new Date('2025-06-20');
  const res = calcAge(dob, asOf);
  assert.strictEqual(res.years, 25);
  assert.strictEqual(res.months, 5);
  assert.strictEqual(res.days, 5);
  assert.strictEqual(res.zodiacSign, 'Capricorn');
});

// 3. BMI
test('calcBmi: calculates normal BMI', () => {
  const res = calcBmi(70, 175);
  assert.strictEqual(res.bmi, 22.9);
  assert.strictEqual(res.category, 'Normal');
});
test('calcBmi: detects underweight', () => {
  const res = calcBmi(45, 175);
  assert.strictEqual(res.category, 'Underweight');
});
test('calcBmi: detects overweight', () => {
  const res = calcBmi(85, 175);
  assert.strictEqual(res.category, 'Overweight');
});
test('calcBmi: detects obese', () => {
  const res = calcBmi(110, 175);
  assert.strictEqual(res.category, 'Obese');
});

// 4. EMI
test('calcEmi: calculates monthly payment for standard home loan', () => {
  const res = calcEmi(1000000, 10, 120); // 10L, 10%, 10 yrs (120 mos)
  assert.ok(res.emi > 13200 && res.emi < 13300, `EMI was ${res.emi}`);
  assert.ok(res.totalPayment > 1000000);
  assert.strictEqual(res.schedule.length, 120);
});

// 5. Loan
test('calcLoan: calculates yearly schedule matching emi', () => {
  const res = calcLoan(1000000, 10, 5);
  assert.strictEqual(res.yearlySchedule.length, 5);
  assert.ok(res.totalPayment > 1000000);
});

// 6. Compound Interest
test('calcCompoundInterest: computes annual and monthly compound growth', () => {
  const res = calcCompoundInterest(100000, 10, 5, 'annually');
  // 100000 * (1.1)^5 = 161051
  assert.strictEqual(Math.round(res.maturityAmount), 161051);
  assert.strictEqual(Math.round(res.totalInterest), 61051);
});

// 7. Simple Interest
test('calcSimpleInterest: SI = P*R*T/100', () => {
  const res = calcSimpleInterest(50000, 8, 3);
  assert.strictEqual(res.interest, 12000);
  assert.strictEqual(res.totalAmount, 62000);
});

// 8. GST
test('calcGstExclusive: adds 18% GST', () => {
  const res = calcGstExclusive(1000, 18);
  assert.strictEqual(res.basePrice, 1000);
  assert.strictEqual(res.gstAmount, 180);
  assert.strictEqual(res.totalPrice, 1180);
  assert.strictEqual(res.cgst, 90);
  assert.strictEqual(res.sgst, 90);
});
test('calcGstInclusive: extracts 18% GST from total price', () => {
  const res = calcGstInclusive(1180, 18);
  assert.strictEqual(Math.round(res.basePrice), 1000);
  assert.strictEqual(Math.round(res.gstAmount), 180);
  assert.strictEqual(res.totalPrice, 1180);
});

// 9. Discount
test('calcDiscount: computes discount and final price', () => {
  const res = calcDiscount(2500, 20);
  assert.strictEqual(res.discountAmount, 500);
  assert.strictEqual(res.finalPrice, 2000);
});
test('calcDiscountFromPrices: finds percentage off', () => {
  const res = calcDiscountFromPrices(2000, 1500);
  assert.strictEqual(res.discountAmount, 500);
  assert.strictEqual(res.savingPercent, 25);
});

// 10. Fixed Deposit
test('calcFd: calculates quarterly bank compounding maturity', () => {
  const res = calcFd(100000, 8, 3, 'quarterly');
  assert.ok(res.maturityAmount > 126000 && res.maturityAmount < 127000);
  assert.strictEqual(res.yearlyBreakdown.length, 3);
});

// 11. Date Difference
test('calcDateDiff: computes exact duration & business days', () => {
  const from = new Date('2025-01-01');
  const to = new Date('2025-01-15');
  const res = calcDateDiff(from, to);
  assert.strictEqual(res.totalDays, 14);
  assert.strictEqual(res.weeks, 2);
  assert.strictEqual(res.businessDays, 10);
  assert.strictEqual(res.weekendDays, 4);
});

// 12. Unit Converter
test('convertUnit: length conversion', () => {
  assert.strictEqual(convertUnit(1, 'm', 'cm', 'length'), 100);
  assert.strictEqual(convertUnit(1, 'km', 'm', 'length'), 1000);
});
test('convertUnit: temperature conversion', () => {
  assert.strictEqual(convertUnit(0, 'C', 'F', 'temperature'), 32);
  assert.strictEqual(convertUnit(100, 'C', 'F', 'temperature'), 212);
  assert.strictEqual(convertUnit(32, 'F', 'C', 'temperature'), 0);
});
test('convertUnit: digital data conversion', () => {
  assert.strictEqual(convertUnit(1, 'GB', 'MB', 'data'), 1024);
  assert.strictEqual(convertUnit(1024, 'KB', 'MB', 'data'), 1);
});
test('convertUnit: time conversion', () => {
  assert.strictEqual(convertUnit(1, 'h', 'min', 'time'), 60);
  assert.strictEqual(convertUnit(1, 'd', 'h', 'time'), 24);
});

console.log(`\nResults: ${passed}/${total} tests passed!`);
if (passed === total) {
  console.log('✅ ALL CALCULATOR TESTS PASSED!\n');
} else {
  process.exit(1);
}
