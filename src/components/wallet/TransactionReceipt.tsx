import { forwardRef } from 'react';
import { format } from 'date-fns';

interface TransactionReceiptProps {
  transaction: {
    id: string;
    type: string;
    amount: number;
    description: string | null;
    reference: string | null;
    status: string;
    mode: string;
    created_at: string;
  };
  platformName?: string;
}

export const TransactionReceipt = forwardRef<HTMLDivElement, TransactionReceiptProps>(
  ({ transaction, platformName = 'FortunesHQ' }, ref) => {
    const formatMoney = (value: number) => {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(Math.abs(value));
    };

    const getTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        deposit: 'Deposit',
        withdrawal: 'Withdrawal',
        entry: 'Game Entry',
        win: 'Game Win',
        arena_entry: 'Arena Entry',
        arena_win: 'Arena Win',
        streak_entry: 'Streak Entry',
        streak_win: 'Streak Win',
        pool_entry: 'Pool Entry',
        pool_win: 'Pool Win',
        finger_entry: 'Finger Entry',
        finger_win: 'Finger Win',
        rank_reward: 'Rank Reward',
      };
      return labels[type] || type;
    };

    const isCredit = transaction.amount >= 0;

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 w-[400px] font-sans"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-gray-300 pb-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{platformName}</h1>
          <p className="text-sm text-gray-500 mt-1">Transaction Receipt</p>
        </div>

        {/* Transaction Status */}
        <div className="text-center mb-6">
          <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
            transaction.status === 'completed' 
              ? 'bg-green-100 text-green-700' 
              : transaction.status === 'failed'
              ? 'bg-red-100 text-red-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {transaction.status === 'completed' ? '✓ Completed' : 
             transaction.status === 'failed' ? '✗ Failed' : '⏳ Pending'}
          </div>
        </div>

        {/* Amount */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 mb-1">Amount</p>
          <p className={`text-4xl font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
            {isCredit ? '+' : '-'}{formatMoney(transaction.amount)}
          </p>
        </div>

        {/* Transaction Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">Type</span>
            <span className="font-medium">{getTypeLabel(transaction.type)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Description</span>
            <span className="font-medium text-right max-w-[200px]">
              {transaction.description || getTypeLabel(transaction.type)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Date</span>
            <span className="font-medium">
              {format(new Date(transaction.created_at), 'MMM d, yyyy')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Time</span>
            <span className="font-medium">
              {format(new Date(transaction.created_at), 'h:mm a')}
            </span>
          </div>
          {transaction.reference && (
            <div className="flex justify-between">
              <span className="text-gray-500">Reference</span>
              <span className="font-medium text-xs">{transaction.reference}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Transaction ID</span>
            <span className="font-medium text-xs">{transaction.id.slice(0, 8)}...</span>
          </div>
          {transaction.mode === 'test' && (
            <div className="flex justify-between">
              <span className="text-gray-500">Mode</span>
              <span className="font-medium text-yellow-600">TEST</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center border-t-2 border-dashed border-gray-300 pt-6">
          <p className="text-xs text-gray-400">
            Generated on {format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Thank you for using {platformName}
          </p>
        </div>
      </div>
    );
  }
);

TransactionReceipt.displayName = 'TransactionReceipt';
