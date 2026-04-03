import { useState, useEffect, useRef } from 'react';
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
    const [submitError, setSubmitError] = useState(null);
    const [uploadStatusMsg, setUploadStatusMsg] = useState('Verifying active uploads...');
    const [success, setSuccess] = useState(false);
    const [pendingUploads, setPendingUploads] = useState(null);
    const [upiId, setUpiId] = useState('yourupi@bank');

    const itemsRef = useRef(items);
    const paymentFileRef = useRef(paymentFile);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    useEffect(() => {
        paymentFileRef.current = paymentFile;
    }, [paymentFile]);

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

    const uploadToImageKit = (fileObjOrBase64, onProgress) => {
        return new Promise(async (resolve, reject) => {
            try {
                const authRes = await apiCall('imageKitAuth');
                const formData = new FormData();

                // ImageKit natively processes binary files or raw Base64 seamlessly
                const isBase64 = typeof fileObjOrBase64 === 'string';
                const fileData = isBase64 ? fileObjOrBase64 : fileObjOrBase64;
                const fileName = isBase64 ? 'PAY_RECEIPT_' + Date.now() + '.jpg' : fileObjOrBase64.name;

                formData.append('file', fileData);
                formData.append('publicKey', "public_dDc0Ef5AdC441yPX2BS8xhXDPcY=");
                formData.append('signature', authRes.signature);
                formData.append('expire', authRes.expire);
                formData.append('token', authRes.token);
                formData.append('fileName', fileName);

                const xhr = new XMLHttpRequest();
                xhr.open('POST', 'https://upload.imagekit.io/api/v1/files/upload', true);

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
                };

                xhr.onload = () => {
                    if (xhr.status === 200) {
                        const response = JSON.parse(xhr.responseText);
                        resolve({ success: true, url: response.url + '?tr=w-800,q-auto,f-auto' });
                    } else reject(new Error(xhr.responseText));
                };

                xhr.onerror = () => reject(new Error("Network Error"));
                xhr.send(formData);
            } catch (e) { reject(e); }
        });
    };

    const compressPaymentScreenshot = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.70));
                };
                img.onerror = () => resolve(event.target.result);
            };
            reader.onerror = error => reject(error);
        });
    };

    const processImageFile = (file) => {
        return new Promise((resolve, reject) => {
            if (file.type !== 'image/jpeg' && file.type !== 'image/webp' && file.type !== 'image/jpg') {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 3500;
                    const MAX_HEIGHT = 3500;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }

                    if (width >= img.width && height >= img.height && file.size < 2000000) {
                        resolve(event.target.result);
                        return;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.92));
                };
                img.onerror = () => resolve(event.target.result);
            };
            reader.onerror = error => reject(error);
        });
    };

    const addFilesToItem = (index, newFiles) => {
        setPendingUploads({ index, newFiles });
    };

    const confirmPendingUploads = async () => {
        if (!pendingUploads) return;
        const { index, newFiles } = pendingUploads;

        const newItems = [...items];
        const newObjs = Array.from(newFiles).map(f => ({ file: f, url: null, status: 'uploading' }));
        newItems[index].files = [...newItems[index].files, ...newObjs];
        setItems(newItems);
        setPendingUploads(null);

        // Use Sequential Processing to avoid local network bandwidth saturation crashing from processing 3x 50MB files concurrently
        for (const fObj of newObjs) {
            setItems(prev => {
                const copy = [...prev];
                if (!copy[index]) return copy;
                const target = copy[index].files.find(x => x.file === fObj.file);
                if (target) { target.status = 'uploading'; target.uploadProgress = 0; }
                return copy;
            });

            try {
                const res = await uploadToImageKit(fObj.file, (percent) => {
                    setItems(prev => {
                        const copy = [...prev];
                        if (!copy[index]) return copy;
                        const target = copy[index].files.find(x => x.file === fObj.file);
                        if (target && target.status === 'uploading') {
                            target.uploadProgress = percent;
                        }
                        return copy;
                    });
                });

                setItems(prev => {
                    const copy = [...prev];
                    if (!copy[index]) return copy;
                    const target = copy[index].files.find(x => x.file === fObj.file);
                    if (target && res.success) { target.url = res.url; target.status = 'completed'; }
                    else if (target) { target.status = 'error'; }
                    return copy;
                });
            } catch (err) {
                setItems(prev => {
                    const copy = [...prev];
                    if (!copy[index]) return copy;
                    const target = copy[index].files.find(x => x.file === fObj.file);
                    if (target) target.status = 'error';
                    return copy;
                });
            }
        }
    };

    const removeFileFromItem = (itemIndex, fileIndex) => {
        const newItems = [...items];
        newItems[itemIndex].files = newItems[itemIndex].files.filter((_, i) => i !== fileIndex);
        setItems(newItems);
    };

    const handlePaymentSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPaymentFile({ file: file, status: 'uploading', uploadProgress: 0, url: null });

        // We still aggressively compress the Payment Screenshot since pristine clarity is irrelevant for receipts
        compressPaymentScreenshot(file).then(async (b64) => {
            try {
                const res = await uploadToImageKit(b64, (percent) => {
                    setPaymentFile(prev => ({ ...prev, uploadProgress: percent }));
                });
                if (res.success) setPaymentFile(prev => ({ ...prev, url: res.url, status: 'completed' }));
                else setPaymentFile(prev => ({ ...prev, status: 'error' }));
            } catch (err) {
                setPaymentFile(prev => ({ ...prev, status: 'error' }));
            }
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
        setSubmitError(null);

        // Validation
        for (let i = 0; i < items.length; i++) {
            if (!items[i].customerName.trim()) return alert(`Item #${i + 1} is missing a Customer Name`);
            if (formData.deliveryMethod === 'Deliver to Customer' && !formData.sameAddress) {
                if (!items[i].address || !items[i].address.trim()) return alert(`Item #${i + 1} is missing a Shipping Address!`);
            }
            if (items[i].files.length === 0) return alert(`Item #${i + 1} requires at least one customer photo`);
        }
        if (!paymentFile) return alert('Payment screenshot is absolutely mandatory');

        setIsSubmitting(true);
        // We no longer rely on fake progress since we are doing realtime blocking await
        setProgress(10);

        try {
            setUploadStatusMsg('Verifying active uploads...');
            // Block until all background uploads finish natively
            const waitForUploads = () => new Promise(resolve => {
                const check = setInterval(() => {
                    let total = 0;
                    let completed = 0;
                    let totalProgress = 0; // Tracks 0-100 per file

                    const currentPay = paymentFileRef.current;
                    if (currentPay) {
                        total++;
                        if (currentPay.status === 'completed' || currentPay.status === 'error') {
                            completed++;
                            totalProgress += 100;
                        } else {
                            totalProgress += (currentPay.uploadProgress || 0);
                        }
                    }

                    const currentItems = itemsRef.current;
                    for (let i = 0; i < currentItems.length; i++) {
                        for (let f of currentItems[i].files) {
                            total++;
                            if (f.status === 'completed' || f.status === 'error') {
                                completed++;
                                totalProgress += 100;
                            } else {
                                totalProgress += (f.uploadProgress || 0);
                            }
                        }
                    }

                    if (total > 0 && total === completed) {
                        clearInterval(check);
                        resolve();
                    } else if (total > 0) {
                        const imagesPercent = totalProgress / (total * 100);
                        setProgress(Math.floor(10 + (imagesPercent * 40)));
                        setUploadStatusMsg(`Uploading images... (${completed}/${total})`);
                    } else {
                        clearInterval(check);
                        resolve();
                    }
                }, 100);
            });

            await waitForUploads();
            setProgress(50); // Raw images finished

            const currentItems = itemsRef.current;
            const currentPay = paymentFileRef.current;

            // Abort submission if any background upload failed over the network
            let hasErrors = false;
            if (currentPay && currentPay.status === 'error') hasErrors = true;
            for (let i = 0; i < currentItems.length; i++) {
                for (let f of currentItems[i].files) {
                    if (f.status === 'error') hasErrors = true;
                }
            }

            if (hasErrors) {
                setSubmitError('One or more files failed to upload to the server. Please check the files marked in red, remove them, and try uploading again.');
                return;
            }

            setUploadStatusMsg('Pushing order to robust servers...');

            // Reconstruct final string formats for the backend payload

            let finalPhotoString = '';
            for (let i = 0; i < currentItems.length; i++) {
                if (finalPhotoString.length > 0) finalPhotoString += '\n';
                finalPhotoString += `--- Item ${i + 1}: ${currentItems[i].customerName} ---\n`;
                for (const fObj of currentItems[i].files) {
                    if (fObj.url) finalPhotoString += fObj.url + '\n';
                    else finalPhotoString += '[UPLOAD FAILED]\n';
                }
            }

            setProgress(60);

            const ObjectFinancials = financials();

            // Combine all names and templates
            const allNames = currentItems.map((i, index) => `Item ${index + 1}: ${i.customerName}`).join('\n');
            const allTemplates = currentItems.map((i, index) => `Item ${index + 1}: ${i.template}`).join('\n');
            const allAddresses = currentItems.map((i, index) => `Item ${index + 1}:\n${i.address}`).join('\n\n--- \n');

            const isMultipleAddresses = formData.deliveryMethod === 'Deliver to Customer' && !formData.sameAddress;

            const payload = {
                ...formData,
                customerName: allNames || 'N/A',
                template: allTemplates || 'N/A',
                address: isMultipleAddresses ? allAddresses : formData.address,
                referralId: user.referral_id,
                finalPhotoString: finalPhotoString,
                paymentUrl: currentPay ? currentPay.url : '',
                price: ObjectFinancials.price,
                originalPrice: ObjectFinancials.originalPrice,
                commission: ObjectFinancials.commission
            };

            setProgress(80);
            await apiCall('createOrder', payload);

            setProgress(100);
            setSuccess(true);
            setTimeout(() => {
                items.forEach(item => item.files.forEach(fObj => URL.revokeObjectURL(fObj.file)));
                if (paymentFile && paymentFile.file) URL.revokeObjectURL(paymentFile.file);
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
                                            {item.files.map((fObj, fi) => (
                                                <div key={fi} className="relative aspect-square rounded-md border border-gray-200 overflow-hidden group shadow-sm bg-gray-100">
                                                    <img src={URL.createObjectURL(fObj.file)} alt="preview" className="object-cover w-full h-full" />

                                                    {/* Background Status Indicator */}
                                                    {fObj.status === 'queued' && (
                                                        <div className="absolute inset-0 bg-gray-500/50 flex items-center justify-center pointer-events-none z-10 transition-all">
                                                            <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-gray-900/60 px-2 py-0.5 rounded-full shadow border border-gray-500/30">In Queue</span>
                                                        </div>
                                                    )}
                                                    {fObj.status === 'uploading' && (
                                                        <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center pointer-events-none z-10 p-2">
                                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1.5 overflow-hidden">
                                                                <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-150" style={{ width: `${fObj.uploadProgress || 0}%` }}></div>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest leading-none drop-shadow-sm">{fObj.uploadProgress || 0}%</span>
                                                        </div>
                                                    )}
                                                    {fObj.status === 'completed' && (
                                                        <div className="absolute inset-0 bg-green-500/20 pointer-events-none flex items-end justify-center pb-1">
                                                            <CheckCircle size={14} className="text-green-700 bg-white rounded-full" />
                                                        </div>
                                                    )}

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
                                <input type="file" onChange={handlePaymentSelect} accept="image/*" required className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-md p-1" />
                                {paymentFile && paymentFile.status === 'uploading' && (
                                    <div className="mt-2 text-xs text-blue-600 border border-blue-100 bg-blue-50/50 rounded-md p-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="flex items-center font-bold"><Loader2 size={12} className="animate-spin mr-1.5" /> Uploading securely</span>
                                            <span className="font-bold">{paymentFile.uploadProgress || 0}%</span>
                                        </div>
                                        <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-150" style={{ width: `${paymentFile.uploadProgress || 0}%` }}></div>
                                        </div>
                                    </div>
                                )}
                                {paymentFile && paymentFile.status === 'completed' && <span className="text-xs text-green-600 mt-2 block flex items-center font-bold"><CheckCircle size={12} className="mr-1" /> Successfully uploaded securely</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {isSubmitting && (
                    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center backdrop-blur-sm px-4">
                        <div className={`bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center max-w-sm w-full border-t-8 ${submitError ? 'border-red-600' : 'border-blue-600'}`}>
                            {submitError ? (
                                <>
                                    <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                                        <X size={32} />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 uppercase">Upload Failed</h3>
                                    <p className="text-sm text-red-600 mt-3 font-bold bg-red-50 py-2 px-3 rounded-lg border border-red-200">
                                        {submitError}
                                    </p>
                                    <button
                                        onClick={() => { setIsSubmitting(false); setSubmitError(null); setProgress(0); }}
                                        className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-red-200"
                                    >
                                        Go Back & Fix
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Loader2 className="w-14 h-14 text-blue-600 animate-spin mb-4" />
                                    <h3 className="text-2xl font-black text-gray-900 uppercase">Saving Order</h3>
                                    <p className="text-sm text-gray-500 mt-2 font-bold bg-yellow-100 text-yellow-800 py-1 px-3 rounded-full border border-yellow-200">
                                        ⚠️ DO NOT CLOSE THIS TAB OR BROWSER
                                    </p>

                                    <div className="w-full mt-8 relative">
                                        <div className="flex justify-between text-xs text-gray-500 mb-1 font-bold">
                                            <span>{uploadStatusMsg}</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner relative">
                                            <div className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out relative" style={{ width: `${progress}%` }}>
                                                {/* Indeterminate moving glare over the progress bar for continuous movement illusion */}
                                                <div className="absolute top-0 bottom-0 left-0 w-full overflow-hidden rounded-full pointer-events-none">
                                                    <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] animate-[ping_1.5s_ease-in-out_infinite]" style={{ transform: 'translateX(-100%)', animation: 'slide-right 1.5s infinite' }} />
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-bold text-blue-500/70 mt-3 animate-pulse text-center tracking-widest uppercase mb-[-12px]">Please hold, establishing secure tunnels...</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {pendingUploads && (
                    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center backdrop-blur-sm px-4 overflow-y-auto pt-10 pb-10">
                        <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col max-w-sm w-full border-t-8 border-blue-600">
                            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Confirm Photos</h3>
                            <p className="text-gray-600 mb-4 text-center text-sm font-medium">Please verify the {Array.from(pendingUploads.newFiles).length} photo(s) selected before continuing.</p>

                            <div className="grid grid-cols-3 gap-2 mb-6 max-h-[30vh] overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-100">
                                {Array.from(pendingUploads.newFiles).map((f, i) => (
                                    <div key={i} className="aspect-square rounded shadow-sm overflow-hidden border border-gray-200">
                                        <img src={URL.createObjectURL(f)} alt="preview" className="object-cover w-full h-full" />
                                    </div>
                                ))}
                            </div>

                            <div className="flex space-x-3 w-full">
                                <button type="button" onClick={() => setPendingUploads(null)} className="flex-1 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-bold transition-colors">Cancel</button>
                                <button type="button" onClick={confirmPendingUploads} className="flex-1 flex justify-center items-center py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors">
                                    Confirm
                                </button>
                            </div>
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
