import { useState, useEffect } from 'react';
import { DollarSign, ArrowUpRight, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../api';

export default function Earnings() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalEarnings: "₹0",
        pendingPayout: "₹0",
        paidEarnings: "₹0"
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                const data = await apiCall('getDashboardStats', { crafterId: user.referral_id });
                setStats(data);
            } catch (err) {
                console.error("Failed to load stats", err);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, [user]);

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Earnings & Payouts</h1>
                    <p className="mt-1 text-sm text-gray-500">Track your commissions and payment history.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center space-x-4">
                    <div className="p-3 bg-indigo-100 rounded-xl">
                        <DollarSign size={24} className="text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Earnings</p>
                        <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.totalEarnings}</p>
                    </div>
                </div>

                <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-100 p-6 flex items-center space-x-4">
                    <div className="p-3 bg-orange-100 rounded-xl">
                        <Clock size={24} className="text-orange-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pending Payout</p>
                        <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.pendingPayout}</p>
                    </div>
                </div>

                <div className="bg-green-50 rounded-xl shadow-sm border border-green-100 p-6 flex items-center space-x-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                        <CheckCircle2 size={24} className="text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Paid Amount</p>
                        <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.paidEarnings}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-8">
                <div className="px-6 py-5 border-b border-gray-100 sm:flex sm:items-center sm:justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Payout History</h3>
                    <span className="mt-3 sm:mt-0 text-[13px] inline-flex items-center text-gray-500 font-medium italic bg-gray-50 px-3 py-1.5 rounded border border-gray-100">
                        Payouts process automatically every weekend
                    </span>
                </div>

                {stats.history && stats.history.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Payout Reference</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Amount Transferred</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stats.history.map((payout, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                                            {typeof payout.date === 'string' && payout.date.includes('T') ? new Date(payout.date).toLocaleDateString() : payout.date}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{payout.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-green-600 text-right">₹{payout.amount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-6 text-center text-sm text-gray-500 font-medium">
                        {loading ? 'Checking records...' : 'No payout history available yet.'}
                    </div>
                )}
            </div>
        </div>
    );
}
