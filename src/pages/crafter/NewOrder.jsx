import { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, Loader2, X, Truck, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../api';
import { useNavigate } from 'react-router-dom';

export default function NewOrder() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        address: '',
        transactionId: '',
        deliveryMethod: 'Deliver to Customer',
        sameAddress: false,
        quantity: '1'
    });

    const [items, setItems] = useState([
        { customerName: '', template: 'Template A - Standard Classic', address: '', files: [] }
    ]);

    const [paymentFile, setPaymentFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [success, setSuccess] = useState(false);
    const [upiId, setUpiId] = useState('yourupi@bank');

    useEffect(() => {
        fetch('/upi.txt')
            .then(res => res.text())
            .then(text => {
                if (text && text.trim()) setUpiId(text.trim());
            })
            .catch(() => console.log('Using default upi'));
    }, []);

    const handleDeliveryChange = (method) => {
        if (method === 'Deliver to Customer') {
            setFormData({ ...formData, deliveryMethod: method, sameAddress: false, quantity: 1 });
            setItems([items[0]]);
        } else {
            setFormData({ ...formData, deliveryMethod: method, sameAddress: false });
        }
    };

    const handleSameAddressChange = (checked) => {
        setFormData({ ...formData, sameAddress: checked, quantity: checked ? formData.quantity : 1 });
        if (!checked) setItems([items[0]]);
    };

    const handleQuantityChange = (val) => {
        setFormData({ ...formData, quantity: val });
        const q = parseInt(val, 10) || 1;

        let newItems = [...items];
        if (q > items.length) {
            for (let i = items.length; i < q; i++) {
                newItems.push({ customerName: '', template: 'Template A - Standard Classic', address: '', files: [] });
            }
        } else if (q < items.length && q > 0) {
            newItems = newItems.slice(0, q);
        }
        setItems(newItems);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addFilesToItem = (index, newFiles) => {
        const newItems = [...items];
        newItems[index].files = [...newItems[index].files, ...Array.from(newFiles)];
        setItems(newItems);
    };

    const removeFileFromItem = (itemIndex, fileIndex) => {
        const newItems = [...items];
        newItems[itemIndex].files = newItems[itemIndex].files.filter((_, i) => i !== fileIndex);
        setItems(newItems);
    };

    const fileToBase64 = (f) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(f);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    const financials = () => {
        const q = parseInt(formData.quantity, 10) || 1;

        let originalPrice = q * 249;
        let price = originalPrice;
        let hasDiscount = false;

        if (q >= 2) {
            price = Math.floor(price * 0.95);
            hasDiscount = true;
        }

        let commission = 0;
        if (formData.deliveryMethod === 'Deliver to Customer' && !formData.sameAddress) {
            commission = q * 30; // standard 30 per
        } else {
            // Deliver to Crafter OR Deliver to Customer (same address)
            commission = q === 1 ? 30 : (q * 30) + (20 * (q - 1));
        }
        return { originalPrice, price, commission, hasDiscount };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        for (let i = 0; i < items.length; i++) {
            if (!items[i].customerName.trim()) return alert(`Item #${i + 1} is missing a Customer Name`);
            if (formData.deliveryMethod === 'Deliver to Customer' && !formData.sameAddress) {
                if (!items[i].address || !items[i].address.trim()) return alert(`Item #${i + 1} is missing a Shipping Address!`);
            }
            if (items[i].files.length === 0) return alert(`Item #${i + 1} requires at least one customer photo`);
        }
        if (!paymentFile) return alert('Payment screenshot is required');

        setIsSubmitting(true);
        setProgress(5);

        try {
            // Process ALL images across ALL items
            let combinedPayloadFiles = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                for (const f of item.files) {
                    const b64 = await fileToBase64(f);
                    combinedPayloadFiles.push({
                        base64: b64,
                        name: `Item${i + 1}_${item.customerName}_${f.name}`,
                        mimeType: f.type
                    });
                }
            }

            let payBase64 = null;
            if (paymentFile) {
                payBase64 = await fileToBase64(paymentFile);
            }
            setProgress(35); // Converted

            const ObjectFinancials = financials();

            // Combine all names and templates
            const allNames = items.map((i, index) => `Item ${index + 1}: ${i.customerName}`).join('\n');
            const allTemplates = items.map((i, index) => `Item ${index + 1}: ${i.template}`).join('\n');
            const allAddresses = items.map((i, index) => `Item ${index + 1}:\n${i.address}`).join('\n\n--- \n');

            const isMultipleAddresses = formData.deliveryMethod === 'Deliver to Customer' && !formData.sameAddress;

            const payload = {
                ...formData,
                customerName: allNames || 'N/A',
                template: allTemplates || 'N/A',
                address: isMultipleAddresses ? allAddresses : formData.address,
                referralId: user.referral_id,
                files: combinedPayloadFiles,
                paymentFileBase64: payBase64,
                paymentFileName: paymentFile ? paymentFile.name : null,
                paymentMimeType: paymentFile ? paymentFile.type : null,
                price: ObjectFinancials.price,
                originalPrice: ObjectFinancials.originalPrice,
                commission: ObjectFinancials.commission
            };

            // Fake interval
            const interval = setInterval(() => {
                setProgress(p => Math.min(p + Math.floor(Math.random() * 8) + 2, 90));
            }, 500);

            await apiCall('createOrder', payload);

            clearInterval(interval);
            setProgress(100);
            setSuccess(true);
            setTimeout(() => {
                items.forEach(item => item.files.forEach(f => URL.revokeObjectURL(f)));
                if (paymentFile) URL.revokeObjectURL(paymentFile);
                navigate('/dashboard/orders');
            }, 2000);
        } catch (error) {
            console.error('Error submitting order', error);
            alert('Error submitting order. Please try again.');
            setProgress(0);
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <CheckCircle size={64} className="text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900">Order Placed Successfully!</h2>
                <p className="text-gray-500 mt-2">Your payment and photos are securely uploaded.</p>
                <p className="text-gray-400 text-sm mt-1">Redirecting...</p>
            </div>
        );
    }

    const { originalPrice, price, commission, hasDiscount } = financials();

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Place New Batch Order</h1>
                <p className="mt-1 text-sm text-gray-500">Submit multiple customizations in a single transaction.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white shadow-sm border border-gray-100 rounded-xl p-6 space-y-6">

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Method</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div
                                onClick={() => handleDeliveryChange('Deliver to Customer')}
                                className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center text-center transition-all ${formData.deliveryMethod === 'Deliver to Customer' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 shadow-sm' : 'border-gray-200 hover:border-blue-300 bg-white'}`}
                            >
                                <Truck size={24} className={`mb-2 ${formData.deliveryMethod === 'Deliver to Customer' ? 'text-blue-600' : 'text-gray-400'}`} />
                                <span className={`text-sm font-medium ${formData.deliveryMethod === 'Deliver to Customer' ? 'text-blue-700' : 'text-gray-700'}`}>Deliver to Customer</span>
                            </div>
                            <div
                                onClick={() => handleDeliveryChange('Deliver to Crafter')}
                                className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center text-center transition-all ${formData.deliveryMethod === 'Deliver to Crafter' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 shadow-sm' : 'border-gray-200 hover:border-blue-300 bg-white'}`}
                            >
                                <Package size={24} className={`mb-2 ${formData.deliveryMethod === 'Deliver to Crafter' ? 'text-blue-600' : 'text-gray-400'}`} />
                                <span className={`text-sm font-medium ${formData.deliveryMethod === 'Deliver to Crafter' ? 'text-blue-700' : 'text-gray-700'}`}>Deliver to Crafter</span>
                            </div>
                        </div>

                        {formData.deliveryMethod === 'Deliver to Customer' && (
                            <div className="mt-3 flex items-center bg-gray-50 border border-gray-200 p-2 rounded-lg">
                                <input
                                    id="sameAddress"
                                    type="checkbox"
                                    checked={formData.sameAddress}
                                    onChange={e => handleSameAddressChange(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="sameAddress" className="ml-2 block text-sm font-medium text-gray-700 cursor-pointer">
                                    Shipping entirely to the exact same address?
                                </label>
                            </div>
                        )}

                    </div>
                    {!(formData.deliveryMethod === 'Deliver to Customer' && !formData.sameAddress) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Quantity</label>
                            <input type="number" min="1" step="1" value={formData.quantity} onChange={e => handleQuantityChange(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border py-2 px-3" />
                        </div>
                    )}
                </div>

                <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl flex flex-col sm:flex-row justify-between items-center">
                    <div>
                        <div className="flex items-center space-x-2">
                            <span className="text-gray-500 block text-xs uppercase font-bold tracking-wider">Total Customer Price</span>
                            {hasDiscount && (
                                <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">5% Discount Applied</span>
                            )}
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5">
                            <span className="font-bold text-gray-900 text-2xl">₹{price}</span>
                            {originalPrice > price && (
                                <span className="text-sm text-gray-400 line-through font-medium">₹{originalPrice}</span>
                            )}
                        </div>
                    </div>
                    <div className="text-center sm:text-right mt-3 sm:mt-0">
                        <span className="text-blue-600 block text-xs uppercase font-bold tracking-wider">Your Combined Commission</span>
                        <span className="font-bold text-blue-700 text-3xl">₹{commission}</span>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800">Customization Details ({items.length})</h3>
                    <div className="space-y-6">
                        {items.map((item, index) => (
                            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                    <h4 className="font-bold text-sm text-gray-500 uppercase tracking-widest">Item #{index + 1}</h4>
                                </div>

                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                                        <input type="text" value={item.customerName} onChange={e => updateItem(index, 'customerName', e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border py-2 px-3" placeholder="Name to print/engrave..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Template Selection</label>
                                        <select value={item.template} onChange={e => updateItem(index, 'template', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border py-2 px-3">
                                            <option>Template A - Standard Classic</option>
                                            <option>Template B - Modern Edge</option>
                                            <option>Template C - Vintage Glow</option>
                                            <option>Template D - Minimalist</option>
                                            <option>Template E - Premium Gold</option>
                                        </select>
                                    </div>
                                </div>

                                {formData.deliveryMethod === 'Deliver to Customer' && !formData.sameAddress && (
                                    <div className="pt-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Specific Shipping Address for {item.customerName || `Item #${index + 1}`}</label>
                                        <textarea rows={2} value={item.address || ''} onChange={e => updateItem(index, 'address', e.target.value)} required className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border py-2 px-3" placeholder="Full residential destination address for this specific customer..." />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer Photos (PNG, JPG)</label>
                                    <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-gray-300 border-dashed rounded-lg bg-white hover:border-blue-400 transition-colors">
                                        <div className="space-y-1 text-center">
                                            <div className="flex text-sm text-gray-600 justify-center">
                                                <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 px-2 py-1">
                                                    <span>Upload files for {item.customerName || `Item #${index + 1}`}</span>
                                                    <input type="file" multiple className="sr-only" onChange={e => addFilesToItem(index, e.target.files)} accept="image/*" />
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {item.files.length > 0 && (
                                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 mt-3">
                                            {item.files.map((f, fi) => (
                                                <div key={fi} className="relative aspect-square rounded-md border border-gray-200 overflow-hidden group shadow-sm">
                                                    <img src={URL.createObjectURL(f)} alt="preview" className="object-cover w-full h-full" />
                                                    <button type="button" onClick={() => removeFileFromItem(index, fi)} className="absolute top-1 right-1 bg-red-500/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Logistics & Payment</h3>
                    <div className="space-y-6">

                        <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
                            <div className="flex items-center space-x-2 text-blue-600 mb-1">
                                <span className="font-bold uppercase tracking-wider text-xs">Total Amount Due</span>
                            </div>
                            <span className="font-bold text-gray-900 text-3xl mb-4">₹{price}</span>

                            <div className="bg-white p-2 border border-gray-200 rounded-xl shadow-sm inline-block">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=Tro%20Gifts&am=${price}&cu=INR`)}`}
                                    alt="UPI QR Code"
                                    className="w-48 h-48 object-contain"
                                />
                            </div>
                            <div className="mt-4 w-full sm:max-w-xs">
                                <a
                                    href={`upi://pay?pa=${upiId}&pn=Tro%20Gifts&am=${price}&cu=INR`}
                                    className="w-full flex items-center justify-center py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    Open Local UPI App
                                </a>
                                <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                                    Paying To: <span className="font-bold text-gray-800 tracking-wide">{upiId}</span>
                                </div>
                            </div>
                        </div>

                        {!(formData.deliveryMethod === 'Deliver to Customer' && !formData.sameAddress) && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Shipping Address {formData.deliveryMethod === 'Deliver to Customer' && !formData.sameAddress && "(Leave detailed instructions if delivering to completely different addresses)"}</label>
                                <textarea rows={3} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border py-2 px-3" placeholder="Full residential destination address for this batch..." />
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Payment Transaction ID</label>
                                <input type="text" value={formData.transactionId} onChange={e => setFormData({ ...formData, transactionId: e.target.value })} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border py-2 px-3" placeholder="e.g TXN-..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Payment Screenshot</label>
                                <input type="file" onChange={e => setPaymentFile(e.target.files[0])} accept="image/*" required className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-md p-1" />
                            </div>
                        </div>
                    </div>
                </div>

                {isSubmitting && (
                    <div className="pt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1 font-medium">
                            <span>{progress < 35 ? 'Consolidating images...' : 'Uploading securely to backend...'}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                )}

                <div className="pt-6">
                    <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed items-center transition-colors">
                        {isSubmitting ? (
                            <><Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" /> Uploading Batch Order...</>
                        ) : 'Submit Batch Order'}
                    </button>
                </div>
            </form>
        </div>
    );
}
