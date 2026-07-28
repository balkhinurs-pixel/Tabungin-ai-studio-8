
'use client';

import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Student } from '@/types';
import { parseISO, format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PrintReportButtonProps {
    student: Student;
}

const ActionButton = ({ icon: Icon, label, onClick }: { icon: React.ElementType, label: string, onClick?: () => void }) => {
    return (
        <Button 
            onClick={onClick} 
            variant="outline"
            className="w-full justify-center h-12 text-sm font-bold rounded-xl bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-all active:scale-95"
        >
            <Icon className="mr-2 h-4 w-4 text-gray-500" />
            {label}
        </Button>
    );
};

export default function PrintReportButton({ student }: PrintReportButtonProps) {
    const handlePrintReport = () => {
        if (!student) return;

        const doc = new jsPDF();
        
        const { income, expense, balance } = student.transactions.reduce(
            (acc, tx) => {
              if (tx.type === 'Pemasukan') {
                acc.income += tx.amount;
              } else {
                acc.expense += tx.amount;
              }
              acc.balance = acc.income - acc.expense;
              return acc;
            },
            { income: 0, expense: 0, balance: 0 }
        );

        doc.setFontSize(16);
        doc.text(`Laporan Tabungan Siswa`, 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.text(student.name, 105, 22, { align: 'center' });

        doc.setFontSize(10);
        doc.text(`NIS: ${student.nis}`, 14, 30);
        doc.text(`Kelas: ${student.class}`, 14, 35);
        
        autoTable(doc, {
            startY: 40,
            head: [['TANGGAL', 'JENIS', 'KETERANGAN', 'JUMLAH (RP)']],
            body: student.transactions.map(tx => [
                format(parseISO(tx.created_at!), 'dd/MM/yyyy'),
                tx.type,
                tx.description,
                { content: tx.amount.toLocaleString('id-ID'), styles: { halign: 'right' } }
            ]),
            foot: [
                [{ content: 'Total Pemasukan', colSpan: 3, styles: { fontStyle: 'bold' } }, { content: income.toLocaleString('id-ID'), styles: { halign: 'right', fontStyle: 'bold' } }],
                [{ content: 'Total Pengeluaran', colSpan: 3, styles: { fontStyle: 'bold' } }, { content: expense.toLocaleString('id-ID'), styles: { halign: 'right', fontStyle: 'bold' } }],
                [{ content: 'Saldo Akhir', colSpan: 3, styles: { fontStyle: 'bold' } }, { content: balance.toLocaleString('id-ID'), styles: { halign: 'right', fontStyle: 'bold' } }]
            ],
            headStyles: { fillColor: [29, 78, 133] },
            footStyles: { fillColor: [241, 245, 249] },
            theme: 'grid'
        });

        doc.save(`laporan-${student.nis}-${student.name}.pdf`);
    };

    return <ActionButton icon={FileText} label="Cetak Laporan PDF" onClick={handlePrintReport} />
}
