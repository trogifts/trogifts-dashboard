import { useState, useEffect } from 'react';
import { Search, Filter, UploadCloud, CheckCircle, XCircle, MessageCircle, Download, ExternalLink } from 'lucide-react';
import { apiCall } from '../../api';

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('All');
    const [inspectOrder, setInspectOrder] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);
    const [uploadingOrder, setUploadingOrder] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

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
        : orders.filter(o => {
            if (statusFilter === 'Changes Requested') return o.status.startsWith('Changes Requested');
            return o.status === statusFilter;
        });

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

    const handleDesignUpload = async (e, orderId, photoTitle = null) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingOrder(photoTitle ? `${orderId}-${photoTitle}` : orderId);
        setActionLoading(true);
        setUploadProgress(0);
        try {
            const base64 = await fileToBase64(file);
            let currentDesignUrl = (inspectOrder && inspectOrder.id === orderId) ? inspectOrder.designUrl : orders.find(o => o.id === orderId)?.designUrl || "";

            if (currentDesignUrl && photoTitle) {
                const lines = currentDesignUrl.split('\n');
                const newLines = [];
                let skip = false;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].trim() === `--- ${photoTitle} ---`) {
                        skip = true;
                        continue;
                    }
                    if (skip && lines[i].trim().startsWith('http')) {
                        skip = false;
                        continue; // skip the old url
                    }
                    if (skip && lines[i].trim().startsWith('---')) {
                        skip = false;
                    }
                    if (!skip) {
                        newLines.push(lines[i]);
                    }
                }
                currentDesignUrl = newLines.join('\n').trim();
            }

            const res = await apiCall('uploadDesign', {
                orderId: orderId,
                fileName: file.name,
                mimeType: file.type,
                fileBase64: base64,
                photoTitle: photoTitle,
                existingDesignUrl: currentDesignUrl
            }, (p) => setUploadProgress(p));

            if (res.success) {
                setToastMessage(`Design successfully securely attached to ${orderId}`);
                setTimeout(() => setToastMessage(null), 4000);
                
                // If backend still returns a single url (legacy), we append it locally, 
                // else if it returns the full new string (updated backend), we use it.
                // We'll trust what backend gives us, but for frontend consistency if backend is old:
                const returnedUrl = res.url || res.finalUrl || '';
                
                setOrders(orders.map(o => o.id === orderId ? { ...o, designUrl: returnedUrl, status: res.status || 'Waiting for Approval' } : o));
                if (inspectOrder && inspectOrder.id === orderId) {
                    setInspectOrder({...inspectOrder, designUrl: returnedUrl, status: res.status || 'Waiting for Approval'});
                }
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

    const parseDesigns = (designStr) => {
        if (!designStr) return [];
        const lines = designStr.split('\n').filter(l => l.trim() !== '');
        const designs = [];
        let currentTitle = "Design";
        
        for (const line of lines) {
            if (line.startsWith('---') && line.endsWith('---')) {
                currentTitle = line.replace(/---/g, '').trim();
            } else if (line.startsWith('http')) {
                designs.push({ title: currentTitle, url: line.trim() });
                currentTitle = `Design ${designs.length + 1}`;
            }
        }
        if (designs.length === 0) {
            lines.forEach((l, i) => {
                if (l.startsWith('http')) designs.push({ title: `Design ${i + 1}`, url: l.trim() });
            });
        }
        return designs.length > 0 ? designs : [{ title: 'Design', url: designStr }];
    };

    const stats = {
        total: orders.length,
        placed: orders.filter(o => o.status === 'Order Placed').length,
        changesReq: orders.filter(o => o.status && o.status.startsWith('Changes Requested')).length,
        approved: orders.filter(o => o.status === 'Approved').length,
        delivered: orders.filter(o => o.status === 'Delivered').length,
        waiting: orders.filter(o => o.status === 'Waiting for Approval').length,
    };

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage Orders</h1>
                    <p className="mt-1 text-sm text-gray-500">View, update, and manage all crafter orders.</p>
                </div>
            </div>

            {/* Status Statistics Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="bg-white p-3 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-2xl font-bold text-gray-800">{stats.total}</span>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total</span>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-blue-600">{stats.placed}</span>
                    <span className="text-[11px] text-blue-800 font-bold uppercase tracking-wider">Order Placed</span>
                </div>
                <div className="bg-red-50 p-3 rounded-xl border border-red-200 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-red-600">{stats.changesReq}</span>
                    <span className="text-[11px] text-red-800 font-bold uppercase tracking-wider">Changes Req</span>
                </div>
                <div className="bg-green-50 p-3 rounded-xl border border-green-200 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-green-600">{stats.approved}</span>
                    <span className="text-[11px] text-green-800 font-bold uppercase tracking-wider">Approved</span>
                </div>
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-purple-600">{stats.delivered}</span>
                    <span className="text-[11px] text-purple-800 font-bold uppercase tracking-wider">Delivered</span>
                </div>
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-200 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-orange-600">{stats.waiting}</span>
                    <span className="text-[11px] text-orange-800 font-bold uppercase tracking-wider">Waiting</span>
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
                            ) : (
                                <>
                                    {filteredOrders.filter(o => o.status !== 'Delivered').map((order) => (
                                        <tr key={order.id} className={`${order.status && order.status.startsWith('Changes Requested') ? 'bg-red-100 hover:bg-red-200' : 'bg-white hover:bg-gray-50'}`}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-bold">{order.id}</span>
                                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500">{order.date}</span>
                                                </div>
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
                                            value={order.status && order.status.startsWith('Changes Requested') ? 'Changes Requested' : order.status}
                                            onChange={(e) => updateStatus(order.id, e.target.value)}
                                            className={`text-sm border-gray-300 rounded-md focus:ring-blue-500 py-1.5 focus:border-blue-500 ${order.status === 'Waiting for Approval' ? 'bg-orange-50 text-orange-800 border-orange-200 font-bold' : order.status === 'Approved' ? 'bg-green-50 text-green-800 border-green-200 font-bold' : order.status && order.status.startsWith('Changes Requested') ? 'bg-red-50 text-red-800 border-red-200 font-bold' : ''}`}
                                        >
                                            {statuses.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        
                                        {order.status && order.status.startsWith('Changes Requested -') && (
                                            <div className="mt-2 text-[10px] text-red-600 font-bold bg-red-50 px-2 py-1 rounded border border-red-100 flex flex-col whitespace-pre-wrap">
                                                <span className="uppercase tracking-wider text-[8px] text-red-400 mb-0.5">Crafter Note:</span>
                                                {order.status.replace('Changes Requested - ', '')}
                                            </div>
                                        )}

                                        {order.crafterPhone && (
                                            <a href={`https://wa.me/${String(order.crafterPhone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hello, regarding TroGifts Order ' + order.id + '. Current Status: ' + order.status)}`} target="_blank" rel="noreferrer" className="mt-2 flex items-center text-xs text-green-600 hover:text-green-800 font-bold transition-colors">
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
                                        {order.designUrl ? (
                                            <button onClick={() => setInspectOrder(order)} className="text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 px-3 py-1.5 rounded-lg mx-2 flex items-center justify-end w-full space-x-1 font-bold transition-colors">
                                                <CheckCircle size={16} />
                                                <span>Designs Ready</span>
                                            </button>
                                        ) : (
                                            <button onClick={() => setInspectOrder(order)} className="text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-lg mx-2 flex items-center justify-end w-full space-x-1 cursor-pointer font-bold transition-colors">
                                                <UploadCloud size={16} />
                                                <span>Upload Design</span>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}

                                    {filteredOrders.some(o => o.status === 'Delivered') && (
                                        <tr>
                                            <td colSpan="5" className="bg-gray-100/80 px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-widest border-y border-gray-200">
                                                Delivered Archive
                                            </td>
                                        </tr>
                                    )}

                                    {filteredOrders.filter(o => o.status === 'Delivered').map((order) => (
                                        <tr key={order.id} className="bg-green-100 hover:bg-green-200">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-bold">{order.id}</span>
                                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500">{order.date}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 space-y-0.5">
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
                                                    value={order.status && order.status.startsWith('Changes Requested') ? 'Changes Requested' : order.status}
                                                    onChange={(e) => updateStatus(order.id, e.target.value)}
                                                    className={`text-sm border-gray-300 rounded-md focus:ring-blue-500 py-1.5 focus:border-blue-500 ${order.status === 'Waiting for Approval' ? 'bg-orange-50 text-orange-800 border-orange-200 font-bold' : order.status === 'Approved' ? 'bg-green-50 text-green-800 border-green-200 font-bold' : order.status && order.status.startsWith('Changes Requested') ? 'bg-red-50 text-red-800 border-red-200 font-bold' : ''}`}
                                                >
                                                    {statuses.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                                
                                                {order.status && order.status.startsWith('Changes Requested -') && (
                                                    <div className="mt-2 text-[10px] text-red-600 font-bold bg-red-50 px-2 py-1 rounded border border-red-100 flex flex-col whitespace-pre-wrap">
                                                        <span className="uppercase tracking-wider text-[8px] text-red-400 mb-0.5">Crafter Note:</span>
                                                        {order.status.replace('Changes Requested - ', '')}
                                                    </div>
                                                )}

                                                {order.crafterPhone && (
                                                    <a href={`https://wa.me/${String(order.crafterPhone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hello, regarding TroGifts Order ' + order.id + '. Current Status: ' + order.status)}`} target="_blank" rel="noreferrer" className="mt-2 flex items-center text-xs text-green-600 hover:text-green-800 font-bold transition-colors">
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
                                                {order.designUrl ? (
                                                    <button onClick={() => setInspectOrder(order)} className="text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 px-3 py-1.5 rounded-lg mx-2 flex items-center justify-end w-full space-x-1 font-bold transition-colors">
                                                        <CheckCircle size={16} />
                                                        <span>Designs Ready</span>
                                                    </button>
                                                ) : (
                                                    <button onClick={() => setInspectOrder(order)} className="text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-lg mx-2 flex items-center justify-end w-full space-x-1 cursor-pointer font-bold transition-colors">
                                                        <UploadCloud size={16} />
                                                        <span>Upload Design</span>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </ >
                            )}
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
                                        {group.urls.map((url, uidx) => {
                                            // Ensure we always grab the pure native URL stripping any preview queries if accidentally present
                                            const rawUrl = url.split('?')[0];
                                            const downloadUrl = `${rawUrl}?ik-attachment=true`;

                                            const photoTitleStr = group.title !== 'General' ? `${group.title.split('(')[0].trim()} Photo ${uidx + 1}` : `Photo ${uidx + 1} (Unsorted)`;
                                            const isThisPhotoUploading = uploadingOrder === `${inspectOrder.id}-${photoTitleStr}`;
                                            const parsedDesigns = parseDesigns(inspectOrder.designUrl);
                                            let specificDesign = parsedDesigns.find(d => d.title === photoTitleStr);

                                            // Fallback for legacy designs that don't have header titles
                                            if (!specificDesign && parsedDesigns.length > 0 && parsedDesigns[0].title === 'Design 1' && idx === 0 && uidx === 0) {
                                                specificDesign = parsedDesigns[0];
                                            }

                                            return (
                                                <div key={uidx} className="flex flex-col border border-gray-200 rounded-lg overflow-hidden hover:border-gray-400 transition-colors shadow-sm group">
                                                    <a href={rawUrl} target="_blank" rel="noreferrer" className="block text-center p-3 bg-white border-b border-gray-100 flex-grow transition-colors hover:bg-gray-50 flex flex-col items-center justify-center">
                                                        <div className="text-gray-800 font-bold text-sm">
                                                            {photoTitleStr}
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">VIEW PREVIEW</span>
                                                    </a>
                                                    <div className={`grid ${specificDesign ? 'grid-cols-3' : 'grid-cols-2'} divide-x divide-gray-200 border-b border-gray-100 bg-gray-50`}>
                                                        <a href={downloadUrl} className="p-2.5 hover:bg-blue-50 text-blue-600 hover:text-blue-800 text-[10px] font-bold transition-colors flex flex-col items-center justify-center text-center">
                                                            <Download size={14} className="mb-0.5" />
                                                            <span>DOWNLOAD</span>
                                                        </a>
                                                        
                                                        {specificDesign && (
                                                            <a href={specificDesign.url} target="_blank" rel="noreferrer" className="p-2.5 hover:bg-purple-50 text-purple-600 hover:text-purple-800 text-[10px] font-bold transition-colors flex flex-col items-center justify-center text-center">
                                                                <ExternalLink size={14} className="mb-0.5" />
                                                                <span>VIEW</span>
                                                            </a>
                                                        )}
                                                        
                                                        {isThisPhotoUploading ? (
                                                            <div className="p-2.5 bg-gray-50 text-gray-500 text-[10px] font-bold flex flex-col items-center justify-center text-center w-full">
                                                                <span className="mb-1">Upldg...</span>
                                                                <div className="w-[80%] bg-gray-200 rounded-full h-1.5 opacity-80">
                                                                    <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <label className={`p-2.5 hover:bg-green-50 ${specificDesign ? 'text-gray-600 hover:text-gray-800' : 'text-green-600 hover:text-green-800'} text-[10px] font-bold transition-colors flex flex-col items-center justify-center text-center cursor-pointer`}>
                                                                <UploadCloud size={14} className="mb-0.5" />
                                                                <span>{specificDesign ? 'REPLACE' : 'UPLOAD'}</span>
                                                                <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleDesignUpload(e, inspectOrder.id, photoTitleStr)} />
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
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
