import { useState, useEffect } from 'react';
import { Package, HandCoins, Hourglass, CheckCircle2, PlusCircle, PackageSearch, DollarSign } from 'lucide-react';
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
        <div className="space-y-6 sm:space-y-8 pb-8">
            <div className="mb-2 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">Dashboard</h1>
                <p className="mt-1 text-sm sm:text-base text-gray-500">Welcome back, <span className="font-semibold text-gray-700">{user?.name}</span>. Here's what's happening.</p>
            </div>

            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className="relative bg-gradient-to-br from-white to-gray-50/50 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 transform hover:-translate-y-1 transition-all duration-300">
                        <div className={`p-3 rounded-2xl ${stat.bg} shadow-sm`}>
                            <stat.icon size={24} className={stat.color} />
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-0">{stat.label}</p>
                            <p className="text-xl sm:text-2xl font-bold text-gray-900">
                                {loading ? '...' : stat.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-2 sm:mt-4 pt-2">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 px-1">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <button
                        onClick={() => navigate('/dashboard/new-order')}
                        className="relative overflow-hidden flex flex-col items-center justify-center p-6 sm:p-8 bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 group w-full transform hover:-translate-y-1 transition-all duration-300"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10 p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 mb-3 sm:mb-4 shadow-sm group-hover:shadow-blue-200">
                            <PlusCircle size={32} />
                        </div>
                        <span className="relative z-10 text-base sm:text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Place Order</span>
                        <span className="relative z-10 text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 text-center">Start a new batch of items</span>
                    </button>

                    <button
                        onClick={() => navigate('/dashboard/orders')}
                        className="relative overflow-hidden flex flex-col items-center justify-center p-6 sm:p-8 bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 group w-full transform hover:-translate-y-1 transition-all duration-300"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10 p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 mb-3 sm:mb-4 shadow-sm group-hover:shadow-indigo-200">
                            <PackageSearch size={32} />
                        </div>
                        <span className="relative z-10 text-base sm:text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">My Orders</span>
                        <span className="relative z-10 text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 text-center">Track your current deliveries</span>
                    </button>

                    <button
                        onClick={() => navigate('/dashboard/earnings')}
                        className="relative overflow-hidden flex flex-col items-center justify-center p-6 sm:p-8 bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 group w-full transform hover:-translate-y-1 transition-all duration-300"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-green-50/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10 p-4 bg-green-50 text-green-600 rounded-2xl group-hover:bg-green-600 group-hover:text-white transition-colors duration-300 mb-3 sm:mb-4 shadow-sm group-hover:shadow-green-200">
                            <DollarSign size={32} />
                        </div>
                        <span className="relative z-10 text-base sm:text-lg font-bold text-gray-900 group-hover:text-green-700 transition-colors">Earnings</span>
                        <span className="relative z-10 text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 text-center">View your payouts & history</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
