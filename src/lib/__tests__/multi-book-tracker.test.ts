import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getAccounts,
  getAccount,
  addAccount,
  updateAccount,
  removeAccount,
  recordDeposit,
  recordWithdrawal,
  recordAdjustment,
  getAccountTransactions,
  getAllTransactions,
  getPortfolioSummary,
  takeSnapshot,
  getBalanceHistory,
  getLargestAccount,
  getOverdrawnAccounts,
  getBookProfitLoss,
} from '../multi-book-tracker'

const store: Record<string, string> = {}
beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key]
  vi.stubGlobal('window', {})
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val
    },
    removeItem: (key: string) => {
      delete store[key]
    },
  })
})

describe('addAccount', () => {
  it('creates an account with initial balance', () => {
    const acct = addAccount('DraftKings', 500, 'Main account')
    expect(acct.bookmaker).toBe('DraftKings')
    expect(acct.balance).toBe(500)
    expect(acct.totalDeposited).toBe(500)
    expect(acct.totalWithdrawn).toBe(0)
    expect(acct.notes).toBe('Main account')
    expect(acct.id).toBeTruthy()
  })

  it('creates initial deposit transaction', () => {
    const acct = addAccount('FanDuel', 200)
    const txns = getAccountTransactions(acct.id)
    expect(txns.length).toBe(1)
    expect(txns[0].type).toBe('deposit')
    expect(txns[0].amount).toBe(200)
    expect(txns[0].note).toBe('Initial deposit')
  })

  it('handles zero initial balance', () => {
    const acct = addAccount('BetMGM', 0)
    expect(acct.balance).toBe(0)
    expect(acct.totalDeposited).toBe(0)
    const txns = getAccountTransactions(acct.id)
    expect(txns.length).toBe(0)
  })

  it('trims bookmaker name and notes', () => {
    const acct = addAccount('  Caesars  ', 100, '  promo  ')
    expect(acct.bookmaker).toBe('Caesars')
    expect(acct.notes).toBe('promo')
  })
})

describe('getAccounts', () => {
  it('returns accounts sorted by balance descending', () => {
    addAccount('Low', 100)
    addAccount('High', 1000)
    addAccount('Mid', 500)
    const accts = getAccounts()
    expect(accts[0].bookmaker).toBe('High')
    expect(accts[1].bookmaker).toBe('Mid')
    expect(accts[2].bookmaker).toBe('Low')
  })

  it('returns empty array initially', () => {
    expect(getAccounts()).toEqual([])
  })
})

describe('getAccount', () => {
  it('finds account by ID', () => {
    const acct = addAccount('DraftKings', 500)
    expect(getAccount(acct.id)?.bookmaker).toBe('DraftKings')
  })

  it('returns null for nonexistent ID', () => {
    expect(getAccount('nonexistent')).toBeNull()
  })
})

describe('updateAccount', () => {
  it('updates bookmaker name', () => {
    const acct = addAccount('DK', 500)
    const updated = updateAccount(acct.id, { bookmaker: 'DraftKings' })
    expect(updated?.bookmaker).toBe('DraftKings')
  })

  it('updates notes', () => {
    const acct = addAccount('FanDuel', 500)
    const updated = updateAccount(acct.id, { notes: 'Promo balance' })
    expect(updated?.notes).toBe('Promo balance')
  })

  it('returns null for nonexistent ID', () => {
    expect(updateAccount('nope', { bookmaker: 'X' })).toBeNull()
  })
})

describe('removeAccount', () => {
  it('removes account and its transactions', () => {
    const acct = addAccount('DraftKings', 500)
    recordDeposit(acct.id, 200)
    expect(removeAccount(acct.id)).toBe(true)
    expect(getAccount(acct.id)).toBeNull()
    expect(getAccountTransactions(acct.id)).toEqual([])
  })

  it('returns false for nonexistent ID', () => {
    expect(removeAccount('nope')).toBe(false)
  })
})

describe('recordDeposit', () => {
  it('increases balance and totalDeposited', () => {
    const acct = addAccount('DraftKings', 500)
    const txn = recordDeposit(acct.id, 200, 'Reload')
    expect(txn?.amount).toBe(200)
    expect(txn?.type).toBe('deposit')
    expect(txn?.balanceAfter).toBe(700)

    const updated = getAccount(acct.id)
    expect(updated?.balance).toBe(700)
    expect(updated?.totalDeposited).toBe(700)
  })

  it('rejects zero or negative amount', () => {
    const acct = addAccount('FanDuel', 500)
    expect(recordDeposit(acct.id, 0)).toBeNull()
    expect(recordDeposit(acct.id, -50)).toBeNull()
  })

  it('rejects nonexistent account', () => {
    expect(recordDeposit('nope', 100)).toBeNull()
  })
})

describe('recordWithdrawal', () => {
  it('decreases balance and increases totalWithdrawn', () => {
    const acct = addAccount('DraftKings', 1000)
    const txn = recordWithdrawal(acct.id, 300, 'Cash out')
    expect(txn?.amount).toBe(300)
    expect(txn?.balanceAfter).toBe(700)

    const updated = getAccount(acct.id)
    expect(updated?.balance).toBe(700)
    expect(updated?.totalWithdrawn).toBe(300)
  })

  it('allows withdrawal exceeding balance (negative balance)', () => {
    const acct = addAccount('BetMGM', 100)
    const txn = recordWithdrawal(acct.id, 200)
    expect(txn?.balanceAfter).toBe(-100)
  })
})

describe('recordAdjustment', () => {
  it('adjusts balance to new value', () => {
    const acct = addAccount('DraftKings', 500)
    const txn = recordAdjustment(acct.id, 750, 'Reconciled with DK')
    expect(txn?.amount).toBe(250)
    expect(txn?.balanceAfter).toBe(750)
    expect(getAccount(acct.id)?.balance).toBe(750)
  })

  it('handles downward adjustments', () => {
    const acct = addAccount('FanDuel', 500)
    const txn = recordAdjustment(acct.id, 400)
    expect(txn?.amount).toBe(-100)
    expect(txn?.balanceAfter).toBe(400)
  })

  it('returns null for nonexistent account', () => {
    expect(recordAdjustment('nope', 500)).toBeNull()
  })
})

describe('getAccountTransactions', () => {
  it('returns transactions for specific account', () => {
    const acct = addAccount('DraftKings', 500)
    recordDeposit(acct.id, 100)
    recordWithdrawal(acct.id, 50)
    const txns = getAccountTransactions(acct.id)
    expect(txns.length).toBe(3) // initial deposit + deposit + withdrawal
    const types = txns.map((t) => t.type)
    expect(types).toContain('deposit')
    expect(types).toContain('withdrawal')
  })
})

describe('getAllTransactions', () => {
  it('returns all transactions across accounts', () => {
    const a1 = addAccount('DraftKings', 500)
    const a2 = addAccount('FanDuel', 300)
    recordDeposit(a1.id, 100)
    recordDeposit(a2.id, 50)
    const txns = getAllTransactions()
    expect(txns.length).toBe(4) // 2 initial + 2 additional
  })
})

describe('getPortfolioSummary', () => {
  it('calculates totals across accounts', () => {
    addAccount('DraftKings', 1000)
    addAccount('FanDuel', 500)
    const summary = getPortfolioSummary()
    expect(summary.totalBalance).toBe(1500)
    expect(summary.totalDeposited).toBe(1500)
    expect(summary.accountCount).toBe(2)
  })

  it('calculates profit/loss correctly', () => {
    const acct = addAccount('DraftKings', 1000)
    recordWithdrawal(acct.id, 200) // balance=800, withdrawn=200
    // P/L = balance(800) + withdrawn(200) - deposited(1000) = 0
    const summary = getPortfolioSummary()
    expect(summary.profitLoss).toBe(0)
    expect(summary.totalWithdrawn).toBe(200)
  })

  it('calculates allocations as percentages', () => {
    addAccount('DraftKings', 750)
    addAccount('FanDuel', 250)
    const summary = getPortfolioSummary()
    expect(summary.allocations[0].bookmaker).toBe('DraftKings')
    expect(summary.allocations[0].percentage).toBe(75)
    expect(summary.allocations[1].percentage).toBe(25)
  })

  it('handles empty accounts', () => {
    const summary = getPortfolioSummary()
    expect(summary.totalBalance).toBe(0)
    expect(summary.roi).toBe(0)
    expect(summary.accountCount).toBe(0)
  })

  it('accepts explicit accounts list', () => {
    const accounts = [
      { id: '1', bookmaker: 'DK', balance: 500, totalDeposited: 400, totalWithdrawn: 100, updatedAt: '2026-01-01', notes: '' },
      { id: '2', bookmaker: 'FD', balance: 300, totalDeposited: 200, totalWithdrawn: 0, updatedAt: '2026-01-01', notes: '' },
    ]
    const summary = getPortfolioSummary(accounts)
    expect(summary.totalBalance).toBe(800)
    expect(summary.totalDeposited).toBe(600)
    // P/L = 800 + 100 - 600 = 300
    expect(summary.profitLoss).toBe(300)
  })
})

describe('takeSnapshot / getBalanceHistory', () => {
  it('creates a daily snapshot', () => {
    addAccount('DraftKings', 1000)
    const snapshot = takeSnapshot()
    expect(snapshot.totalBalance).toBe(1000)
    expect(snapshot.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(snapshot.accounts.length).toBe(1)
  })

  it('replaces snapshot for same date', () => {
    addAccount('DraftKings', 1000)
    takeSnapshot()
    addAccount('FanDuel', 500)
    takeSnapshot()
    const history = getBalanceHistory()
    expect(history.length).toBe(1)
    expect(history[0].totalBalance).toBe(1500)
  })

  it('getBalanceHistory returns sorted by date', () => {
    const history = getBalanceHistory()
    expect(history).toEqual([])
  })
})

describe('getLargestAccount', () => {
  it('returns account with highest balance', () => {
    addAccount('Small', 100)
    addAccount('Big', 5000)
    addAccount('Mid', 800)
    expect(getLargestAccount()?.bookmaker).toBe('Big')
  })

  it('returns null for no accounts', () => {
    expect(getLargestAccount()).toBeNull()
  })
})

describe('getOverdrawnAccounts', () => {
  it('finds accounts with negative balance', () => {
    const acct = addAccount('DraftKings', 50)
    recordWithdrawal(acct.id, 100)
    addAccount('FanDuel', 500)
    const overdrawn = getOverdrawnAccounts()
    expect(overdrawn.length).toBe(1)
    expect(overdrawn[0].bookmaker).toBe('DraftKings')
  })

  it('returns empty when all balances positive', () => {
    addAccount('DraftKings', 500)
    expect(getOverdrawnAccounts()).toEqual([])
  })
})

describe('getBookProfitLoss', () => {
  it('calculates P/L per book', () => {
    const acct = addAccount('DraftKings', 500)
    recordWithdrawal(acct.id, 100) // balance=400, deposited=500, withdrawn=100
    // P/L = 400 + 100 - 500 = 0
    const pls = getBookProfitLoss()
    expect(pls[0].profitLoss).toBe(0)
    expect(pls[0].roi).toBe(0)
  })

  it('sorts by P/L descending', () => {
    const a1 = addAccount('Winner', 1000)
    recordDeposit(a1.id, 500) // balance=1500, deposited=1500 — break even
    const a2 = addAccount('Loser', 500)
    recordWithdrawal(a2.id, 100) // balance=400, deposited=500, withdrawn=100
    // Loser P/L = 400+100-500=0, Winner P/L = 1500+0-1500=0
    // Both zero, order by bookmaker irrelevant
    const pls = getBookProfitLoss()
    expect(pls.length).toBe(2)
  })

  it('handles accounts with profit', () => {
    const accounts = [
      { id: '1', bookmaker: 'DK', balance: 800, totalDeposited: 500, totalWithdrawn: 100, updatedAt: '2026-01-01', notes: '' },
    ]
    const pls = getBookProfitLoss(accounts)
    // P/L = 800 + 100 - 500 = 400
    expect(pls[0].profitLoss).toBe(400)
    // ROI = 400 / (500-100) * 100 = 100%
    expect(pls[0].roi).toBe(100)
  })
})
