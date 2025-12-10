import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Token from '../../../models/parasutTokens.Model.js';

// Load environment variables
dotenv.config();

async function saveParasutTokensToDatabase() {
    console.log('🔐 Saving Paraşüt Tokens to Database');
    console.log('='.repeat(50));

    // Get tokens from environment variables
    const accessToken = process.env.PARASUT_ACCESS_TOKEN;
    const refreshToken = process.env.PARASUT_REFRESH_TOKEN;
    const tokenExpiry = process.env.PARASUT_TOKEN_EXPIRY;
    const companyId = process.env.PARASUT_COMPANY_ID;

    // Validate required tokens
    if (!accessToken || !refreshToken) {
        console.error('❌ Missing required tokens in .env file');
        console.log('Please ensure these are set in your .env file:');
        console.log('- PARASUT_ACCESS_TOKEN');
        console.log('- PARASUT_REFRESH_TOKEN');
        console.log('- PARASUT_TOKEN_EXPIRY (optional)');
        process.exit(1);
    }

    console.log('✅ Found tokens in environment:');
    console.log(`   Access Token: ${accessToken.substring(0, 10)}...`);
    console.log(`   Refresh Token: ${refreshToken.substring(0, 10)}...`);
    console.log(`   Token Expiry: ${tokenExpiry || 'Not set'}`);
    console.log(`   Company ID: ${companyId}`);

    // Connect to MongoDB
    const mongoUri = process.env.DATABASE || process.env.DATABASE_LOCAL;
    if (!mongoUri) {
        console.error('❌ MongoDB connection string not found');
        console.log('Please set DATABASE or DATABASE_LOCAL in your .env file');
        process.exit(1);
    }

    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB successfully');

        // Calculate expiry timestamp if not provided
        let expiryTimestamp;
        if (tokenExpiry) {
            expiryTimestamp = parseInt(tokenExpiry);
        } else {
            // Default to 2 hours from now if not specified
            expiryTimestamp = Date.now() + (2 * 60 * 60 * 1000);
            console.log('⚠️ No expiry time found, setting to 2 hours from now');
        }

        // Save tokens to database
        console.log('💾 Saving tokens to database...');

        await Token.saveToken('parasut', {
            accessToken: accessToken,
            refreshToken: refreshToken,
            tokenExpiry: expiryTimestamp,
            companyId: companyId,
            metadata: {
                lastUpdated: new Date(),
                source: 'manual_script',
                environment: process.env.NODE_ENV || 'development'
            }
        });

        console.log('✅ Tokens saved to database successfully!');
        console.log('');
        console.log('📊 Token Details:');
        console.log(`   Service: parasut`);
        console.log(`   Access Token: ${accessToken.substring(0, 15)}...`);
        console.log(`   Refresh Token: ${refreshToken.substring(0, 15)}...`);
        console.log(`   Expires At: ${new Date(expiryTimestamp).toISOString()}`);
        console.log(`   Company ID: ${companyId}`);
        console.log(`   Time Until Expiry: ${Math.round((expiryTimestamp - Date.now()) / 1000)} seconds`);

        // Verify the save by reading back
        console.log('');
        console.log('🔍 Verifying saved tokens...');
        const savedToken = await Token.findOne({ service: 'parasut' });

        if (savedToken) {
            console.log('✅ Verification successful!');
            console.log(`   Token ID: ${savedToken._id}`);
            console.log(`   Service: ${savedToken.service}`);
            console.log(`   Is Expired: ${savedToken.isExpired()}`);
            console.log(`   Created At: ${savedToken.createdAt}`);
            console.log(`   Updated At: ${savedToken.updatedAt}`);
        } else {
            console.log('❌ Verification failed - token not found in database');
        }

    } catch (error) {
        console.error('❌ Failed to save tokens to database:');
        console.error('Error:', error.message);

        if (error.name === 'MongooseError') {
            console.log('💡 MongoDB connection issues:');
            console.log('- Check if MongoDB is running');
            console.log('- Verify DATABASE connection string in .env');
            console.log('- Ensure network connectivity');
        }

        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the script
saveParasutTokensToDatabase();
