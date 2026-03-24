/**
 * Multi-Book Account Tracker — Track balances across multiple sportsbooks.
 *
 * Stores account balances, deposits, withdrawals per sportsbook in localStorage.
 * Calculates total portfolio value, allocation percentages, and balance history.
 *
 * Pure functions — no side effects except localStorage read/write.
 */

export interface BookAccount {
  /** Unique identifier */
  id: string
  /** Sportsbook name (e.g., "DraftKings", "FanDuel") */
  bookmaker: string
  /** Current balance in dollars */
  balance: number
  /** Total deposited lifetime */
  totalDeposited: number
  /** Total withdrawn lifetime */
  totalWithdrawn: number
  /** Last updated timestamp */
  updatedAt: string
  /** Optional notes */
  notes: string
}

export interface BookTransaction {
  id: string
  accountId: string
  type: 'deposit' | 'withdrawal' | 'adjustment'
  amount: number
  /** Balance after this transaction */
  balanceAfter: number
  note: string
  createdAt: string
}

export interface PortfolioSummary {
  /** Total balance across all books */
  totalBalance: number
  /** Total deposited across all books */
  totalDeposited: number
  /** Total withdrawn across all books */
  totalWithdrawn: number
  /** Net investment (deposited - withdrawn) */
  netInvestment: number
  /** Profit/loss (balance + withdrawn - deposited) */
  profitLoss: number
  /** ROI based on net investment */
  roi: number
  /** Number of active accounts */
  accountCount: number
  /** Allocation per book as percentage */
  allocations: { bookmaker: string; balance: number; percentage: number }[]
}

export interface BookBalanceSnapshot {
  date: string
  totalBalance: number
  accounts: { bookmaker: string; balance: number }[]
}

const ACCOUNTS_KEY = 'betbrain_book_accounts'
const TRANSACTIONS_KEY = 'betbrain_book_transactions'
const SNAPSHOTS_KEY = 'betbrain_book_snapshots'

function loadAccounts(): BookAccount[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    return raw ? (JSON.parse(raw) as BookAccount[]) : []
  } catch {
    return []
  }
}

function saveAccounts(accounts: BookAccount[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

function loadTransactions(): BookTransaction[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY)
    return raw ? (JSON.parse(raw) as BookTransaction[]) : []
  } catch {
    return []
  }
}

function saveTransactions(txns: BookTransaction[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txns))
}

function loadSnapshots(): BookBalanceSnapshot[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY)
    return raw ? (JSON.parse(raw) as BookBalanceSnapshot[]) : []
  } catch {
    return []
  }
}

function saveSnapshots(snapshots: BookBalanceSnapshot[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots))
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Get all sportsbook accounts.
 */
export function getAccounts(): BookAccount[] {
  return loadAccounts().sort((a, b) => b.balance - a.balance)
}

/**
 * Get a single account by ID.
 */
export function getAccount(id: string): BookAccount | null {
  return loadAccounts().find((a) => a.id === id) ?? null
}

/**
 * Add a new sportsbook account.
 */
export function addAccount(
  bookmaker: string,
  initialBalance: number,
  notes?: string
): BookAccount {
  const accounts = loadAccounts()
  const now = new Date().toISOString()
  const account: BookAccount = {
    id: generateId(),
    bookmaker: bookmaker.trim(),
    balance: initialBalance,
    totalDeposited: initialBalance > 0 ? initialBalance : 0,
    totalWithdrawn: 0,
    updatedAt: now,
    notes: notes?.trim() ?? '',
  }
  accounts.push(account)
  saveAccounts(accounts)

  // Record initial deposit if positive
  if (initialBalance > 0) {
    const txns = loadTransactions()
    txns.push({
      id: generateId(),
      accountId: account.id,
      type: 'deposit',
      amount: initialBalance,
      balanceAfter: initialBalance,
      note: 'Initial deposit',
      createdAt: now,
    })
    saveTransactions(txns)
  }

  return account
}

/**
 * Update an existing account.
 */
export function updateAccount(
  id: string,
  updates: Partial<Pick<BookAccount, 'bookmaker' | 'notes'>>
): BookAccount | null {
  const accounts = loadAccounts()
  const idx = accounts.findIndex((a) => a.id === id)
  if (idx < 0) return null

  if (updates.bookmaker !== undefined) {
    accounts[idx].bookmaker = updates.bookmaker.trim()
  }
  if (updates.notes !== undefined) {
    accounts[idx].notes = updates.notes.trim()
  }
  accounts[idx].updatedAt = new Date().toISOString()
  saveAccounts(accounts)
  return accounts[idx]
}

/**
 * Remove an account (and its transactions).
 */
export function removeAccount(id: string): boolean {
  const accounts = loadAccounts()
  const filtered = accounts.filter((a) => a.id !== id)
  if (filtered.length === accounts.length) return false
  saveAccounts(filtered)

  // Remove associated transactions
  const txns = loadTransactions().filter((t) => t.accountId !== id)
  saveTransactions(txns)
  return true
}

/**
 * Record a deposit to an account.
 */
export function recordDeposit(
  accountId: string,
  amount: number,
  note?: string
): BookTransaction | null {
  if (amount <= 0) return null
  const accounts = loadAccounts()
  const idx = accounts.findIndex((a) => a.id === accountId)
  if (idx < 0) return null

  const now = new Date().toISOString()
  accounts[idx].balance += amount
  accounts[idx].totalDeposited += amount
  accounts[idx].updatedAt = now
  saveAccounts(accounts)

  const txn: BookTransaction = {
    id: generateId(),
    accountId,
    type: 'deposit',
    amount,
    balanceAfter: accounts[idx].balance,
    note: note?.trim() ?? '',
    createdAt: now,
  }
  const txns = loadTransactions()
  txns.push(txn)
  saveTransactions(txns)
  return txn
}

/**
 * Record a withdrawal from an account.
 */
export function recordWithdrawal(
  accountId: string,
  amount: number,
  note?: string
): BookTransaction | null {
  if (amount <= 0) return null
  const accounts = loadAccounts()
  const idx = accounts.findIndex((a) => a.id === accountId)
  if (idx < 0) return null

  const now = new Date().toISOString()
  accounts[idx].balance -= amount
  accounts[idx].totalWithdrawn += amount
  accounts[idx].updatedAt = now
  saveAccounts(accounts)

  const txn: BookTransaction = {
    id: generateId(),
    accountId,
    type: 'withdrawal',
    amount,
    balanceAfter: accounts[idx].balance,
    note: note?.trim() ?? '',
    createdAt: now,
  }
  const txns = loadTransactions()
  txns.push(txn)
  saveTransactions(txns)
  return txn
}

/**
 * Record a balance adjustment (e.g., after reconciling with sportsbook).
 */
export function recordAdjustment(
  accountId: string,
  newBalance: number,
  note?: string
): BookTransaction | null {
  const accounts = loadAccounts()
  const idx = accounts.findIndex((a) => a.id === accountId)
  if (idx < 0) return null

  const now = new Date().toISOString()
  const diff = newBalance - accounts[idx].balance
  accounts[idx].balance = newBalance
  accounts[idx].updatedAt = now
  saveAccounts(accounts)

  const txn: BookTransaction = {
    id: generateId(),
    accountId,
    type: 'adjustment',
    amount: diff,
    balanceAfter: newBalance,
    note: note?.trim() || `Balance adjusted by ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`,
    createdAt: now,
  }
  const txns = loadTransactions()
  txns.push(txn)
  saveTransactions(txns)
  return txn
}

/**
 * Get transaction history for an account (most recent first).
 */
export function getAccountTransactions(accountId: string): BookTransaction[] {
  return loadTransactions()
    .filter((t) => t.accountId === accountId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/**
 * Get all transactions across all accounts (most recent first).
 */
export function getAllTransactions(): BookTransaction[] {
  return loadTransactions().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

/**
 * Calculate portfolio summary across all accounts.
 */
export function getPortfolioSummary(accounts?: BookAccount[]): PortfolioSummary {
  const accts = accounts ?? getAccounts()

  const totalBalance = accts.reduce((sum, a) => sum + a.balance, 0)
  const totalDeposited = accts.reduce((sum, a) => sum + a.totalDeposited, 0)
  const totalWithdrawn = accts.reduce((sum, a) => sum + a.totalWithdrawn, 0)
  const netInvestment = totalDeposited - totalWithdrawn
  const profitLoss = totalBalance + totalWithdrawn - totalDeposited
  const roi = netInvestment > 0 ? (profitLoss / netInvestment) * 100 : 0

  const allocations = accts
    .filter((a) => a.balance > 0)
    .map((a) => ({
      bookmaker: a.bookmaker,
      balance: a.balance,
      percentage: totalBalance > 0 ? (a.balance / totalBalance) * 100 : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage)

  return {
    totalBalance,
    totalDeposited,
    totalWithdrawn,
    netInvestment,
    profitLoss,
    roi,
    accountCount: accts.length,
    allocations,
  }
}

/**
 * Take a snapshot of current balances (for historical tracking).
 */
export function takeSnapshot(): BookBalanceSnapshot {
  const accounts = getAccounts()
  const snapshot: BookBalanceSnapshot = {
    date: new Date().toISOString().split('T')[0],
    totalBalance: accounts.reduce((sum, a) => sum + a.balance, 0),
    accounts: accounts.map((a) => ({ bookmaker: a.bookmaker, balance: a.balance })),
  }

  const snapshots = loadSnapshots()
  // Replace if same date already exists
  const existingIdx = snapshots.findIndex((s) => s.date === snapshot.date)
  if (existingIdx >= 0) {
    snapshots[existingIdx] = snapshot
  } else {
    snapshots.push(snapshot)
  }
  saveSnapshots(snapshots)
  return snapshot
}

/**
 * Get balance history snapshots.
 */
export function getBalanceHistory(): BookBalanceSnapshot[] {
  return loadSnapshots().sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Find the account with the highest balance.
 */
export function getLargestAccount(accounts?: BookAccount[]): BookAccount | null {
  const accts = accounts ?? getAccounts()
  if (accts.length === 0) return null
  return accts.reduce((best, a) => (a.balance > best.balance ? a : best))
}

/**
 * Find accounts with negative balance (overdrawn).
 */
export function getOverdrawnAccounts(accounts?: BookAccount[]): BookAccount[] {
  const accts = accounts ?? getAccounts()
  return accts.filter((a) => a.balance < 0)
}

/**
 * Calculate profit/loss per book: balance + withdrawn - deposited.
 */
export function getBookProfitLoss(
  accounts?: BookAccount[]
): { bookmaker: string; profitLoss: number; roi: number }[] {
  const accts = accounts ?? getAccounts()
  return accts
    .map((a) => {
      const pl = a.balance + a.totalWithdrawn - a.totalDeposited
      const invested = a.totalDeposited - a.totalWithdrawn
      return {
        bookmaker: a.bookmaker,
        profitLoss: pl,
        roi: invested > 0 ? (pl / invested) * 100 : 0,
      }
    })
    .sort((a, b) => b.profitLoss - a.profitLoss)
}
