
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScanLine, QrCode, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"
import Link from 'next/link';

export default function NewTransactionDialog() {
    const [step, setStep] = useState<'scan' | 'form'>('scan');
    const [open, setOpen] = useState(false);
    const { toast } = useToast()

    const handleScan = () => {
        // This is now handled by the main transactions page camera scanner
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Handle form submission logic
        toast({
            title: "Transaksi Tercatat",
            description: "Transaksi telah berhasil disimpan.",
        })
        setOpen(false);
        setTimeout(() => setStep('scan'), 500); // Reset after closing
    };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button asChild>
            <Link href="/transactions">
                <QrCode className="mr-2 h-4 w-4" />
                Pindai QR
            </Link>
        </Button>
      </DialogTrigger>
    </Dialog>
  );
}
