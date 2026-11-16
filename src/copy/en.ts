/**
 * Centralized English Copy for Angola Telecom Credit Scoring & Equipment Financing (Unitel)
 * Allows internationalization / Portuguese localization in the future.
 */

export const COPY = {
  app: {
    title: 'Unitel Credit Intelligence',
    subtitle: 'Angola Telecom Credit Scoring & Equipment Financing Platform',
    tagline: 'Multi-segment credit limit and equipment loan evaluation',
    currencyUnit: 'Kz',
    version: 'v1.0.0 Enterprise',
  },
  roles: {
    analyst: {
      label: 'Analyst',
      desc: 'Evaluate subscribers, run segment chain, and submit equipment loan applications.',
    },
    approver: {
      label: 'Approver',
      desc: 'Review submitted loan applications, inspect score breakdowns, and approve/reject.',
    },
    admin: {
      label: 'Admin',
      desc: 'Manage scoring parameters, segment weights, overlay rules, limits, and feature flags.',
    },
  },
  nav: {
    dashboard: 'Dashboard',
    segments: 'Segments',
    newEvaluation: 'New evaluation',
    evaluations: 'Evaluations',
    applications: 'Applications',
    approvals: 'Approvals',
    notifications: 'Notifications',
    auditLog: 'Audit log',
    admin: 'Admin',
  },
  blocks: {
    P: { code: 'P', name: 'Personal and identity', color: '#5F6F80' },
    T: { code: 'T', name: 'Telecom behaviour', color: '#2A7F8E' },
    W: { code: 'W', name: 'Wallet and mobile money', color: '#7B4FA3' },
    B: { code: 'B', name: 'Bank and formal finance', color: '#1F3A5F' },
    X: { code: 'X', name: 'Other alternative data', color: '#B26A00' },
    A: { code: 'A', name: 'Assets and income', color: '#2E7D4F' },
  },
  segments: {
    S1: { code: 'S1', name: 'Button phone, cash-only', color: '#8A6D3B' },
    S2: { code: 'S2', name: 'Button phone with USSD wallet', color: '#C0612B' },
    S3: { code: 'S3', name: 'Smartphone, unbanked, wallet app', color: '#7B4FA3' },
    S4: { code: 'S4', name: 'Agent-assisted cash user', color: '#B8860B' },
    S5: { code: 'S5', name: 'Banked, branch and ATM user', color: '#1F3A5F' },
    S6: { code: 'S6', name: 'Banked digital, hybrid with wallet', color: '#2A7F8E' },
    S7: { code: 'S7', name: 'Salaried formal worker', color: '#2E7D4F' },
    S8: { code: 'S8', name: 'Self-employed or informal trader', color: '#A83F5C' },
    S9: { code: 'S9', name: 'Remittance-dependent household', color: '#4A6FA5' },
    S10: { code: 'S10', name: 'Postpaid or high-value subscriber', color: '#444B6E' },
  },
  paramRoles: {
    main: 'Main',
    support: 'Support',
    bonus: 'Bonus',
    limit_only: 'Limit only',
    not_available: 'Not available',
    not_used: 'Not used',
  },
  confidence: {
    high: 'High Confidence',
    medium: 'Medium Confidence',
    low: 'Low Confidence',
  },
  coreIdea:
    'Customers hold and move money in different ways (cash, USSD, wallet apps, banks, agents). Each segment receives its own tailored parameter mix. A missing parameter or block is never counted as a penalty.',
  walletNotice: {
    enabled: 'Wallet scoring active',
    disabled: 'Wallet scoring is switched off (redistributed to telecom and main blocks)',
    toggleLabel: 'Wallet data available?',
  },
  common: {
    back: 'Back',
    next: 'Next',
    save: 'Save',
    cancel: 'Cancel',
    submit: 'Submit',
    approve: 'Approve',
    reject: 'Reject',
    review: 'Review',
    search: 'Search...',
    filter: 'Filter',
    status: 'Status',
    actions: 'Actions',
    loading: 'Loading data...',
    noData: 'No records found.',
    all: 'All',
    yes: 'Yes',
    no: 'No',
    skip: 'Skip',
    viewDetails: 'View details',
  },
} as const;
