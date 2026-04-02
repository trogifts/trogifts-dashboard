import { useState, useEffect } from 'react';
import { Search, Filter, UploadCloud, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import { apiCall } from '../../api';

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('All');
    const [inspectOrder, setInspectOrder] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);
    const [uploadingOrder, setUploadingOrder] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const statuses = ['All', 'Order Placed', 'Payment Verify', 'Waiting for Approval', 'Changes Requested', 'Approved', 'Printed', 'Shipped', 'Delivered'];

    useEffect(() => {
        fetchOrders();
    }, []);

    async function fetchOrders() {
        try {
            const data = await apiCall('getOrders', {});
            setOrders(data.orders || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const filteredOrders = statusFilter === 'All'
        ? orders
        : orders.filter(o => o.status === statusFilter);

    const updateStatus = async (id, newStatus) => {
        setActionLoading(true);
        // Optimistic update
        setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
        try {
            await apiCall('updateOrderStatus', { orderId: id, status: newStatus });
            setToastMessage(`Order ${id} successfully marked as ${newStatus}`);
            setTimeout(() => setToastMessage(null), 3500);
        } catch (err) {
            console.error("Failed to update status", err);
            setToastMessage(`Failed to update ${id}! Check network.`);
            setTimeout(() => setToastMessage(null), 4000);
        } finally {
            setActionLoading(false);
        }
    };

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    const handleDesignUpload = async (e, orderId) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingOrder(orderId);
        setActionLoading(true);
        try {
            const base64 = await fileToBase64(file);
            const res = await apiCall('uploadDesign', {
                orderId: orderId,
                fileName: file.name,
                mimeType: file.type,
                fileBase64: base64
            });

            if (res.success) {
                setToastMessage(`Design successfully securely attached to ${orderId}`);
                setTimeout(() => setToastMessage(null), 4000);
                setOrders(orders.map(o => o.id === orderId ? { ...o, designUrl: res.url, status: res.status || 'Waiting for Approval' } : o));
            } else {
                throw new Error(res.error || "API reported failure");
            }
        } catch (err) {
            console.error(err);
            setToastMessage(`Failed to upload design for ${orderId}`);
            setTimeout(() => setToastMessage(null), 4000);
        } finally {
            // Reset input so they can re-upload if needed
            e.target.value = null;
            setUploadingOrder(null);
            setActionLoading(false);
        }
    };

    const parsePhotos = (photoStr) => {
        if (!photoStr || photoStr === 'No Photo') return [];
        const lines = photoStr.split('\n').filter(l => l.trim() !== '');
        const groups = [];
        let currentGroup = { title: 'General', urls: [] };

        for (const line of lines) {
            if (line.startsWith('---') && line.endsWith('---')) {
                if (currentGroup.urls.length > 0) {
                    groups.push(currentGroup);
                }
                currentGroup = { title: line.replace(/---/g, '').trim(), urls: [] };
            } else if (line.startsWith('http')) {
                currentGroup.urls.push(line.trim());
            }
        }
        if (currentGroup.urls.length > 0) {
            groups.push(currentGroup);
        }
        return groups;
    };

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage Orders</h1>
                    <p className="mt-1 text-sm text-gray-500">View, update, and manage all crafter orders.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:max-w-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search orders..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <Filter size={18} className="text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="block w-full sm:w-auto py-2 px-3 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crafter / Comm.</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Files (Photos/Pay)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-4">Loading...</td></tr>
                            ) : filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <span className="font-semibold">{order.id}</span>
                                        <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
                                            <p>{order.deliveryMethod}</p>
                                            <p>Qty: {order.quantity || 1} • Price: ₹{order.price || 0}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className="block font-medium">{order.crafterId}</span>
                                        <span className="block text-xs text-blue-600 font-semibold mt-0.5">Comm: ₹{order.commission || 0}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            value={order.status}
                                            onChange={(e) => updateStatus(order.id, e.target.value)}
                                            className={`text-sm border-gray-300 rounded-md focus:ring-blue-500 py-1.5 focus:border-blue-500 ${order.status === 'Waiting for Approval' ? 'bg-orange-50 text-orange-800 border-orange-200 font-bold' : order.status === 'Approved' ? 'bg-green-50 text-green-800 border-green-200 font-bold' : ''}`}
                                        >
                                            {statuses.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>

                                        {order.crafterPhone && (
                                            <a href={`https://wa.me/${order.crafterPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hello, regards to TroGifts Order: ' + order.id)}`} target="_blank" rel="noreferrer" className="mt-2 flex items-center text-xs text-green-600 hover:text-green-800 font-bold transition-colors">
                                                <MessageCircle size={14} className="mr-1" /> WhatsApp Crafter
                                            </a>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center space-y-2">
                                        {order.photoUrl && order.photoUrl !== 'No Photo' ? (
                                            <button onClick={() => setInspectOrder(order)} className="text-blue-600 hover:text-blue-800 hover:underline text-xs block font-bold w-full bg-blue-50 py-1.5 px-2 rounded-md transition-colors">Inspect Items</button>
                                        ) : (<span className="text-gray-400 text-xs block">No Photos</span>)}

                                        {order.paymentUrl ? (
                                            <a href={order.paymentUrl} target="_blank" rel="noreferrer" className="text-green-600 hover:text-green-800 hover:underline text-xs block font-bold w-full bg-green-50 py-1.5 px-2 rounded-md transition-colors">View Payment</a>
                                        ) : (<span className="text-gray-400 text-xs block">No Payment</span>)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {uploadingOrder === order.id ? (
                                            <span className="text-gray-500 mx-2 flex items-center justify-end w-full space-x-1 animate-pulse font-bold bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                                                <span>Uploading...</span>
                                            </span>
                                        ) : order.designUrl ? (
                                            <a href={order.designUrl} target="_blank" rel="noreferrer" className="text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 px-3 py-1.5 rounded-lg mx-2 flex items-center justify-end w-full space-x-1 font-bold transition-colors">
                                                <CheckCircle size={16} />
                                                <span>Design Ready</span>
                                            </a>
                                        ) : (
                                            <label className="text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-lg mx-2 flex items-center justify-end w-full space-x-1 cursor-pointer font-bold transition-colors">
                                                <UploadCloud size={16} />
                                                <span>Upload Design</span>
                                                <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleDesignUpload(e, order.id)} />
                                            </label>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {inspectOrder && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Order Breakdown: {inspectOrder.id}</h2>
                            <button onClick={() => setInspectOrder(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
                                <h3 className="font-bold text-orange-800 text-xs uppercase tracking-wider mb-2">Manifest Details</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-orange-900 mb-3">
                                    <div>
                                        <span className="font-bold block mb-1">Customer Names:</span>
                                        <span className="whitespace-pre-wrap block leading-relaxed">{inspectOrder.customerName}</span>
                                    </div>
                                    <div>
                                        <span className="font-bold block mb-1">Chosen Templates:</span>
                                        <span className="whitespace-pre-wrap block leading-relaxed">{inspectOrder.template}</span>
                                    </div>
                                </div>
                                <div className="text-sm text-orange-900 border-t border-orange-200/60 pt-3">
                                    <span className="font-bold block mb-1">Shipping Address Location(s):</span>
                                    <span className="whitespace-pre-wrap block leading-relaxed">{inspectOrder.address || 'No address specified'}</span>
                                </div>
                            </div>
                            {parsePhotos(inspectOrder.photoUrl).map((group, idx) => (
                                <div key={idx} className="space-y-3">
                                    <h3 className="font-bold text-gray-800 bg-gray-50 p-2 rounded-lg border border-gray-200">{group.title}</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {group.urls.map((url, uidx) => (
                                            <a key={uidx} href={url} target="_blank" rel="noreferrer" className="block text-center p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                                                <div className="text-blue-600 font-bold text-sm">
                                                    {group.title !== 'General'
                                                        ? `${group.title.split('(')[0].trim()} Photo ${uidx + 1}`
                                                        : `Photo ${uidx + 1} (Unsorted)`}
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {parsePhotos(inspectOrder.photoUrl).length === 0 && (
                                <p className="text-gray-500 text-center py-8">No specific photos found.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {toastMessage && (
                <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl z-[100] flex items-center space-x-3 border border-gray-700 animate-bounce">
                    {toastMessage.startsWith('Failed') ? (
                        <XCircle size={20} className="text-red-400" />
                    ) : (
                        <CheckCircle size={20} className="text-green-400" />
                    )}
                    <span className="font-medium text-sm">{toastMessage}</span>
                </div>
            )}
        </div>
    );
}
