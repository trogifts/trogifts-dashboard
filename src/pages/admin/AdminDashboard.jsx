import { useState, useEffect } from 'react';
import { Package, Users, HandCoins, AlertCircle } from 'lucide-react';
import { apiCall } from '../../api';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalEarnings: "$0.00",
        pendingPayout: "$0.00",
        paidEarnings: "$0.00"
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const data = await apiCall('getDashboardStats');
                setStats(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    const statCards = [
        { label: 'Total Orders', value: stats.totalOrders, icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Active Crafters', value: 'N/A', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
        { label: 'Pending Approvals', value: 'N/A', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100' },
        { label: 'Total Revenue', value: stats.totalEarnings, icon: HandCoins, color: 'text-green-600', bg: 'bg-green-100' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">System Overview</h1>
                <p className="mt-1 text-sm text-gray-500">Monitor overall activity and metrics across the platform.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center space-x-4">
                        <div className={`p-3 rounded-xl ${stat.bg}`}>
                            <stat.icon size={24} className={stat.color} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900">Recent API Activity</h3>
                    </div>
                    <div className="p-6 text-center text-gray-500 text-sm">
                        Everything is working smoothly!
                    </div>
                </div>
            </div>
        </div>
    );
}
