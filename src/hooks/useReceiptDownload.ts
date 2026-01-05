import { useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';

export const useReceiptDownload = () => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const downloadReceipt = useCallback(async (filename: string = 'receipt') => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to download receipt:', error);
      throw error;
    }
  }, []);

  return { receiptRef, downloadReceipt };
};
