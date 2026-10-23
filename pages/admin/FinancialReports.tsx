
import React from 'react';
import { AdminFinancialReport } from '../../components/admin/AdminFinancialReport';
import { Button } from '../../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

interface AdminFinancialReportsProps {
    onNavigate: (page: string) => void;
}

export const AdminFinancialReports: React.FC<AdminFinancialReportsProps> = ({ onNavigate }) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('admin-dashboard')}
                    className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Financial Reports</h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Detailed breakdown of system liquidity.</p>
                </div>
            </div>

            <AdminFinancialReport />
        </div>
    );
};
