import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TransactionReceipt } from './TransactionReceipt';
import { useReceiptDownload } from '@/hooks/useReceiptDownload';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  reference: string | null;
  status: string;
  mode: string;
  created_at: string;
}

interface TransactionReceiptModalProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TransactionReceiptModal = ({
  transaction,
  open,
  onOpenChange,
}: TransactionReceiptModalProps) => {
  const { receiptRef, downloadReceipt } = useReceiptDownload();
  const { platformName } = usePlatformSettings();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!transaction) return;
    
    setDownloading(true);
    try {
      const filename = `${platformName.toLowerCase()}-receipt-${transaction.id.slice(0, 8)}`;
      await downloadReceipt(filename);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Receipt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Receipt Preview */}
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-auto max-h-[400px] flex justify-center bg-muted/50 p-4">
              <div className="transform scale-75 origin-top">
                <TransactionReceipt 
                  ref={receiptRef} 
                  transaction={transaction} 
                  platformName={platformName}
                />
              </div>
            </div>
          </div>

          {/* Download Button */}
          <Button 
            onClick={handleDownload} 
            disabled={downloading}
            className="w-full"
            size="lg"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download Receipt
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
