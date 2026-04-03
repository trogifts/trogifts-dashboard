import React, { useState, useRef } from 'react';

// Configuration
export const IMAGEKIT_PUBLIC_KEY = "public_dDc0Ef5AdC441yPX2BS8xhXDPcY=";
export const IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/avaxkktl2";
// Point to the backend auth server we just created
export const AUTH_ENDPOINT = "http://localhost:3001/api/imagekit/auth";

export default function ImageKitUploader() {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('idle'); // 'idle', 'uploading', 'completed', 'error'
    const [progress, setProgress] = useState(0);
    const [uploadedData, setUploadedData] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");

    const fileInputRef = useRef(null);

    // 1. Validation Logic
    const handleFileSelect = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;

        setErrorMsg("");
        setStatus('idle');

        // Security: Validate file type precisely (jpg, png, webp)
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(selected.type)) {
            setErrorMsg("Invalid format. Please upload JPG, PNG, or WebP images only.");
            return;
        }

        // Security: Validate strict exact file size payload constraints (5MB to 50MB)
        const sizeMB = selected.size / (1024 * 1024);
        if (sizeMB < 5 || sizeMB > 50) {
            setErrorMsg(`File size must be exactly between 5MB and 50MB. (Your file is ${sizeMB.toFixed(2)}MB)`);
            return;
        }

        setFile(selected);
    };

    // 2. Upload Logic Framework
    const handleUpload = async () => {
        if (!file) return;

        setStatus('uploading');
        setProgress(0);
        setErrorMsg("");

        try {
            // Step A: Secure Authentication Handshake
            const authRes = await fetch(AUTH_ENDPOINT);
            if (!authRes.ok) throw new Error("Authentication request rejected by the server.");
            const { token, expire, signature } = await authRes.json();

            // Step B: Original Source Direct Upload (Bypassing external compressions entirely)
            const formData = new FormData();
            formData.append('file', file);
            formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);
            formData.append('signature', signature);
            formData.append('expire', expire);
            formData.append('token', token);
            formData.append('fileName', file.name);

            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', 'https://upload.imagekit.io/api/v1/files/upload', true);

                // Live Native Transfer Tracking
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        setProgress(percent);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status === 200) {
                        const response = JSON.parse(xhr.responseText);
                        setUploadedData(response);
                        setStatus('completed');
                        resolve(response);
                    } else {
                        setStatus('error');
                        setErrorMsg("ImageKit Upload Pipeline Failed: " + xhr.responseText);
                        reject(new Error(xhr.responseText));
                    }
                };

                xhr.onerror = () => {
                    setStatus('error');
                    setErrorMsg("Fatal Network Transfer Error Occurred.");
                    reject(new Error("Network Error"));
                };

                xhr.send(formData);
            });
        } catch (error) {
            setStatus('error');
            setErrorMsg(error.message);
        }
    };

    // 3. Delete Logic Action Component
    const handleDelete = async () => {
        if (!uploadedData || !uploadedData.fileId) return;

        try {
            const res = await fetch(`http://localhost:3001/api/imagekit/delete/${uploadedData.fileId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Failed to delete from CDN.");

            setUploadedData(null);
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setStatus('idle');
            setProgress(0);
        } catch (error) {
            setErrorMsg("Failed to delete file deeply from servers.");
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ marginBottom: '10px' }}>Full Resolution Delivery Engine</h2>
            <p style={{ color: '#555', fontSize: '14px', marginBottom: '20px' }}>
                Upload massive raw images (5MB to 50MB) directly to global edge networks bypassing local processors entirely.
            </p>

            <input
                type="file"
                onChange={handleFileSelect}
                accept="image/jpeg, image/png, image/webp"
                ref={fileInputRef}
                style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px', width: '100%', marginBottom: '10px' }}
            />

            {errorMsg && <div style={{ color: 'red', fontWeight: 'bold', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '5px', marginBottom: '15px' }}>⚠️ {errorMsg}</div>}

            {file && status === 'idle' && (
                <button
                    onClick={handleUpload}
                    style={{ background: '#0055FF', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Deploy Heavy Payload to CDN
                </button>
            )}

            {status === 'uploading' && (
                <div style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
                        <span>Pushing uncompressed source...</span>
                        <span>{progress}%</span>
                    </div>
                    <div style={{ width: '100%', backgroundColor: '#eee', borderRadius: '10px', height: '10px', overflow: 'hidden' }}>
                        <div style={{ backgroundColor: '#0055FF', width: `${progress}%`, height: '10px', transition: 'width 0.2s' }}></div>
                    </div>
                </div>
            )}

            {/* 4. Display Logic - Optimized Output Rendering */}
            {status === 'completed' && uploadedData && (
                <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '10px', backgroundColor: '#f9f9f9' }}>
                    <h3 style={{ color: 'green', display: 'flex', alignItems: 'center' }}>✅ Original Asset Secured Successfully!</h3>
                    <p style={{ fontSize: '12px', color: '#666' }}>Stored File ID: <b>{uploadedData.fileId}</b></p>

                    {/* The dynamically transformed optimized URL */}
                    <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'white', border: '1px solid #e1e1e1', borderRadius: '5px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>Optimized Delivery Link Using Transformations:</p>
                        <img
                            src={`${uploadedData.url}?tr=w-800,q-auto,f-auto`}
                            alt="Optimized Delivery Result"
                            style={{ maxWidth: '100%', borderRadius: '5px', border: '1px solid #eee' }}
                        />
                        <p style={{ wordBreak: 'break-all', fontSize: '10px', color: '#888', marginTop: '10px' }}>{`${uploadedData.url}?tr=w-800,q-auto,f-auto`}</p>
                    </div>

                    <button
                        onClick={handleDelete}
                        style={{ marginTop: '20px', background: '#FF3333', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}
                    >
                        Permanently Delete Asset
                    </button>
                </div>
            )}
        </div>
    );
}
