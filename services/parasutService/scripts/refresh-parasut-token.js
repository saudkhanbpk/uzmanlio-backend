import axios from 'axios';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Token from '../../../models/parasutTokens.Model.js';

// Load environment variables
dotenv.config();

const CLIENT_ID = process.env.PARASUT_CLIENT_ID;
const CLIENT_SECRET = process.env.PARASUT_CLIENT_SECRET;
const OAUTH_BASE_URL = process.env.PARASUT_OAUTH_BASE_URL;

async function refreshParasutToken() {
    console.log('🔄 Refreshing Paraşüt access token...');

    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error('❌ Missing CLIENT_ID or CLIENT_SECRET in .env file');
        process.exit(1);
    }

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE;
    if (!mongoUri) {
        console.error('❌ MongoDB connection string not found');
        process.exit(1);
    }

    let REFRESH_TOKEN;
    let tokenDoc;

    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Get current token from database
        tokenDoc = await Token.findOne({ service: 'parasut' });
        if (!tokenDoc) {
            console.error('❌ No Paraşüt tokens found in database');
            console.log('Please run the migration first: npm run migrate:tokens');
            process.exit(1);
        }

        REFRESH_TOKEN = tokenDoc.refreshToken;
        console.log('✅ Loaded refresh token from database');
    } catch (dbError) {
        console.error('❌ Database connection failed:', dbError.message);
        process.exit(1);
    }

    try {
        const tokenUrl = `${OAUTH_BASE_URL}/oauth/token`;
        console.log(`🔗 Using OAuth endpoint: ${tokenUrl}`);

        const response = await axios.post(tokenUrl, {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: REFRESH_TOKEN,
            grant_type: 'refresh_token'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const { access_token, refresh_token, expires_in } = response.data;
        console.log('✅ Token refreshed successfully!');
        console.log(`New Access Token: ${access_token.substring(0, 20)}...`);
        console.log(`Expires in: ${expires_in} seconds`);

        // Calculate expiry timestamp
        const expiryTimestamp = Date.now() + (expires_in * 1000);

        // Update database
        await Token.saveToken('parasut', {
            accessToken: access_token,
            refreshToken: refresh_token || tokenDoc.refreshToken, // Use new refresh token or keep existing
            tokenExpiry: expiryTimestamp,
            companyId: tokenDoc.companyId,
            metadata: {
                lastRefreshed: new Date(),
                refreshedBy: 'refresh_script'
            }
        });

        console.log('✅ Database updated with new tokens!');

        // Also update .env file for local development (if file exists)
        try {
            const fs = await import('fs');
            const path = await import('path');
            const { fileURLToPath } = await import('url');

            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const envPath = path.join(__dirname, '..', '.env');

            if (fs.existsSync(envPath)) {
                let envContent = fs.readFileSync(envPath, 'utf8');

                // Update tokens
                envContent = envContent.replace(/PARASUT_ACCESS_TOKEN=.*/, `PARASUT_ACCESS_TOKEN=${access_token}`);
                if (refresh_token) {
                    envContent = envContent.replace(/PARASUT_REFRESH_TOKEN=.*/, `PARASUT_REFRESH_TOKEN=${refresh_token}`);
                }
                envContent = envContent.replace(/PARASUT_TOKEN_EXPIRY=.*/, `PARASUT_TOKEN_EXPIRY=${expiryTimestamp}`);

                fs.writeFileSync(envPath, envContent);
                console.log('✅ .env file also updated for local development!');
            }
        } catch (envError) {
            console.log('⚠️ Could not update .env file (normal in production):', envError.message);
        }

    } catch (error) {
        console.error('❌ Failed to refresh token:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }

        console.log('💡 You may need to complete the full OAuth flow again:');
        console.log('npm run setup:parasut YOUR_NEW_AUTH_CODE');
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

refreshParasutToken();
