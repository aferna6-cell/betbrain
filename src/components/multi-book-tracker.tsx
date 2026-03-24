'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getAccounts,
  addAccount,
  removeAccount,
  recordDeposit,
  recordWithdrawal,
  recordAdjustment,
  getPortfolioSummary,
  getBookProfitLoss,
  getAccountTransactions,
  type BookAccount,
  type PortfolioSummary,
  type BookTransaction,
} from '@/lib/multi-book-tracker'

function formatCurrency(amount: number): string {
  return amount >= 0
    ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `-$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function AllocationBar({ allocations }: { allocations: PortfolioSummary['allocations'] }) {
  const colors = [
    'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500',
    'bg-pink-500', 'bg-cyan-500', 'bg-orange-500', 'bg-teal-500',
  ]
  if (allocations.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex h-4 rounded-full overflow-hidden bg-zinc-800">
        {allocations.map((a, i) => (
          <div
            key={a.bookmaker}
            className={`${colors[i % colors.length]} transition-all`}
            style={{ width: `${Math.max(a.percentage, 1)}%` }}
            title={`${a.bookmaker}: ${a.percentage.toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {allocations.map((a, i) => (
          <div key={a.bookmaker} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${colors[i % colors.length]}`} />
            <span className="text-zinc-400">{a.bookmaker}</span>
            <span className="text-zinc-500">{a.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TransactionList({ accountId }: { accountId: string }) {
  const [txns, setTxns] = useState<BookTransaction[]>([])
  useEffect(() => {
    setTxns(getAccountTransactions(accountId).slice(0, 10))
  }, [accountId])

  if (txns.length === 0) return <p className="text-sm text-zinc-500">No transactions yet.</p>

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {txns.map((t) => (
        <div key={t.id} className="flex items-center justify-between text-xs py-1 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className={
              t.type === 'deposit' ? 'text-emerald-400' :
              t.type === 'withdrawal' ? 'text-red-400' : 'text-amber-400'
            }>
              {t.type === 'deposit' ? '+' : t.type === 'withdrawal' ? '-' : '~'}
              {formatCurrency(Math.abs(t.amount))}
            </span>
            {t.note && <span className="text-zinc-500 truncate max-w-[150px]">{t.note}</span>}
          </div>
          <span className="text-zinc-600">{new Date(t.createdAt).toLocaleDateString()}</span>
        </div>
      ))}
    </div>
  )
}

export function MultiBookTracker() {
  const [accounts, setAccounts] = useState<BookAccount[]>([])
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newBook, setNewBook] = useState('')
  const [newBalance, setNewBalance] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [txType, setTxType] = useState<'deposit' | 'withdrawal' | 'adjustment'>('deposit')
  const [txAmount, setTxAmount] = useState('')
  const [txNote, setTxNote] = useState('')
  const [txAccountId, setTxAccountId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    const accts = getAccounts()
    setAccounts(accts)
    setSummary(getPortfolioSummary(accts))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleAdd = () => {
    const balance = parseFloat(newBalance) || 0
    if (!newBook.trim()) return
    addAccount(newBook, balance)
    setNewBook('')
    setNewBalance('')
    setShowAdd(false)
    refresh()
  }

  const handleRemove = (id: string) => {
    removeAccount(id)
    if (expandedId === id) setExpandedId(null)
    refresh()
  }

  const handleTransaction = () => {
    if (!txAccountId) return
    const amount = parseFloat(txAmount) || 0
    if (txType === 'deposit') {
      recordDeposit(txAccountId, amount, txNote)
    } else if (txType === 'withdrawal') {
      recordWithdrawal(txAccountId, amount, txNote)
    } else {
      recordAdjustment(txAccountId, amount, txNote)
    }
    setTxAmount('')
    setTxNote('')
    setTxAccountId(null)
    refresh()
  }

  const pls = getBookProfitLoss(accounts)

  if (accounts.length === 0 && !showAdd) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Multi-Book Tracker</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Track balances across your sportsbook accounts. See your total portfolio, allocation, and P/L per book.
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
        >
          Add First Account
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      {summary && accounts.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Balance</p>
              <p className="text-xl font-bold text-white">{formatCurrency(summary.totalBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Net Invested</p>
              <p className="text-xl font-bold text-zinc-300">{formatCurrency(summary.netInvestment)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Profit / Loss</p>
              <p className={`text-xl font-bold ${summary.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(summary.profitLoss)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">ROI</p>
              <p className={`text-xl font-bold ${summary.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {summary.roi.toFixed(1)}%
              </p>
            </div>
          </div>
          <AllocationBar allocations={summary.allocations} />
        </div>
      )}

      {/* Accounts List */}
      <div className="space-y-2">
        {accounts.map((acct) => {
          const pl = pls.find((p) => p.bookmaker === acct.bookmaker)
          return (
            <div key={acct.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                onClick={() => setExpandedId(expandedId === acct.id ? null : acct.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                    {acct.bookmaker.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{acct.bookmaker}</p>
                    {acct.notes && <p className="text-xs text-zinc-500">{acct.notes}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{formatCurrency(acct.balance)}</p>
                  {pl && (
                    <p className={`text-xs ${pl.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      P/L: {formatCurrency(pl.profitLoss)}
                    </p>
                  )}
                </div>
              </div>

              {expandedId === acct.id && (
                <div className="border-t border-zinc-800 p-4 space-y-4">
                  {/* Quick actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setTxAccountId(acct.id); setTxType('deposit') }}
                      className="px-3 py-1.5 text-xs bg-emerald-600/20 text-emerald-400 rounded hover:bg-emerald-600/30 transition-colors"
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => { setTxAccountId(acct.id); setTxType('withdrawal') }}
                      className="px-3 py-1.5 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors"
                    >
                      Withdraw
                    </button>
                    <button
                      onClick={() => { setTxAccountId(acct.id); setTxType('adjustment') }}
                      className="px-3 py-1.5 text-xs bg-amber-600/20 text-amber-400 rounded hover:bg-amber-600/30 transition-colors"
                    >
                      Adjust
                    </button>
                    <button
                      onClick={() => handleRemove(acct.id)}
                      className="px-3 py-1.5 text-xs bg-zinc-700 text-zinc-400 rounded hover:bg-zinc-600 transition-colors ml-auto"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Transaction form */}
                  {txAccountId === acct.id && (
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-zinc-500 mb-1 block">
                          {txType === 'adjustment' ? 'New Balance' : 'Amount'}
                        </label>
                        <input
                          type="number"
                          value={txAmount}
                          onChange={(e) => setTxAmount(e.target.value)}
                          placeholder={txType === 'adjustment' ? 'New balance...' : 'Amount...'}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-zinc-500 mb-1 block">Note</label>
                        <input
                          type="text"
                          value={txNote}
                          onChange={(e) => setTxNote(e.target.value)}
                          placeholder="Optional note..."
                          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white"
                        />
                      </div>
                      <button
                        onClick={handleTransaction}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setTxAccountId(null)}
                        className="px-3 py-1.5 bg-zinc-700 text-zinc-400 text-sm rounded hover:bg-zinc-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-zinc-500">Deposited:</span>{' '}
                      <span className="text-zinc-300">{formatCurrency(acct.totalDeposited)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Withdrawn:</span>{' '}
                      <span className="text-zinc-300">{formatCurrency(acct.totalWithdrawn)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Updated:</span>{' '}
                      <span className="text-zinc-300">{new Date(acct.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Transaction history */}
                  <div>
                    <p className="text-xs text-zinc-500 mb-2">Recent Transactions</p>
                    <TransactionList accountId={acct.id} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add account */}
      {showAdd ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium text-white">Add Sportsbook Account</h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={newBook}
              onChange={(e) => setNewBook(e.target.value)}
              placeholder="Sportsbook name..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white"
            />
            <input
              type="number"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              placeholder="Initial balance..."
              className="w-32 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white"
            />
            <button
              onClick={handleAdd}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 bg-zinc-700 text-zinc-400 text-sm rounded hover:bg-zinc-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-2 border border-dashed border-zinc-700 rounded-lg text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
        >
          + Add Sportsbook Account
        </button>
      )}
    </div>
  )
}
