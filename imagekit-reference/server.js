const express = require('express');
const cors = require('cors');
const ImageKit = require('imagekit');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize ImageKit with your secure private credentials
const imagekit = new ImageKit({
    publicKey: "public_dDc0Ef5AdC441yPX2BS8xhXDPcY=",
    privateKey: "private_iObSFKYv8L8AYuSmyelfvJW/yMM=",
    urlEndpoint: "https://ik.imagekit.io/avaxkktl2"
});

// AUTHENTICATION API: Required for secure client-side uploads directly to ImageKit
app.get('/api/imagekit/auth', (req, res) => {
    try {
        // Generates the token, expire, and signature without exposing the private key to the frontend
        const authenticationParameters = imagekit.getAuthenticationParameters();
        res.json(authenticationParameters);
    } catch (error) {
        console.error("Auth Error:", error);
        res.status(500).json({ error: "Failed to generate ImageKit authentication parameters." });
    }
});

// DELETE API: Securely deletes an image from ImageKit infrastructure using its unique fileId
app.delete('/api/imagekit/delete/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        if (!fileId) return res.status(400).json({ error: "File ID is required." });

        await imagekit.deleteFile(fileId);
        res.json({ success: true, message: "Image successfully deleted from ImageKit arrays." });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ error: "Failed to delete file from ImageKit." });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Secure ImageKit Backend running on http://localhost:${PORT}`));
