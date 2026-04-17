import { useState, useEffect } from 'react';
import { Search, ExternalLink, Filter, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../api';

export default function Orders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null); // { id, newStatus }
    const [rejectReason, setRejectReason] = useState('Color scheme is incorrect');
    const [rejectionSuccess, setRejectionSuccess] = useState(false);
    const [replacementFiles, setReplacementFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [inspectOrder, setInspectOrder] = useState(null);

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
        setRejectReason('I want to change the img');
        setRejectionSuccess(false);
    };

    const confirmAndExecute = async () => {
        if (!confirmAction) return;
        const { id, newStatus } = confirmAction;

        setActionLoading(id);
        try {
            const finalStatus = newStatus === 'Changes Requested' ? `Changes Requested - ${rejectReason}` : newStatus;
            const res = await apiCall('updateOrderStatus', { orderId: id, status: finalStatus });
            if (res.success) {
                setOrders(orders.map(o => o.id === id ? { ...o, status: finalStatus } : o));
                if (newStatus === 'Changes Requested') {
                    setRejectionSuccess(true);
                }
            }
        } catch (err) {
            console.error("Failed to update status", err);
        } finally {
            setActionLoading(null);
            if (newStatus !== 'Changes Requested') setConfirmAction(null);
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

    const parseDesigns = (designStr) => {
        if (!designStr) return [];
        const lines = designStr.split('\n').filter(l => l.trim() !== '');
        const designs = [];
        let currentTitle = "Design";
        
        for (const line of lines) {
            if (line.startsWith('---') && line.endsWith('---')) {
                currentTitle = line.replace(/---/g, '').trim();
            } else if (line.startsWith('[ORIG]')) {
                continue; // IMPORTANT: Crafter panel completely skips original URL
            } else if (line.startsWith('http')) {
                designs.push({ title: currentTitle, url: line.trim() });
                currentTitle = `Design ${designs.length + 1}`;
            }
        }
        // Fallback for single url or unstructured urls without titles
        if (designs.length === 0) {
            lines.forEach((l, i) => {
                if (l.startsWith('http')) designs.push({ title: `Design ${i + 1}`, url: l.trim() });
            });
        }
        return designs.length > 0 ? designs : [{ title: 'Design', url: designStr.replace(/\[ORIG\].*\n?/g, '').trim() }];
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-bold">{order.id}</span>
                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500">{order.date}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customerName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={order.status} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm flex space-x-2 items-center">
                                            {order.photoUrl && order.photoUrl !== 'No Photo' ? (
                                                <button onClick={() => setInspectOrder(order)} className="text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg flex items-center shadow-sm font-bold transition-colors">
                                                    <ExternalLink size={16} className="mr-1" /> Inspect Designs
                                                </button>
                                            ) : order.designUrl ? (
                                                <button onClick={() => setInspectOrder(order)} className="text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg flex items-center shadow-sm font-bold transition-colors">
                                                    <ExternalLink size={16} className="mr-1" /> Inspect Designs
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 italic font-medium">Not Ready</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {inspectOrder && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border-t-4 border-blue-600">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Review Designs: {inspectOrder.id}</h2>
                                <p className="text-sm text-gray-500 mt-1">Status: <StatusBadge status={inspectOrder.status} /></p>
                            </div>
                            <button onClick={() => setInspectOrder(null)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 shadow-sm border border-gray-200"><XCircle size={24} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            {parsePhotos(inspectOrder.photoUrl).map((group, idx) => (
                                <div key={idx} className="space-y-3">
                                    <h3 className="font-bold text-gray-800 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">{group.title}</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {group.urls.map((url, uidx) => {
                                            const rawUrl = url.split('?')[0];

                                            const photoTitleStr = group.title !== 'General' ? `${group.title.split('(')[0].trim()} Photo ${uidx + 1}` : `Photo ${uidx + 1} (Unsorted)`;
                                            const parsedDesigns = parseDesigns(inspectOrder.designUrl);
                                            let specificDesign = parsedDesigns.find(d => d.title === photoTitleStr);

                                            if (!specificDesign && parsedDesigns.length > 0 && parsedDesigns[0].title === 'Design 1' && idx === 0 && uidx === 0) {
                                                specificDesign = parsedDesigns[0];
                                            }

                                            return (
                                                <div key={uidx} className="flex flex-col border border-gray-200 rounded-xl overflow-hidden hover:border-gray-400 transition-colors shadow-sm group">
                                                    <a href={rawUrl} target="_blank" rel="noreferrer" className="block text-center p-4 bg-white border-b border-gray-100 flex-grow transition-colors hover:bg-gray-50 flex flex-col items-center justify-center">
                                                        <div className="text-gray-800 font-bold text-sm">
                                                            {photoTitleStr}
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 mt-1.5 uppercase tracking-wider font-semibold">VIEW ORIGINAL</span>
                                                    </a>
                                                    <div className="grid grid-cols-1 border-b border-gray-100 bg-gray-50">
                                                        {specificDesign ? (
                                                            <a href={specificDesign.url} target="_blank" rel="noreferrer" className="p-3.5 hover:bg-purple-50 text-purple-600 hover:text-purple-800 text-[11px] font-bold transition-colors flex flex-col items-center justify-center text-center">
                                                                <ExternalLink size={16} className="mb-1" />
                                                                <span>VIEW FINAL DESIGN</span>
                                                            </a>
                                                        ) : (
                                                            <div className="p-3.5 bg-gray-50 text-gray-400 text-[10px] font-bold flex flex-col items-center justify-center text-center italic">
                                                                <span>Design Pending</span>
                                                            </div>
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
                        {inspectOrder.status === 'Waiting for Approval' && (
                            <div className="p-5 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                <div className="mb-4 sm:mb-0">
                                    <h4 className="font-bold text-gray-800">Are all designs satisfactory?</h4>
                                    <p className="text-xs text-gray-500">Please review each design carefully before approving.</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button onClick={() => { triggerAction(inspectOrder.id, 'Changes Requested'); setInspectOrder(null); }} className="text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 px-5 py-2.5 rounded-lg shadow-sm font-bold transition-colors">
                                        Request Changes
                                    </button>
                                    <button onClick={() => { triggerAction(inspectOrder.id, 'Approved'); setInspectOrder(null); }} className="text-white bg-green-600 hover:bg-green-700 px-6 py-2.5 rounded-lg shadow-sm font-bold transition-colors">
                                        Approve All
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {confirmAction && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm px-4">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col max-w-sm w-full border-t-4 border-blue-600">
                        {rejectionSuccess ? (
                            <div className="text-center py-4">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Issue Logged</h3>
                                <p className="text-gray-600 mb-6 font-medium">The TroGifts team will contact you soon regarding this issue.</p>
                                <button onClick={() => { setRejectionSuccess(false); setConfirmAction(null); }} className="w-full py-2 flex justify-center text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors">Okay</button>
                            </div>
                        ) : (
                            <>
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
                                                <option>I want to change the img</option>
                                                <option>I want to change the name</option>
                                                <option>I don't need this I want to cancel this</option>
                                                <option>Other</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div className="flex space-x-3 w-full">
                                    <button onClick={() => setConfirmAction(null)} className="flex-1 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-bold transition-colors">Cancel</button>
                                    <button onClick={confirmAndExecute} disabled={!!actionLoading} className={`flex-1 flex justify-center items-center py-2 text-white rounded-lg font-bold transition-colors ${actionLoading ? 'opacity-50' : ''} ${confirmAction.newStatus === 'Approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                        {actionLoading ? (uploadProgress > 0 ? `Uploading (${uploadProgress}%)` : 'Saving...') : 'Confirm'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
