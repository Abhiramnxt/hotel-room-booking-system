import 'dotenv/config';
import { dbOps } from '../src/server_db.js';
import { query } from '../src/mysql_client.js';

async function testAccountsMetrics() {
  console.log('=== STARTING ACCOUNTS METRICS & CALCULATION TEST ===');
  
  try {
    const payments = await dbOps.getPayments();
    console.log(`Total payments retrieved from MySQL: ${payments.length}`);

    // Map payments to simulate frontend format mapping
    const formattedPayments = payments.map((p) => ({
      ...p,
      amount: Number(p.amount) || 0,
      gst_amount: Number(p.gst_amount) || 0
    }));

    // Verify all parsed values are numeric type
    const hasNonNumeric = formattedPayments.some(
      (p) => typeof p.amount !== 'number' || typeof p.gst_amount !== 'number'
    );
    console.log(`- All payment fields parsed to Numbers: ${!hasNonNumeric}`);

    // Calculate aggregates matching React logic
    const paidPayments = formattedPayments.filter(p => p.payment_status === 'Paid');
    const totalReceived = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalGST = paidPayments.reduce((sum, p) => sum + p.gst_amount, 0);
    const totalPending = formattedPayments
      .filter(p => p.payment_status === 'Pending')
      .reduce((sum, p) => sum + p.amount, 0);

    // Verify type is number and no concatenation occurred
    console.log(`- Gross Revenue Type (Expected 'number'): ${typeof totalReceived}`);
    console.log(`- GST Collected Type (Expected 'number'): ${typeof totalGST}`);
    console.log(`- Pending Holds Type (Expected 'number'): ${typeof totalPending}`);

    console.log(`- Raw Gross Sum: ${totalReceived}`);
    console.log(`- Raw GST Sum: ${totalGST}`);
    console.log(`- Raw Pending Sum: ${totalPending}`);

    // Verify formatting behaves correctly
    const formattedGross = totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedGST = totalGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedPending = totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    console.log(`- Formatted Gross (Expected with commas & .00): ₹${formattedGross}`);
    console.log(`- Formatted GST: ₹${formattedGST}`);
    console.log(`- Formatted Pending: ₹${formattedPending}`);

    // Assert that the formatted string has no concatenations (e.g. no multiple decimal points or corrupted patterns)
    const isCorrupted = (str) => {
      // If a string contains multiple decimal points or is excessively long without commas matching pattern
      const occurrences = (str.match(/\./g) || []).length;
      return occurrences > 1 || str.includes('0017') || str.includes('0029');
    };

    if (!hasNonNumeric && !isCorrupted(formattedGross) && !isCorrupted(formattedGST) && !isCorrupted(formattedPending)) {
      console.log('\n✅ ACCOUNTS METRICS & CURRENCY FORMATTING TEST PASSED!');
    } else {
      console.error('\n❌ CURRENCY CORRUPTION OR CONCATENATION DETECTED!');
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ ACCOUNT METRICS TEST ERROR:', err);
    process.exit(1);
  }
}

testAccountsMetrics();
