import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paraşüt OAuth credentials 
const CLIENT_ID = process.env.PARASUT_CLIENT_ID;
const CLIENT_SECRET = process.env.PARASUT_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

async function setupParasutAuth() {
    console.log('🔐 Paraşüt OAuth Setup');
    console.log('='.repeat(50));

    // Get authorization code from command line argument
    const authCode = process.argv[2];

    if (!authCode) {
        console.log('❌ Authorization code is required!');
        console.log('');
        console.log('Please follow these steps:');
        console.log('1. Visit this URL in your browser:');
        console.log(`   https://api.parasut.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code`);
        console.log('');
        console.log('2. Log in to your Paraşüt account');
        console.log('3. Authorize the application');
        console.log('4. Copy the authorization code from the page');
        console.log('5. Run this script with the code:');
        console.log(`   node scripts/setup-parasut-auth.js YOUR_AUTHORIZATION_CODE`);
        console.log('');
        process.exit(1);
    }

    try {
        console.log('🔄 Exchanging authorization code for access token...');

        // Exchange authorization code for access token
        const tokenResponse = await axios.post('https://api.parasut.com/oauth/token', {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: authCode,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        console.log('✅ Access token obtained successfully!', tokenResponse.data);

        console.log('✅ Successfully obtained tokens!');
        console.log(`   Access Token: ${access_token.substring(0, 20)}...`);
        console.log(`   Refresh Token: ${refresh_token.substring(0, 20)}...`);
        console.log(`   Expires In: ${expires_in} seconds`);

        // Calculate expiry timestamp
        const expiryTimestamp = Date.now() + (expires_in * 1000);

        // Read current .env file
        const envPath = path.join(__dirname, '..', '.env');
        let envContent = '';

        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        // Update or add Paraşüt tokens
        const tokenLines = [
            `PARASUT_ACCESS_TOKEN=${access_token}`,
            `PARASUT_REFRESH_TOKEN=${refresh_token}`,
            `PARASUT_TOKEN_EXPIRY=${expiryTimestamp}`
        ];

        // Remove existing Paraşüt token lines
        const lines = envContent.split('\n').filter(line =>
            !line.startsWith('PARASUT_ACCESS_TOKEN=') &&
            !line.startsWith('PARASUT_REFRESH_TOKEN=') &&
            !line.startsWith('PARASUT_TOKEN_EXPIRY=')
        );

        // Add new token lines
        const newEnvContent = [...lines, ...tokenLines].join('\n');

        // Write back to .env file
        fs.writeFileSync(envPath, newEnvContent);

        console.log('✅ Tokens saved to .env file!');
        console.log('');
        console.log('🎉 Paraşüt OAuth setup complete!');
        console.log('You can now use the Paraşüt integration.');
        console.log('');
        console.log('💡 The access token will expire in', Math.floor(expires_in / 3600), 'hours.');
        console.log('The system will automatically refresh it using the refresh token.');

    } catch (error) {
        console.error('❌ Failed to setup Paraşüt OAuth:');

        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }

        console.log('');
        console.log('💡 Common issues:');
        console.log('- Authorization code might be expired (they expire quickly)');
        console.log('- Authorization code might be incorrect');
        console.log('- Network connectivity issues');
        console.log('');
        console.log('Please try getting a new authorization code from:');
        console.log(`https://api.parasut.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code`);

        process.exit(1);
    }
}

setupParasutAuth();
