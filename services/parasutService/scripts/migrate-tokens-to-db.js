import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Token from '../../../models/parasutTokens.Model.js';

// Load environment variables
dotenv.config();

// Verify MongoDB URI is loaded
const mongoUri = process.env.MONGODB_URI || process.env.DATABASE;
if (!mongoUri) {
    console.error('❌ MongoDB connection string not found in environment variables');
    console.error('   Please check your .env file for MONGODB_URI or DATABASE');
    process.exit(1);
}

/**
 * Migrate existing Paraşüt tokens from environment variables to database
 */
async function migrateTokensToDatabase() {
    try {
        console.log('🚀 Starting token migration to database...');
        console.log('📍 MongoDB URI:', mongoUri.substring(0, 50) + '...');

        // Connect to MongoDB
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Check if tokens exist in environment
        const accessToken = process.env.PARASUT_ACCESS_TOKEN;
        const refreshToken = process.env.PARASUT_REFRESH_TOKEN;
        const tokenExpiry = process.env.PARASUT_TOKEN_EXPIRY;
        const companyId = process.env.PARASUT_COMPANY_ID;

        if (!accessToken || !refreshToken || !tokenExpiry) {
            console.log('⚠️ No Paraşüt tokens found in environment variables');
            console.log('   This is normal if tokens are already in database or not yet configured');
            return;
        }

        // Check if tokens already exist in database
        const existingToken = await Token.findOne({ service: 'parasut' });
        if (existingToken) {
            console.log('ℹ️ Paraşüt tokens already exist in database');
            console.log('   Existing token expires:', existingToken.tokenExpiry);

            // Check if environment tokens are newer
            const envExpiry = new Date(parseInt(tokenExpiry));
            if (envExpiry > existingToken.tokenExpiry) {
                console.log('🔄 Environment tokens are newer, updating database...');
                await Token.saveToken('parasut', {
                    accessToken,
                    refreshToken,
                    tokenExpiry: parseInt(tokenExpiry),
                    companyId,
                    metadata: {
                        migratedFrom: 'environment',
                        migrationDate: new Date()
                    }
                });
                console.log('✅ Database tokens updated with newer environment tokens');
            } else {
                console.log('✅ Database tokens are up to date');
            }
            return;
        }

        // Save tokens to database
        const savedToken = await Token.saveToken('parasut', {
            accessToken,
            refreshToken,
            tokenExpiry: parseInt(tokenExpiry),
            companyId,
            metadata: {
                migratedFrom: 'environment',
                migrationDate: new Date()
            }
        });

        console.log('✅ Paraşüt tokens successfully migrated to database');
        console.log('   Token ID:', savedToken._id);
        console.log('   Expires:', savedToken.tokenExpiry);
        console.log('   Company ID:', savedToken.companyId);

    } catch (error) {
        console.error('❌ Token migration failed:', error.message);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateTokensToDatabase()
        .then(() => {
            console.log('🎉 Token migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Token migration failed:', error.message);
            process.exit(1);
        });
}

export default migrateTokensToDatabase;
