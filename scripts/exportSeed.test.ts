import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createSeedLoanData } from '../src/lib/loans';
import { createSeedEvaluations } from '../src/lib/evaluations';

describe('Seed Data Exporter', () => {
  it('generates data/shared_db.json', () => {
    const loanData = createSeedLoanData();
    const evals = createSeedEvaluations();

    const sharedDb = {
      applications: loanData.applications,
      approvals: loanData.approvals,
      evaluations: evals,
      notifications: loanData.notifications,
      auditLogs: loanData.auditLogs,
      lastUpdated: new Date().toISOString(),
    };

    const outDir = path.resolve(__dirname, '../data');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const outPath = path.join(outDir, 'shared_db.json');
    fs.writeFileSync(outPath, JSON.stringify(sharedDb, null, 2), 'utf-8');

    expect(fs.existsSync(outPath)).toBe(true);
    expect(sharedDb.applications.length).toBeGreaterThanOrEqual(8);
    expect(sharedDb.evaluations.length).toBeGreaterThanOrEqual(8);
  });
});
