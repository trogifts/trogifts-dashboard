import { useState, useEffect } from 'react';
import { Package, HandCoins, Hourglass, CheckCircle2, PlusCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../api';
import { useNavigate } from 'react-router-dom';

export default function DashboardHome() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalOrders: 0,
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

    const statCards = [
        { label: 'Total Orders', value: stats.totalOrders, icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Total Earnings', value: stats.totalEarnings, icon: HandCoins, color: 'text-indigo-600', bg: 'bg-indigo-100' },
        { label: 'Pending Payout', value: stats.pendingPayout, icon: Hourglass, color: 'text-orange-600', bg: 'bg-orange-100' },
        { label: 'Paid Earnings', value: stats.paidEarnings, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="mt-1 text-sm text-gray-500">Welcome back, {user?.name}. Here's what's happening.</p>
                </div>
                <button
                    onClick={() => navigate('/dashboard/new-order')}
                    className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    <PlusCircle className="-ml-1 mr-2 h-4 w-4" />
                    Place New Batch Order
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center space-x-4">
                        <div className={`p-3 rounded-xl ${stat.bg}`}>
                            <stat.icon size={24} className={stat.color} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {loading ? '...' : stat.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                </div>
                <div className="p-6 text-center text-gray-500 text-sm">
                    No recent activity to show.
                </div>
            </div>
        </div>
    );
}
