import { useState, useEffect } from 'react';
import { Search, ExternalLink, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../api';

export default function Orders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null); // { id, newStatus }
    const [rejectReason, setRejectReason] = useState('Color scheme is incorrect');
    const [replacementFiles, setReplacementFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);

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

    const fileToBase64 = (f) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(f);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    const triggerAction = (orderId, status) => {
        setConfirmAction({ id: orderId, newStatus: status });
        setRejectReason('Color scheme is incorrect'); // Reset default
        setReplacementFiles([]);
        setUploadProgress(0);
    };

    const confirmAndExecute = async () => {
        if (!confirmAction) return;
        const { id, newStatus } = confirmAction;

        setActionLoading(id);
        try {
            const res = await apiCall('updateOrderStatus', { orderId: id, status: newStatus });
            if (res.success) {
                setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
            }
        } catch (err) {
            console.error("Failed to update status", err);
        } finally {
            setActionLoading(null);
            setConfirmAction(null);
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
                                                            <button onClick={() => triggerAction(order.id, 'Approved')} className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded shadow-sm text-xs font-bold transition-colors">
                                                                Approve
                                                            </button>
                                                            <button onClick={() => triggerAction(order.id, 'Changes Requested')} className="text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded shadow-sm text-xs font-bold transition-colors">
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

            {confirmAction && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm px-4">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col max-w-sm w-full border-t-4 border-blue-600">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Are you sure?</h3>
                        <p className="text-gray-600 mb-4 flex-wrap">
                            You are about to <strong className={`font-bold uppercase ${confirmAction.newStatus === 'Approved' ? 'text-green-600' : 'text-red-600'}`}>{confirmAction.newStatus === 'Approved' ? 'APPROVE' : 'REJECT'}</strong> the final design.
                            {confirmAction.newStatus === 'Approved' ? ' This signifies the design is absolutely finalized.' : ' Please select the reason for rejection below.'}
                        </p>

                        {confirmAction.newStatus === 'Changes Requested' && (
                            <div className="mb-6 space-y-4 pt-4 border-t border-gray-100">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Reason for Changes</label>
                                    <select value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 py-2 bg-gray-50">
                                        <option>Color scheme is incorrect</option>
                                        <option>Spelling or Detail Error</option>
                                        <option>Not what I envisioned</option>
                                        <option>I want to change the raw images</option>
                                    </select>
                                </div>

                                {rejectReason === 'I want to change the raw images' && (
                                    <div className="bg-orange-50 p-3 rounded border border-orange-200">
                                        <label className="block text-xs font-bold text-orange-800 mb-2">Select Replacement Images</label>
                                        <p className="text-xs text-orange-600 mb-3">This will permanently overwrite the previous photos attached to this order.</p>
                                        <input type="file" multiple accept="image/*" onChange={(e) => setReplacementFiles(Array.from(e.target.files))} className="block w-full text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-orange-600 file:text-white hover:file:bg-orange-700 cursor-pointer" />
                                        {replacementFiles.length > 0 && <span className="text-xs font-bold text-orange-700 block mt-2">{replacementFiles.length} replacement files selected</span>}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex space-x-3 w-full">
                            <button onClick={() => setConfirmAction(null)} className="flex-1 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-bold transition-colors">Cancel</button>
                            <button onClick={confirmAndExecute} disabled={!!actionLoading} className={`flex-1 flex justify-center items-center py-2 text-white rounded-lg font-bold transition-colors ${actionLoading ? 'opacity-50' : ''} ${confirmAction.newStatus === 'Approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                {actionLoading ? (uploadProgress > 0 ? `Uploading (${uploadProgress}%)` : 'Saving...') : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
