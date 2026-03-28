// Replace this with the URL you get after deploying backend.gs as a Web App
export const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyVy6ngWzi9V6ydzxPKX21xvNCcWcEYBJvelrqkLRJiLjzSEzJd0t7ZUmzXXVD0kEOy/exec';

export const apiCall = async (action, data = {}) => {
    if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        console.warn('API URL not configured. Using fallback mocked response for action:', action);
        return mockApiCall(action, data);
    }

    try {
        const isGet = ['getOrders', 'getCrafters', 'getDashboardStats'].includes(action);
        let response;

        if (isGet) {
            // Convert mapping for Apps Script doGet URL
            const url = new URL(SCRIPT_URL);
            url.searchParams.append('action', action);
            for (const [key, value] of Object.entries(data)) {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, value);
                }
            }
            response = await fetch(url.toString(), {
                method: 'GET'
            });
        } else {
            // Use POST for backend doPost
            const payload = { action, ...data };
            response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(payload),
            });
        }

        const result = await response.json();
        if (result.error) throw new Error(result.error);
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// ==========================================
// Fallback Mock System (Until URL is provided)
// ==========================================

const mockApiCall = async (action, data) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (action === 'login') {
        if (data.email.includes('admin')) return { uid: '1', role: 'admin', name: 'Admin', email: data.email };
        return { uid: '2', role: 'crafter', name: 'Crafter', email: data.email, referral_id: 'REF_9876' };
    }
    if (action === 'register') {
        return { uid: Date.now().toString(), role: 'crafter', name: data.name, email: data.email, referral_id: 'REF_1111' };
    }
    if (action === 'createOrder') {
        return { orderId: 'ORD-' + Math.floor(Math.random() * 9000), status: 'Order Placed', fileUrl: 'https://drive.google.com/open?id=mock' };
    }
    if (action === 'getOrders') {
        return {
            orders: [
                { id: 'ORD-1234', customerName: 'Alice Smith', status: 'Waiting for Approval', date: '2026-03-28' },
                { id: 'ORD-1235', customerName: 'Bob Johnson', status: 'Order Placed', date: '2026-03-27' }
            ]
        };
    }
    if (action === 'getDashboardStats') {
        return { totalOrders: 12, totalEarnings: '$240.00', pendingPayout: '$45.00', paidEarnings: '$195.00' };
    }

    return { success: true };
};
