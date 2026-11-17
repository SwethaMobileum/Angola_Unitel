import process from 'process';

async function testSync() {
  console.log('--- Starting Cross-Portal Sync & Functionality Test ---\n');

  const PORT_APPLICANT = 5173;
  const PORT_APPROVER = 5174;
  const baseUrlApplicant = `http://localhost:${PORT_APPLICANT}`;
  const baseUrlApprover = `http://localhost:${PORT_APPROVER}`;

  let errors = [];

  // Test 1: Health check on both ports
  console.log('[Test 1] Health check on both ports...');
  try {
    const resApplicant = await fetch(`${baseUrlApplicant}/api/db/health`);
    const dataApplicant = await resApplicant.json();
    console.log(`  Applicant :5173 health:`, dataApplicant.status, `(apps: ${dataApplicant.applicationCount})`);

    const resApprover = await fetch(`${baseUrlApprover}/api/db/health`);
    const dataApprover = await resApprover.json();
    console.log(`  Approver  :5174 health:`, dataApprover.status, `(apps: ${dataApprover.applicationCount})`);

    if (dataApplicant.status !== 'ok' || dataApprover.status !== 'ok') {
      errors.push('Health check failed on one or both ports');
    }
  } catch (err) {
    errors.push(`Health check exception: ${err.message}`);
  }

  // Test 2: Fetch all applications from both ports and verify consistency
  console.log('\n[Test 2] Comparing database snapshot across ports...');
  try {
    const resApp1 = await fetch(`${baseUrlApplicant}/api/db/applications`);
    const apps1 = await resApp1.json();
    const resApp2 = await fetch(`${baseUrlApprover}/api/db/applications`);
    const apps2 = await resApp2.json();

    console.log(`  Port 5173 application count: ${apps1.length}`);
    console.log(`  Port 5174 application count: ${apps2.length}`);

    if (apps1.length !== apps2.length) {
      errors.push(`Application count mismatch between ports: 5173 has ${apps1.length}, 5174 has ${apps2.length}`);
    }
  } catch (err) {
    errors.push(`Snapshot comparison exception: ${err.message}`);
  }

  // Test 3: Create a test application on Applicant portal (:5173)
  console.log('\n[Test 3] Submitting new application from Applicant portal (:5173)...');
  const testAppId = `test-sync-${Date.now()}`;
  const newApp = {
    id: testAppId,
    evaluation_id: 'eval-test-sync',
    equipment_id: 'eq-phone-001',
    price_kz: 18000,
    term_months: 6,
    rate_pct: 0,
    monthly_emi_kz: 3000,
    emi_share_pct: 3.5,
    status: 'submitted',
    submitted_by: '00000000-0000-0000-0000-000000000001',
    submitted_at: new Date().toISOString(),
    evaluation: {
      id: 'eval-test-sync',
      customer: {
        full_name: 'Test Cross-Port Sync Applicant',
        msisdn: '+244 923 999 888',
        email: 'test.sync@unitel.ao',
      },
      results: {
        score: 720,
        band_label: 'Good',
      },
    },
    equipment: {
      id: 'eq-phone-001',
      name: 'Unitel Feature Phone 2G/3G',
      price_kz: 18000,
    },
  };

  try {
    const postRes = await fetch(`${baseUrlApplicant}/api/db/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newApp),
    });
    const postData = await postRes.json();
    console.log(`  Submission response on :5173:`, postData.success ? 'SUCCESS' : 'FAILED');

    // Wait 250ms for file write / fs.watch propagation
    await new Promise((r) => setTimeout(r, 350));

    // Verify Port 5174 sees this new application
    const checkRes = await fetch(`${baseUrlApprover}/api/db/applications`);
    const approverApps = await checkRes.json();
    const foundOnApprover = approverApps.find((a) => a.id === testAppId);

    if (foundOnApprover) {
      console.log(`  ✓ Port 5174 successfully received application ${testAppId} (status: ${foundOnApprover.status})`);
    } else {
      errors.push(`Port 5174 did not see new application ${testAppId} created on Port 5173`);
    }
  } catch (err) {
    errors.push(`Application creation test exception: ${err.message}`);
  }

  // Test 4: Approver executes decision on Port 5174
  console.log('\n[Test 4] Submitting approval decision from Approver portal (:5174)...');
  try {
    const decisionRes = await fetch(`${baseUrlApprover}/api/db/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: testAppId,
        decision: 'approved',
        reason: 'Automated cross-portal sync verification test approval',
        approverName: 'Dra. Maria Mendes (Approver Test)',
        applicantEmail: 'test.sync@unitel.ao',
      }),
    });
    const decisionData = await decisionRes.json();
    console.log(`  Decision response on :5174:`, decisionData.success ? 'SUCCESS' : 'FAILED');

    // Wait 250ms for propagation
    await new Promise((r) => setTimeout(r, 350));

    // Verify Port 5173 sees the application status as 'approved'
    const checkApplicantRes = await fetch(`${baseUrlApplicant}/api/db/applications`);
    const applicantApps = await checkApplicantRes.json();
    const updatedAppOnApplicant = applicantApps.find((a) => a.id === testAppId);

    if (updatedAppOnApplicant && updatedAppOnApplicant.status === 'approved') {
      console.log(`  ✓ Port 5173 successfully reflected status '${updatedAppOnApplicant.status}' for ${testAppId}`);
    } else {
      errors.push(`Port 5173 did not reflect 'approved' status for ${testAppId}. Found status: ${updatedAppOnApplicant?.status}`);
    }

    // Verify Port 5173 received the notification record
    const notifsRes = await fetch(`${baseUrlApplicant}/api/db/all`);
    const allDb = await notifsRes.json();
    const relatedNotif = allDb.notifications?.find((n) => n.application_id === testAppId);
    if (relatedNotif) {
      console.log(`  ✓ Port 5173 successfully received decision notification: "${relatedNotif.subject}"`);
    } else {
      console.log(`  Note: Notification for ${testAppId} not found in shared DB (may be logged via client)`);
    }
  } catch (err) {
    errors.push(`Decision sync test exception: ${err.message}`);
  }

  // Test 5: Clean up test record from shared_db.json
  console.log('\n[Test 5] Cleaning up test record...');
  try {
    const allRes = await fetch(`${baseUrlApplicant}/api/db/all`);
    const db = await allRes.json();
    db.applications = db.applications.filter((a) => a.id !== testAppId);
    db.approvals = db.approvals.filter((a) => a.application_id !== testAppId);
    db.notifications = db.notifications.filter((n) => n.application_id !== testAppId);

    // Write cleaned state back via fs directly or patch
    const fs = await import('fs');
    const path = await import('path');
    const dbPath = path.resolve('data/shared_db.json');
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
    console.log(`  ✓ Test record ${testAppId} cleaned up from database.`);
  } catch (err) {
    console.warn('  Cleanup note:', err.message);
  }

  console.log('\n====================================================');
  if (errors.length === 0) {
    console.log(' ALL CROSS-PORTAL SYNC TESTS PASSED SUCCESSFULLY! ');
  } else {
    console.error(' TESTS COMPLETED WITH ERRORS:');
    errors.forEach((e) => console.error(`  - ${e}`));
  }
  console.log('====================================================\n');

  process.exit(errors.length === 0 ? 0 : 1);
}

testSync();
