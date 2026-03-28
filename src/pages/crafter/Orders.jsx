import { useState, useEffect } from 'react';
import { Search, ExternalLink, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../api';

export default function Orders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchOrders() {
            try {
                const data = await apiCall('getOrders', { crafterId: user.referral_id });
                setOrders(data.orders || []);
            } catch (err) {
                console.error("Error loading orders:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchOrders();
    }, [user]);

    const StatusBadge = ({ status }) => {
        const styles = {
            'Order Placed': 'bg-blue-100 text-blue-800',
            'Waiting for Approval': 'bg-orange-100 text-orange-800',
            'Approved': 'bg-green-100 text-green-800',
            'Shipped': 'bg-purple-100 text-purple-800',
        };
        return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
                    <p className="mt-1 text-sm text-gray-500">Monitor tracking and approve final designs.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Design</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="4" className="text-center py-4">Loading...</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan="4" className="text-center py-4 text-gray-500">No orders found.</td></tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customerName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={order.status} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm flex space-x-2">
                                            {order.designUrl ? (
                                                <a href={order.designUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-900 flex items-center">
                                                    <ExternalLink size={16} className="mr-1" /> View Design
                                                </a>
                                            ) : (
                                                <span className="text-gray-400 italic">Not ready</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
