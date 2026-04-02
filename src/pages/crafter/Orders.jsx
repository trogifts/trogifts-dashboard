import { useState, useEffect } from 'react';
import { Search, ExternalLink, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../api';

export default function Orders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

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

    const handleAction = async (orderId, status) => {
        setActionLoading(orderId);
        try {
            const res = await apiCall('updateOrderStatus', { orderId, status });
            if (res.success) {
                setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
            }
        } catch (err) {
            console.error("Failed to update status", err);
        } finally {
            setActionLoading(null);
        }
    };

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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm flex space-x-2 items-center">
                                            {order.designUrl ? (
                                                <a href={order.designUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-900 flex items-center font-bold">
                                                    <ExternalLink size={16} className="mr-1" /> View Design
                                                </a>
                                            ) : (
                                                <span className="text-gray-400 italic">Not ready</span>
                                            )}

                                            {order.designUrl && order.status === 'Waiting for Approval' && (
                                                <div className="ml-4 flex items-center space-x-2 border-l border-gray-200 pl-4">
                                                    {actionLoading === order.id ? (
                                                        <span className="text-xs text-gray-500 animate-pulse font-bold">Updating...</span>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => handleAction(order.id, 'Approved')} className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded shadow-sm text-xs font-bold transition-colors">
                                                                Approve
                                                            </button>
                                                            <button onClick={() => handleAction(order.id, 'Changes Requested')} className="text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded shadow-sm text-xs font-bold transition-colors">
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
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
