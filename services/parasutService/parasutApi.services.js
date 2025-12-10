import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendEmail } from '../email.js';
import Token from '../../models/parasutTokens.Model.js';
import { title } from 'process';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ParasutApiService {
    constructor() {
        // Official Paraşüt API endpoints
        this.baseURL = process.env.PARASUT_API_BASE_URL;
        this.testURL = process.env.PARASUT_TEST_URL;
        this.oauthBaseURL = process.env.PARASUT_OAUTH_BASE_URL;

        // OAuth 2.0 credentials for Paraşüt
        this.clientId = process.env.PARASUT_CLIENT_ID;
        this.clientSecret = process.env.PARASUT_CLIENT_SECRET;
        this.companyId = process.env.PARASUT_COMPANY_ID;
        this.redirectUri = process.env.PARASUT_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob';

        // Disable Paraşüt integration if credentials are not working
        this.isEnabled = process.env.PARASUT_ENABLED !== 'false';

        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;

        // Load stored tokens (async - will be called when needed)
        this.tokensLoaded = false;
        this.backgroundRefreshInterval = null;

        // 🚀 Start background token refresh every 50 minutes
        if (this.isEnabled) {
            this.startBackgroundTokenRefresh();
        }

        // Company information for invoice creation
        this.companyInfo = {
            tradeTitle: "Uzmanlio Information Technologies Marketing and Trading Inc.",
            customerNo: "469071",
            documentType: "Invoice",
            sector: "Software/Technology",
            fullAddress: "Maslak Square Street Beybi Giz Plaza A Block 1 / 55 Maslak Neighborhood Sariyer Istanbul 34398 Maslak Neighborhood Sariyer, ISTANBUL",
            taxInfo: "VD Maslak VD V.NO. 9010533932",
            centralRegistryNumber: "0901 0533 9322 0001",
            tradeRegistryNumber: "393468-5"
        };

        // Product cache for storing product IDs by parasutKey
        this.productCache = new Map();
    }

    /**
     * Save tokens to database
     */
    async saveTokensToDatabase() {
        try {
            if (!this.accessToken || !this.refreshToken || !this.tokenExpiry) {
                console.log('⚠️ Cannot save tokens - missing token data');
                return;
            }

            await Token.saveToken('parasut', {
                accessToken: this.accessToken,
                refreshToken: this.refreshToken,
                tokenExpiry: this.tokenExpiry,
                companyId: this.companyId,
                metadata: {
                    lastUpdated: new Date(),
                    source: 'parasut_api_service'
                }
            });

            console.log('✅ Tokens saved to database successfully');
        } catch (error) {
            console.error('❌ Failed to save tokens to database:', error.message);
        }
    }

    /**
     * Get authorization URL for Paraşüt OAuth 2.0 Authorization Code Grant
     */
    getAuthorizationUrl() {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: 'read+write',
            company_id: this.companyId
        });
        return `${this.oauthBaseURL}/oauth/authorize?${params.toString()}`;
    }

    /**
     * Check if we have a valid access token
     */
    hasValidToken() {
        return this.accessToken && this.refreshToken && this.tokenExpiry && Date.now() < this.tokenExpiry;
    }

    /**
     * Clear tokens from memory only (keep database tokens for recovery)
     */
    clearMemoryTokens() {
        console.log('🧹 Clearing Paraşüt tokens from memory...');
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.tokensLoaded = false;
        console.log('✅ Memory tokens cleared (database tokens preserved)');
    }

    /**
     * Clear all stored tokens (memory, environment, and database)
     */
    async clearAllTokens() {
        console.log('🧹 Clearing ALL Paraşüt tokens...');
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.tokensLoaded = false;
        try {
            await Token.deleteOneAndDelete({ service: 'parasut' });
            console.log('✅ Tokens cleared from database');
        } catch (error) {
            console.error('❌ Failed to clear tokens from database:', error.message);
        }

        console.log('✅ All tokens cleared');
    }

    /**
     * Load stored tokens from database (fallback to environment variables)
     */
    async loadStoredTokens() {
        try {
            const tokenDoc = await Token.findOne({ service: 'parasut' });

            if (tokenDoc) {
                this.accessToken = tokenDoc.accessToken;
                this.refreshToken = tokenDoc.refreshToken;
                this.tokenExpiry = tokenDoc.tokenExpiry.getTime();

                if (tokenDoc.isExpired()) {
                    console.log('⚠️ Database token is expired, will be refreshed by ensureValidToken');
                }
                return;
            }

            if (process.env.PARASUT_ACCESS_TOKEN && process.env.PARASUT_TOKEN_EXPIRY) {
                const expiry = parseInt(process.env.PARASUT_TOKEN_EXPIRY);
                if (Date.now() < expiry) {
                    this.accessToken = process.env.PARASUT_ACCESS_TOKEN;
                    this.refreshToken = process.env.PARASUT_REFRESH_TOKEN;
                    this.tokenExpiry = expiry;
                    console.log('✅ Loaded stored Paraşüt tokens from environment (fallback)');
                    console.log(`   Token preview: ${this.accessToken.substring(0, 10)}...`);
                    console.log(`   Expires: ${new Date(this.tokenExpiry).toISOString()}`);

                    await this.saveTokensToDatabase();
                } else {
                    console.log('❌ Stored tokens are expired, attempting to refresh...');
                    this.accessToken = process.env.PARASUT_ACCESS_TOKEN;
                    this.refreshToken = process.env.PARASUT_REFRESH_TOKEN;
                    this.tokenExpiry = expiry;

                    if (this.refreshToken) {
                        try {
                            await this.refreshAccessToken();
                            console.log('✅ Token refreshed successfully in loadStoredTokens');
                        } catch (err) {
                            console.log('❌ Failed to refresh token in loadStoredTokens:', err.message);
                            console.log('⚠️ Keeping tokens in database for manual refresh');
                            this.accessToken = null;
                            this.refreshToken = null;
                            this.tokenExpiry = null;
                        }
                    } else {
                        this.clearMemoryTokens();
                    }
                }
            } else {
                console.log('❌ No stored tokens found in database or environment');
            }
        } catch (error) {
            console.error('❌ Error loading tokens from database:', error.message);
            if (process.env.PARASUT_ACCESS_TOKEN && process.env.PARASUT_TOKEN_EXPIRY) {
                const expiry = parseInt(process.env.PARASUT_TOKEN_EXPIRY);
                this.accessToken = process.env.PARASUT_ACCESS_TOKEN;
                this.refreshToken = process.env.PARASUT_REFRESH_TOKEN;
                this.tokenExpiry = expiry;
                console.log('✅ Loaded tokens from environment (database error fallback)');
            }
        }
    }

    /**
     * Store tokens in memory and environment variables
     */
    storeTokens(tokenData) {
        if (!tokenData || !tokenData.access_token) {
            console.error('❌ Invalid token data received:', tokenData);
            throw new Error('Invalid token data received from Paraşüt API');
        }

        this.accessToken = tokenData.access_token;
        if (tokenData.refresh_token) {
            this.refreshToken = tokenData.refresh_token;
        }
        this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

        process.env.PARASUT_ACCESS_TOKEN = this.accessToken;
        if (this.refreshToken) {
            process.env.PARASUT_REFRESH_TOKEN = this.refreshToken;
        }
        process.env.PARASUT_TOKEN_EXPIRY = this.tokenExpiry.toString();

        console.log('✅ Tokens updated in memory and environment');
        console.log(`   Access token: ${this.accessToken.substring(0, 10)}...`);
        console.log(`   Refresh token: ${this.refreshToken ? this.refreshToken.substring(0, 10) + '...' : 'unchanged'}`);
        console.log(`   Expires: ${new Date(this.tokenExpiry).toISOString()}`);
    }

    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(authorizationCode) {
        try {
            const formData = new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code: authorizationCode,
                grant_type: 'authorization_code',
                redirect_uri: this.redirectUri
            });

            const tokenUrl = `${this.oauthBaseURL}/oauth/token`;
            console.log(`🔗 Using OAuth token endpoint: ${tokenUrl}`);

            const response = await axios.post(tokenUrl, formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            });

            this.storeTokens(response.data);

            // Save tokens to database
            await this.saveTokensToDatabase();
            console.log('✅ Paraşüt API token exchange successful - tokens saved to database');

            return response.data;
        } catch (error) {
            console.error('❌ Token exchange failed:', error.response?.data?.error_description || error.message);
            throw new Error(`Failed to exchange code for token: ${error.response?.data?.error_description || error.message}`);
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken() {
        try {
            console.log('🚀 Refreshing Paraşüt access token...');
            const formData = new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: this.refreshToken,
                grant_type: 'refresh_token'
            });

            const tokenUrl = `${this.oauthBaseURL}/oauth/token`;
            console.log(`🔗 Using OAuth token endpoint: ${tokenUrl}`);

            const response = await axios.post(tokenUrl, formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            });

            this.storeTokens(response.data);
            console.log('✅ Token refreshed successfully');
            const { access_token, refresh_token, expires_in } = response.data;

            const expiryTimestamp = Date.now() + (expires_in * 1000);
            await this.saveTokensToDatabase();

            try {
                const envPath = path.join(__dirname, '..', '.env');
                if (fs.existsSync(envPath)) {
                    let envContent = fs.readFileSync(envPath, 'utf8');
                    const tokenLines = [
                        `PARASUT_ACCESS_TOKEN=${access_token}`,
                        `PARASUT_REFRESH_TOKEN=${refresh_token}`,
                        `PARASUT_TOKEN_EXPIRY=${expiryTimestamp}`
                    ];
                    const lines = envContent.split('\n').filter(line =>
                        !line.startsWith('PARASUT_ACCESS_TOKEN=') &&
                        !line.startsWith('PARASUT_REFRESH_TOKEN=') &&
                        !line.startsWith('PARASUT_TOKEN_EXPIRY=')
                    );
                    const newEnvContent = [...lines, ...tokenLines].join('\n');
                    fs.writeFileSync(envPath, newEnvContent);
                    console.log('✅ Tokens updated in .env file');
                }
            } catch (envError) {
                console.log('⚠️ Could not update .env file:', envError.message);
            }

            return response.data;
        } catch (error) {
            console.error('❌ Token refresh failed:', error.response || error.message);
            if (error.response?.status === 401 || error.response?.data?.error === 'invalid_grant') {
                console.log('🔄 Invalid refresh token, clearing memory tokens...');
                this.clearMemoryTokens();
                throw new Error('Refresh token invalid. Please re-authenticate: ' + this.getAuthorizationUrl());
            }
            throw error;
        }
    }

    /**
     * Ensure a valid token is available
     */
    async ensureValidToken() {
        console.log('🔄 Loading latest tokens from database...');
        await this.loadStoredTokens();
        this.tokensLoaded = true;

        if (!this.accessToken || !this.tokenExpiry) {
            throw new Error(`No valid access token. Please authenticate: ${this.getAuthorizationUrl()}`);
        }

        const timeUntilExpiry = this.tokenExpiry - Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        console.log(`🕐 Token expires in ${Math.round(timeUntilExpiry / 1000)} seconds`);

        if (timeUntilExpiry <= fiveMinutes) {
            console.log('🔄 Token expired or expiring soon, refreshing...');
            try {
                await this.refreshAccessToken();
                console.log('✅ Token refreshed successfully');
            } catch (error) {
                console.error('❌ Token refresh failed:', error.message);
                this.clearMemoryTokens();
                throw new Error(`Token refresh failed. Please re-authenticate: ${this.getAuthorizationUrl()}`);
            }
        } else {
            console.log('✅ Access token is valid');
        }
    }

    /**
     * Make authenticated API request without token validation (for optimized workflows)
     */
    async makeRequestWithoutTokenCheck(method, endpoint, data = null, retryCount = 0) {
        // 🚀 OPTIMIZATION: No token validation - just use existing token
        if (!this.accessToken) {
            throw new Error('No access token available. Load tokens first at workflow start.');
        }

        const maxRetries = 3;
        const baseUrl = process.env.PARASUT_API_BASE_URL;
        const companyId = process.env.PARASUT_COMPANY_ID;
        const url = `${baseUrl}/${companyId}${endpoint}`;

        const config = {
            method,
            url,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        try {
            const response = await axios(config);
            console.log(`✅ ${method} ${endpoint} - Status: ${response.status}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 401 && retryCount === 0) {
                // 🚀 ONLY reload tokens on 401 authorization error
                console.log('🔄 Authorization error detected, reloading tokens from database...');
                await this.loadStoredTokens();

                // Check if token needs refresh
                const timeUntilExpiry = this.tokenExpiry - Date.now();
                const fiveMinutes = 5 * 60 * 1000;

                if (timeUntilExpiry <= fiveMinutes) {
                    console.log('🔄 Token expired, refreshing...');
                    await this.refreshAccessToken();
                }

                console.log('✅ Tokens reloaded, retrying request...');
                return this.makeRequestWithoutTokenCheck(method, endpoint, data, 1); // Retry once
            }

            if (error.response?.status === 429 && retryCount < maxRetries) {
                const delay = Math.pow(3, retryCount) * 1000;
                console.log(`⚠️ 429 Too Many Requests. Retrying after ${delay / 1000} seconds... (Attempt ${retryCount + 1})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.makeRequestWithoutTokenCheck(method, endpoint, data, retryCount + 1);
            }

            console.error(`❌ ${method} ${endpoint} - Status: ${error.response?.status} - ${error.response?.statusText}`);
            throw error;
        }
    }

    /**
     * Make authenticated API request (with retry on 429)
     */
    async makeRequest(method, endpoint, data = null, retryCount = 0) {
        await this.ensureValidToken();

        if (!this.companyId) {
            throw new Error('Company ID not configured. Please set PARASUT_COMPANY_ID.');
        }

        const config = {
            method,
            url: `${this.baseURL}/${this.companyId}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 60000
        };

        if (data) {
            config.data = data;
        }

        try {
            const response = await axios(config);
            if (endpoint.includes('/contacts') || endpoint.includes('/products') || endpoint.includes('/sales_invoices') || endpoint.includes('/e_invoice') || endpoint.includes('/e_archive')) {
                console.log(`✅ ${method} ${endpoint} - Status: ${response.status}`);
            }
            return response.data;
        } catch (error) {
            if (error.code === 'ECONNABORTED' && retryCount < 3) {
                const delay = 3000 * (retryCount + 1);
                console.warn(`⚠️ Request timeout. Retrying after ${delay / 1000} seconds... (Attempt ${retryCount + 1})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.makeRequest(method, endpoint, data, retryCount + 1);
            }

            if ((error.code === 'ENOTFOUND' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') && retryCount < 3) {
                const delay = 5000 * (retryCount + 1);
                console.warn(`⚠️ Network error (${error.code}). Retrying after ${delay / 1000} seconds... (Attempt ${retryCount + 1})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.makeRequest(method, endpoint, data, retryCount + 1);
            }

            if (error.response && error.response.status === 401 && retryCount === 0) {
                console.warn('⚠️ 401 Unauthorized - Token is invalid, forcing refresh...');
                try {
                    console.log('🔄 Forcing token refresh due to 401 error...');
                    await this.refreshAccessToken();
                    console.log('✅ Token force-refreshed successfully');
                    return this.makeRequest(method, endpoint, data, retryCount + 1);
                } catch (refreshError) {
                    console.error('❌ Token refresh failed during 401 retry:', refreshError.message);
                    throw new Error(`Authentication failed. Please re-authenticate: ${this.getAuthorizationUrl()}`);
                }
            }

            if (error.response && error.response.status === 429 && retryCount < 3) {
                const delay = 2000 * (retryCount + 1);
                console.warn(`⚠️ 429 Too Many Requests. Retrying after ${delay / 1000} seconds... (Attempt ${retryCount + 1})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.makeRequest(method, endpoint, data, retryCount + 1);
            }

            if (error.response && [500, 502, 503, 504].includes(error.response.status) && retryCount < 2) {
                const delay = 4000 * (retryCount + 1);
                console.warn(`⚠️ Server error (${error.response.status}). Retrying after ${delay / 1000} seconds... (Attempt ${retryCount + 1})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.makeRequest(method, endpoint, data, retryCount + 1);
            }

            console.log(`❌ ${method} ${endpoint} - Status: ${error.response?.status} - ${error.response?.statusText || error.message}`);
            throw error;
        }
    }


    /**
     * Check if contact needs updating by comparing key fields
     */
    contactNeedsUpdate(existingContact, newCustomerInfo) {
        const existing = existingContact.attributes;
        const fieldsToCheck = [
            'name', 'phone', 'address',
            'tax_number', 'tax_office', 'city', 'district'
        ]; // Removed 'email' - don't update email addresses

        for (const field of fieldsToCheck) {
            const existingValue = existing[field] || '';
            let newValue = '';

            switch (field) {
                case 'name':
                    newValue = newCustomerInfo.companyName || newCustomerInfo.fullName || '';
                    break;
                case 'phone':
                    newValue = newCustomerInfo.phoneNumber || '';
                    break;
                case 'tax_number':
                    newValue = newCustomerInfo.taxNumber || '';
                    break;
                case 'tax_office':
                    newValue = newCustomerInfo.taxOffice || '';
                    break;
                default:
                    newValue = newCustomerInfo[field] || '';
            }

            if (existingValue.trim() !== newValue.trim()) {
                console.log(`📝 Field '${field}' changed: '${existingValue}' → '${newValue}'`);
                return true;
            }
        }

        return false;
    }


    /**
     * Check if customer is e-Invoice user
     */

    async checkEInvoiceUserWorkflow(contactId) {
        try {
            const contact = await this.makeRequestWithoutTokenCheck('GET', `/contacts/${contactId}`);
            const taxNumber = contact.data.attributes?.tax_number;

            if (!taxNumber || !/^\d{10}$/.test(taxNumber)) {
                return { isEInvoiceUser: false, eInvoiceAddress: null };
            }

            const inboxes = await this.makeRequestWithoutTokenCheck('GET', `/e_invoice_inboxes?filter[vkn]=${taxNumber}`);
            if (inboxes?.data?.length) {
                const eInvoiceAddress = inboxes.data[0].attributes.e_invoice_address;
                if (eInvoiceAddress) {
                    return { isEInvoiceUser: true, eInvoiceAddress };
                }
            }
            return { isEInvoiceUser: false, eInvoiceAddress: null };
        } catch (error) {
            console.error('❌ e-Invoice check failed (workflow):', error.message);
            return { isEInvoiceUser: false, eInvoiceAddress: null };
        }
    }

    /**
     * Create e-Invoice
     */

    async createEInvoiceWorkflow(invoiceId, userEmail = null, advancedFields = {}) {
        try {
            const attributes = {
                scenario: 'basic',
                to: 'default',
                ...advancedFields,
                vat_withholding_params: [],
                vat_exemption_reason_code: null,
                vat_exemption_reason: null,
                excise_duty_codes: []
            };

            const eInvoiceData = {
                data: {
                    type: 'e_invoices',
                    attributes: attributes,
                    relationships: {
                        invoice: {
                            data: {
                                type: 'sales_invoices',
                                id: invoiceId.toString()
                            }
                        }
                    }
                }
            };

            console.log('📤 e-Invoice payload:', JSON.stringify(eInvoiceData, null, 2));
            const response = await this.makeRequestWithoutTokenCheck('POST', '/e_invoices', eInvoiceData);
            const jobId = response.data.id;
            console.log('✅ e-Invoice job started, ID:', jobId);
            await this.waitForJobCompletionWorkflow(jobId, 'e_invoices');
            console.log('✅ e-Invoice created, ID:', jobId);
            return jobId;
        } catch (error) {
            console.error('❌ e-Invoice creation failed (workflow):', error.message);
            throw error;
        }
    }


    /**
     * Create complete invoice workflow (OPTIMIZED)
     * @param {Object} customerInfo - Customer information from form
     * @param {Object} order - Order details
     * @param {Object} paymentInfo - Payment information
     * @param {string} description - Invoice description
     * @param {string} userAccountEmail - User's account email from database (NOT form email)
     */
    async createCompleteInvoiceWorkflow(customerInfo, order, paymentInfo, description, userAccountEmail = null) {
        try {
            if (!this.isEnabled) {
                return { status: 'disabled', message: 'Paraşüt integration is disabled' };
            }

            // 🚀 OPTIMIZATION: Load tokens ONLY ONCE at workflow start
            console.log('🔄 Loading tokens once for entire workflow...');
            await this.loadStoredTokens();

            // Basic validation - no expiry check
            if (!this.accessToken) {
                throw new Error(`No access token found. Please authenticate: ${this.getAuthorizationUrl()}`);
            }

            console.log('✅ Tokens loaded for workflow - no validation, will handle 401 errors if they occur');

            await this.makeRequestWithoutTokenCheck('GET', '/contacts?page[size]=1');

            // 🚀 OPTIMIZATION 1: Single contact check/creation with smart updates
            const contactId = await this.createOrFindContactOptimizedWorkflow(customerInfo, userAccountEmail);

            const invoiceItems = await this.prepareInvoiceItemsWorkflow(order);

            // 🚀 OPTIMIZATION 2: Create invoice without duplicate contact check
            const invoice = await this.createSalesInvoiceWithoutPaymentOptimizedWorkflow(contactId, {
                description,
                orderNo: order._id.toString(),
                items: invoiceItems,
                customerInfo: customerInfo // Pass customer info for addresses
            });

            const invoiceId = invoice.id;
            console.log('✅ Invoice created:', invoice);

            // 🚀 OPTIMIZATION 3: Add payment using existing invoice data
            if (paymentInfo && paymentInfo.isSuccessful) {
                try {
                    await this.addPaymentCollectionOptimizedWorkflow(
                        invoice, // Pass full invoice object instead of just ID
                        order._id.toString(),
                        paymentInfo.amount || order.totalPriceForCustomer
                    );
                    console.log('✅ Payment added');
                } catch (paymentError) {
                    console.error('❌ Payment failed:', paymentError.message);
                }
            }

            await this.formalizeInvoiceWorkflow(invoiceId, contactId, customerInfo, userAccountEmail);

            // 🚀 OPTIMIZATION 4: Create sharing link - send to USER'S ACCOUNT EMAIL (not form email)
            const emailForSharing = userAccountEmail || customerInfo.email; // Fallback to form email if account email not provided
            console.log(`📧 Using email for invoice sharing: ${emailForSharing} (Account email: ${userAccountEmail}, Form email: ${customerInfo.email})`);

            try {
                await this.createPublicSharingLinkOptimizedWorkflow(invoiceId, emailForSharing);
                console.log('✅ Invoice sharing enabled (optimized) - sent to account email');
            } catch (error) {
                console.log('⚠️ Optimized sharing failed, trying legacy method:', error.message);
                try {
                    await this.createPublicSharingLinkWorkflow(invoiceId, emailForSharing);
                    console.log('✅ Invoice sharing enabled (legacy fallback) - sent to account email');
                } catch (legacyError) {
                    console.log('⚠️ All sharing methods failed:', legacyError.message);
                }
            }

            let finalInvoice = invoice;
            try {
                console.log('📋 Fetching final invoice details...');
                const finalInvoiceResponse = await this.makeRequest('GET', `/sales_invoices/${invoiceId}?include=contact,details.product,payments,payments.transaction`);
                finalInvoice = finalInvoiceResponse.data;
                console.log('✅ Final invoice details fetched:');
            } catch (fetchError) {
                console.error('❌ Failed to fetch final invoice details:', fetchError.message);
            }

            console.log('🎉 Invoice workflow completed!');

            return {
                invoiceId,
                invoiceNumber: finalInvoice.attributes?.invoice_no || 'N/A',
                contactId,
                totalAmount: order.totalPriceForCustomer,
                status: 'completed',
                invoiceDetails: finalInvoice
            };
        } catch (error) {
            console.error('❌ Invoice workflow failed:', error.message);
            throw error;
        }
    }


    /**
     * Prepare invoice items from order data
     */
    async prepareInvoiceItems(order) {
        console.log('Invoice items for order To setup the Order:', order);
        // const { default: AdditionalServiceModel } = await import('../models/admin/adminAdditionalService.model.js');
        // const additionalService = await AdditionalServiceModel.findOne({});
        // if (!additionalService) {
        //     throw new Error('Additional service configuration not found');
        // }

        const invoiceItems = [];

        if (order.totalPriceForExpert && order.noOfUsers) {
            console.log('💰 Using totalPriceForCustomer:', order.totalPriceForCustomer);
            console.log('   noOfUgc:', order.noOfUgc);

            invoiceItems.push({
                description: description,
                quantity: 1,
                unitPrice: order.totalPriceForExpert,
                vatRate: 0,
                parasutProductId: null
            });

            console.log('✅ Using single invoice item to match totalPriceForCustomer');
            return invoiceItems;
        } else if (order.totalPriceForExpert && order.noOfUsers) {
            console.log('⚠️ Fallback: Using totalPriceForExpert for invoice');
            invoiceItems.push({
                description: description,
                quantity: order.noOfUsers,
                unitPrice: order.totalPriceForExpert / order.noOfUsers,
                vatRate: 18,
                parasutProductId: null
            });
        }



        console.log('📋 Invoice items prepared:', JSON.stringify(invoiceItems, null, 2));
        return invoiceItems;
    }

    // ========================================
    // WORKFLOW-OPTIMIZED METHODS (No token checks)
    // ========================================

    async createOrFindContactOptimizedWorkflow(customerInfo) {
        try {
            // Verify company access
            await this.makeRequestWithoutTokenCheck('GET', '/contacts?page[size]=1');
            console.log('✅ Company access verified');

            let existingContacts = [];

            // Try finding by email first
            // if (customerInfo.email) {
            //     existingContacts = await this.makeRequestWithoutTokenCheck(
            //         'GET',
            //         `/contacts?filter[email]=${encodeURIComponent(customerInfo.email)}`
            //     );
            // }

            // If no contact found by email, try by TCKN
            if (customerInfo.taxNumber) {
                existingContacts = await this.makeRequestWithoutTokenCheck(
                    'GET',
                    `/contacts?filter[tax_number]=${encodeURIComponent(customerInfo.taxNumber)}`
                );
            }

            // If found, update or return existing
            if (existingContacts.data && existingContacts.data.length > 0) {
                const existingContact = existingContacts.data[0];
                console.log('✅ Found existing contact:', existingContact.id);

                const needsUpdate = this.contactNeedsUpdate(existingContact, customerInfo);

                if (needsUpdate) {
                    console.log('📝 Contact data changed, updating...');
                    await this.updateContactWorkflow(existingContact.id, customerInfo);
                    console.log('✅ Contact updated');
                } else {
                    console.log('✅ Contact data unchanged, skipping update');
                }

                return existingContact.id;
            }

            // Otherwise, create new contact
            console.log('👤 Creating new contact...');
            const newContact = await this.createContactWorkflow(customerInfo);
            console.log('✅ New contact created:', newContact.id);
            return newContact.id;

        } catch (error) {
            console.error('❌ Optimized contact creation/finding failed:', error.message);
            throw error;
        }
    }

    async prepareInvoiceItemsWorkflow(order) {
        return await this.prepareInvoiceItems(order); // No API calls, just data preparation
    }

    async createSalesInvoiceWithoutPaymentOptimizedWorkflow(contactId, invoiceDetails) {
        // Use makeRequestWithoutTokenCheck instead of makeRequest
        try {
            const detailsData = [];
            for (const item of invoiceDetails.items) {
                let productId = item.parasutProductId;
                if (productId) {
                    try {
                        await this.getItemWorkflow(productId);
                        console.log('✅ Using existing product:', productId);
                    } catch (error) {
                        console.log('⚠️ Product ID invalid, creating a new product:', error.message);
                        productId = null;
                    }
                }
                if (!productId) {
                    productId = await this.createItemWorkflow({
                        title: item.description,
                        finalPrice: item.unitPrice
                    });
                }
                if (item.unitPrice <= 0 || isNaN(item.unitPrice)) {
                    throw new Error(`Invalid unit price for item: ${item.description}, unitPrice: ${item.unitPrice}`);
                }
                detailsData.push({
                    type: 'sales_invoice_details',
                    attributes: {
                        quantity: item.quantity || 1,
                        unit_price: (item.unitPrice / 1.20),
                        vat_rate: 20,
                        discount_type: 'percentage',
                        discount: item.discount || 0,
                        description: item.description
                    },
                    relationships: {
                        product: {
                            data: { type: 'products', id: productId }
                        }
                    }
                });
            }

            const orderDate = invoiceDetails.orderDate || new Date().toISOString().split('T')[0];
            const invoiceData = {
                data: {
                    type: 'sales_invoices',
                    attributes: {
                        item_type: 'invoice',
                        description: invoiceDetails.description || 'Video İçerik',
                        issue_date: invoiceDetails.issueDate || new Date().toISOString().split('T')[0],
                        due_date: invoiceDetails.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        invoice_series: invoiceDetails.invoiceSeries || '',
                        exchange_rate: 1,
                        withholding_rate: 0,
                        vat_withholding_rate: 0,
                        invoice_discount_type: 'percentage',
                        invoice_discount: 0,
                        billing_address: invoiceDetails.customerInfo?.address || "",
                        billing_phone: invoiceDetails.customerInfo?.phoneNumber || "",
                        billing_fax: "",
                        tax_office: invoiceDetails.customerInfo?.taxOffice || "",
                        tax_number: invoiceDetails.customerInfo?.taxNumber || "",
                        order_no: invoiceDetails.orderNo || undefined,
                        order_date: orderDate
                    },
                    relationships: {
                        contact: {
                            data: { type: 'contacts', id: contactId }
                        },
                        details: {
                            data: detailsData
                        }
                    }
                }
            };

            if (!detailsData.length) {
                throw new Error('Invoice must have at least one detail item.');
            }

            const result = await this.makeRequestWithoutTokenCheck('POST', '/sales_invoices', invoiceData);
            console.log('✅ Sales invoice created (workflow optimized):');
            return result.data;

        } catch (error) {
            console.error('❌ Workflow optimized sales invoice creation failed:', error.message);
            if (error.response?.data) {
                console.error('API Error Details:', JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }

    async addPaymentCollectionOptimizedWorkflow(invoiceObject, orderId, amount) {
        try {
            const accountId = process.env.PARASUT_PAYMENT_ACCOUNT_ID || await this.getDefaultAccountWorkflow();

            const remaining = parseFloat(invoiceObject.attributes.remaining || invoiceObject.attributes.net_total || amount);
            const paymentStatus = invoiceObject.attributes.payment_status || 'unpaid';
            const invoiceId = invoiceObject.id;

            if (paymentStatus === 'paid' || remaining <= 0) {
                console.log('✅ Invoice already paid or no remaining amount');
                return { status: 'already_paid', invoiceId };
            }

            const paymentAmount = Math.min(amount, remaining);
            const paymentData = {
                data: {
                    type: 'payments',
                    attributes: {
                        account_id: parseInt(accountId, 10),
                        date: new Date().toISOString().split('T')[0],
                        amount: parseFloat(paymentAmount),
                        exchange_rate: 1,
                        description: `Payment for Order: ${orderId}`
                    }
                }
            };

            const result = await this.makeRequestWithoutTokenCheck('POST', `/sales_invoices/${invoiceId}/payments`, paymentData);
            console.log('✅ Payment collection added (workflow optimized):', result.data);
            return result.data;

        } catch (error) {
            console.error('❌ Workflow optimized payment collection failed:', error.message);
            throw error;
        }
    }

    async updateContactWorkflow(contactId, customerInfo) {
        try {
            const taxNumber = customerInfo.taxNumber || customerInfo.taxId;

            const attributes = {};

            if (customerInfo.name || customerInfo.companyName) {
                attributes.name = customerInfo.name || customerInfo.companyName;
            }
            if (taxNumber) {
                attributes.tax_number = taxNumber;
            }
            if (customerInfo.taxOffice) {
                attributes.tax_office = customerInfo.taxOffice;
            }
            if (customerInfo.address) {
                attributes.address = customerInfo.address;
            }
            if (customerInfo.city) {
                attributes.city = customerInfo.city;
            }
            if (customerInfo.phoneNumber) {
                attributes.phone = customerInfo.phoneNumber;
            }
            if (customerInfo.district) {
                attributes.district = customerInfo.district
            }
            attributes.contact_type = 'person'

            const contactData = {
                data: {
                    type: 'contacts',
                    attributes: attributes
                }
            };

            const result = await this.makeRequestWithoutTokenCheck('PUT', `/contacts/${contactId}`, contactData);
            console.log('✅ Contact updated successfully (workflow)');
            return result.data;

        } catch (error) {
            console.log("Contact Data", contactData);
            console.error('❌ Contact update failed (workflow):', error.message);
            throw error;
        }
    }

    async createContactWorkflow(customerInfo) {
        // 🚀 WORKFLOW OPTIMIZED: Use makeRequestWithoutTokenCheck
        try {
            const taxNumber = customerInfo.taxNumber || customerInfo.taxId;

            const contactData = {
                data: {
                    type: 'contacts',
                    attributes: {
                        name: customerInfo.name || 'Customer',
                        contact_type: customerInfo.contactType,
                        account_type: 'customer',
                        is_abroad: false,
                        archived: false,
                        email: customerInfo.email || undefined,
                        tax_number: customerInfo.taxNumber,
                        tax_office: customerInfo.taxOffice,
                        address: customerInfo.address,
                        city: customerInfo.city,
                        district: customerInfo.district,
                        phone: customerInfo.phone || undefined,
                        fax: customerInfo.fax || undefined,
                        earcive_payment_type: "KREDIKARTI/BANKAKARTI"
                    },


                }
            };
            console.log("Contact Data :", contactData);
            const result = await this.makeRequestWithoutTokenCheck('POST', '/contacts', contactData);
            console.log('✅ Contact created (workflow):', result.data.id);
            return result.data;

        } catch (error) {

            console.error('❌ Contact creation failed (workflow):', error.message);
            throw error;
        }
    }


    async formalizeInvoiceWorkflow(invoiceId, contactId, customerInfo, userEmail) {
        try {
            console.log('🔄 Formalizing invoice (workflow optimized)...');

            // Update invoice to formalize it
            const updateData = {
                data: {
                    type: 'sales_invoices',
                    attributes: {
                        item_type: 'invoice'
                    }
                }
            };

            const result = await this.makeRequestWithoutTokenCheck('PUT', `/sales_invoices/${invoiceId}`, updateData);
            console.log('✅ Invoice formalized (workflow)');

            // Check if customer is e-Invoice user
            const eInvoiceInfo = await this.checkEInvoiceUserWorkflow(contactId);
            const orderDate = new Date().toISOString().split('T')[0];

            if (eInvoiceInfo.isEInvoiceUser) {
                console.log('✅ Customer is e-Invoice user - creating e-Invoice');
                await this.createEInvoiceWorkflow(invoiceId, userEmail, {
                    scenario: 'basic',
                    to: eInvoiceInfo.eInvoiceAddress || 'default'
                });
            } else {
                console.log('✅ Customer is e-Archive user - creating e-Archive');
                await this.createEArchiveWorkflow(invoiceId, orderDate, userEmail, {}, customerInfo);
            }

            return result.data;
        } catch (error) {
            console.error('❌ Invoice formalization failed (workflow):', error.message);
            throw error;
        }
    }


    async createEArchiveWorkflow(invoiceId, orderDate, userEmail = null, advancedFields = {}, customerInfo) {
        try {
            if (!orderDate) {
                orderDate = new Date().toISOString().split('T')[0];
            }

            const shipment = {
                title: 'contentia io',
                name: 'contentia io',
                vkn: '9010533932',
                date: orderDate,
            };

            const eArchiveData = {
                data: {
                    type: 'e_archives',
                    attributes: {
                        internet_sale: {
                            url: 'https://uzmanlio.com',
                            payment_type: 'KREDIKARTI/BANKAKARTI',
                            payment_platform: 'Visa',
                            payment_date: orderDate,
                            ...advancedFields
                        },
                        shipment: shipment,
                        vat_withholding_params: [],
                        vat_exemption_reason_code: null,
                        vat_exemption_reason: null,
                        excise_duty_codes: []
                    },
                    relationships: {
                        sales_invoice: {
                            data: {
                                type: 'sales_invoices',
                                id: invoiceId.toString()
                            }
                        }
                    }
                }
            };

            console.log('📤 e-Archive payload:', JSON.stringify(eArchiveData, null, 2));

            const response = await this.makeRequestWithoutTokenCheck('POST', '/e_archives', eArchiveData);
            const jobId = response.data.id;
            console.log('✅ e-Archive job started, ID:', jobId);

            // Wait for job completion
            await this.waitForJobCompletionWorkflow(jobId, 'e_archives');
            console.log('✅ e-Archive created, ID:', jobId);
            return jobId;
        } catch (error) {
            // Check if error is due to e-Invoice conversion
            if (error.message.includes('e-fatura') || error.message.includes('posta kutusu') || error.message.includes('Scenario')) {
                console.log('🔄 Customer is e-Invoice user, converting to e-Invoice...');
                return await this.createEInvoiceWorkflow(invoiceId, userEmail, {
                    scenario: 'basic',
                    to: 'default' // Use 'default' or retrieve actual address if available
                });
            }
            console.error('❌ e-Archive creation failed (workflow):', error.message);
            throw error;
        }
    }

    async waitForJobCompletionWorkflow(jobId, jobType, maxAttempts = 5) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const jobStatus = await this.makeRequestWithoutTokenCheck('GET', `/trackable_jobs/${jobId}`);
                const status = jobStatus.data.attributes?.status;

                console.log(`📊 ${jobType} job status (${attempt}/${maxAttempts}): ${status}`);

                if (status === 'done') {
                    const result = jobStatus.data.attributes?.result;
                    console.log('📋 Job result:', result);

                    if (result && result.id) {
                        const doc = await this.makeRequestWithoutTokenCheck('GET', `/${jobType}/${result.id}`);
                        console.log(`✅ ${jobType} created, ID: ${result.id}`);
                        return doc.data;
                    } else {
                        console.log(`⚠️ ${jobType} job completed without result.id`);
                        return { id: jobId, type: 'trackable_jobs', status: 'completed_without_result_id' };
                    }
                } else if (status === 'error') {
                    const errorDetails = jobStatus.data.attributes?.errors?.join(', ') || 'Unknown error';
                    throw new Error(`${jobType} job failed: ${errorDetails}`);
                }

                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 4000));
                }
            } catch (error) {
                if (error.response?.status === 404) {
                    console.log(`⚠️ Job ${jobId} not found yet, waiting... (${attempt}/${maxAttempts})`);
                    if (attempt < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 4000));
                        continue;
                    }
                }
                if (attempt === maxAttempts) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 4000));
            }
        }
        throw new Error(`${jobType} job did not complete within ${maxAttempts} attempts`);
    }
    // async waitForJobCompletionWorkflow(jobId, jobType, maxAttempts = 5) {
    //     for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    //         try {
    //             // 🚀 FIXED: Use correct endpoint for job status checking
    //             const jobStatus = await this.makeRequestWithoutTokenCheck('GET', `/trackable_jobs/${jobId}`);
    //             const status = jobStatus.data.attributes?.status;

    //             console.log(`📊 ${jobType} job status (${attempt}/${maxAttempts}): ${status}`);

    //             if (status === 'done') {
    //                 const result = jobStatus.data.attributes?.result;
    //                 console.log('📋 Job result:', result);

    //                 if (result && result.id) {
    //                     // Get the actual document
    //                     const doc = await this.makeRequestWithoutTokenCheck('GET', `/${jobType}/${result.id}`);
    //                     console.log(`✅ ${jobType} created, ID: ${result.id}`);
    //                     return doc.data;
    //                 } else {
    //                     console.log(`⚠️ ${jobType} job completed without result.id`);
    //                     return { id: jobId, type: 'trackable_jobs', status: 'completed_without_result_id' };
    //                 }
    //             } else if (status === 'error') {
    //                 const errorDetails = jobStatus.data.attributes?.errors?.join(', ') || 'Unknown error';
    //                 throw new Error(`${jobType} job failed: ${errorDetails}`);
    //             }

    //             if (attempt < maxAttempts) {
    //                 await new Promise(resolve => setTimeout(resolve, 4000)); // Increased delay to 4 seconds
    //             }
    //         } catch (error) {
    //             if (error.response?.status === 404) {
    //                 console.log(`⚠️ Job ${jobId} not found yet, waiting... (${attempt}/${maxAttempts})`);
    //                 if (attempt < maxAttempts) {
    //                     await new Promise(resolve => setTimeout(resolve, 4000));
    //                     continue;
    //                 }
    //             }

    //             if (attempt === maxAttempts) {
    //                 throw error;
    //             }
    //             await new Promise(resolve => setTimeout(resolve, 4000));
    //         }
    //     }
    //     throw new Error(`${jobType} job did not complete within ${maxAttempts} attempts`);
    // }

    async createPublicSharingLinkOptimizedWorkflow(invoiceId, customerEmail) {
        // 🚀 WORKFLOW OPTIMIZED: Use makeRequestWithoutTokenCheck
        try {
            console.log('🔗 Creating sharing link (workflow optimized) for invoice:', invoiceId);

            const emailAddresses = customerEmail || "customer@example.com";
            const sharingData = {
                data: {
                    type: 'sharing_forms',
                    attributes: {
                        email: {
                            addresses: emailAddresses,
                            subject: "Faturanız Hazır",
                            body: "Aşağıdaki bağlantıdan faturanıza ulaşabilirsiniz. Faturanızı çevrimiçi görüntüleyebilir ve indirebilirsiniz."
                        },
                        portal: {
                            has_online_collection: true,
                            has_online_payment_reminder: false,
                            has_referral_link: false
                        },
                        properties: {}
                    },
                    relationships: {
                        shareable: {
                            data: {
                                id: invoiceId.toString(),
                                type: 'sales_invoices'
                            }
                        }
                    }
                }
            };

            try {
                const result = await this.makeRequestWithoutTokenCheck('POST', '/sharings', sharingData);
                const sharingData_response = Array.isArray(result.data) ? result.data[0] : result.data;

                console.log('✅ Public sharing created (workflow optimized):', sharingData_response.id);

                const publicUrl = sharingData_response.attributes?.url ||
                    sharingData_response.attributes?.portal_url ||
                    sharingData_response.attributes?.public_url ||
                    sharingData_response.attributes?.sharing_url;

                if (publicUrl) {
                    console.log('✅ New sharing link created (workflow optimized):', publicUrl);
                    return publicUrl;
                } else {
                    console.log('📧 Paraşüt will send email with public link to customer (workflow optimized)');
                    return 'email_sent';
                }
            } catch (createError) {
                console.log('⚠️ Direct creation failed, checking existing sharings:', createError.message);

                const invoiceWithSharings = await this.makeRequestWithoutTokenCheck('GET', `/sales_invoices/${invoiceId}?include=sharings`);
                const existingSharings = invoiceWithSharings.included?.filter(item => item.type === 'sharings');

                if (existingSharings && existingSharings.length > 0) {
                    const sharing = existingSharings[0];
                    const publicUrl = sharing.attributes?.url || sharing.attributes?.public_url;
                    if (publicUrl) {
                        console.log('✅ Found existing sharing URL (workflow optimized):', publicUrl);
                        return publicUrl;
                    }
                }

                throw new Error('Failed to create or find sharing link');
            }

        } catch (error) {
            console.error('❌ Workflow optimized sharing link creation failed:', error.message);
            throw error;
        }
    }

    async createPublicSharingLinkWorkflow(invoiceId, customerEmail) {
        // 🚀 WORKFLOW OPTIMIZED: Use makeRequestWithoutTokenCheck
        try {
            console.log('🔗 Checking for existing sharing links for invoice (workflow):', invoiceId);
            const invoiceWithSharings = await this.makeRequestWithoutTokenCheck('GET', `/sales_invoices/${invoiceId}?include=sharings`);
            const existingSharings = invoiceWithSharings.included?.filter(item => item.type === 'sharings');

            if (existingSharings && existingSharings.length > 0) {
                const sharing = existingSharings[0];
                const publicUrl = sharing.attributes?.url || sharing.attributes?.public_url;
                if (publicUrl) {
                    console.log('✅ Found existing public sharing URL (workflow):', publicUrl);
                    return publicUrl;
                }
            }

            console.log('🔗 No existing sharing found, attempting to create new one (workflow)...');
            const emailAddresses = customerEmail || "customer@example.com";

            const sharingData = {
                data: {
                    type: 'sharing_forms',
                    attributes: {
                        email: {
                            addresses: emailAddresses,
                            subject: "Faturanız Hazır",
                            body: "Aşağıdaki bağlantıdan faturanıza ulaşabilirsiniz. Faturanızı çevrimiçi görüntüleyebilir ve indirebilirsiniz."
                        },
                        portal: {
                            has_online_collection: true,
                            has_online_payment_reminder: false,
                            has_referral_link: false
                        },
                        properties: {}
                    },
                    relationships: {
                        shareable: {
                            data: {
                                id: invoiceId.toString(),
                                type: 'sales_invoices'
                            }
                        }
                    }
                }
            };

            const response = await this.makeRequestWithoutTokenCheck('POST', '/sharings', sharingData);
            const sharingData_response = Array.isArray(response.data) ? response.data[0] : response.data;

            console.log('✅ Public sharing created (workflow):', sharingData_response.id);
            console.log('📧 Paraşüt will send email with public link to customer (workflow)');
            console.log('✅ Sharing created with ID (workflow):', sharingData_response.id);

            return 'email_sent';

        } catch (error) {
            console.error('❌ Workflow sharing link creation failed:', error.message);
            throw error;
        }
    }

    async getItemWorkflow(productId) {
        return await this.makeRequestWithoutTokenCheck('GET', `/products/${productId}`);
    }

    async createItemWorkflow(itemData) {
        // 🚀 WORKFLOW OPTIMIZED: Use makeRequestWithoutTokenCheck
        try {
            const productData = {
                data: {
                    type: 'products',
                    attributes: {
                        code: `PROD_${Date.now()}`,
                        name: itemData.title || 'Video Content',
                        unit: 'adet',
                        vat_rate: 20,
                        sales_excise_duty_type: 'percentage',
                        sales_excise_duty: 0,
                        purchase_excise_duty_type: 'percentage',
                        purchase_excise_duty: 0
                    }
                }
            };

            const result = await this.makeRequestWithoutTokenCheck('POST', '/products', productData);
            console.log('✅ Product created (workflow):', result.data.id);
            return result.data.id;

        } catch (error) {
            console.error('❌ Product creation failed (workflow):', error.message);
            throw error;
        }
    }

    async getDefaultAccountWorkflow() {
        // 🚀 WORKFLOW OPTIMIZED: Use makeRequestWithoutTokenCheck
        try {
            const accounts = await this.makeRequestWithoutTokenCheck('GET', '/accounts');

            if (accounts.data && accounts.data.length > 0) {
                const defaultAccount = accounts.data.find(account =>
                    account.attributes.name.toLowerCase().includes('kasa') ||
                    account.attributes.name.toLowerCase().includes('banka')
                ) || accounts.data[0];

                console.log('✅ Default account found (workflow):', defaultAccount.id);
                return defaultAccount.id;
            }

            throw new Error('No accounts found');

        } catch (error) {
            console.error('❌ Failed to get default account (workflow):', error.message);
            throw error;
        }
    }

    // ========================================
    // BACKGROUND TOKEN REFRESH SYSTEM
    // ========================================

    /**
     * Start background token refresh every 50 minutes
     */
    startBackgroundTokenRefresh() {
        if (this.backgroundRefreshInterval) {
            clearInterval(this.backgroundRefreshInterval);
        }

        // Refresh tokens every 50 minutes (50 * 60 * 1000 = 3,000,000 ms)
        const refreshInterval = 50 * 60 * 1000;

        console.log('🔄 Starting background token refresh every 50 minutes...');

        this.backgroundRefreshInterval = setInterval(async () => {
            try {
                console.log('🔄 Background token refresh triggered...');
                await this.backgroundTokenRefresh();
            } catch (error) {
                console.error('❌ Background token refresh failed:', error.message);
            }
        }, refreshInterval);

        // Also refresh on startup after 1 minute (to ensure fresh tokens)
        setTimeout(async () => {
            try {
                console.log('🔄 Initial background token refresh...');
                await this.backgroundTokenRefresh();
            } catch (error) {
                console.error('❌ Initial background token refresh failed:', error.message);
            }
        }, 60000); // 1 minute
    }

    /**
     * Background token refresh function
     */
    async backgroundTokenRefresh() {
        try {
            console.log('🔄 Loading current tokens from database for background refresh...');
            await this.loadStoredTokens();

            if (!this.refreshToken) {
                console.log('⚠️ No refresh token available for background refresh');
                return;
            }

            const timeUntilExpiry = this.tokenExpiry - Date.now();
            const tenMinutes = 10 * 60 * 1000;

            console.log(`🕐 Token expires in ${Math.round(timeUntilExpiry / 1000)} seconds`);

            // Only refresh if token expires within 10 minutes or already expired
            if (timeUntilExpiry <= tenMinutes) {
                console.log('🔄 Token expiring soon or expired, refreshing in background...');
                await this.refreshAccessToken();
                console.log('✅ Background token refresh completed successfully');
            } else {
                console.log('✅ Token still valid, no background refresh needed');
            }

        } catch (error) {
            console.error('❌ Background token refresh error:', error.message);
            // Don't throw error - this is background process
        }
    }

    /**
     * Stop background token refresh
     */
    stopBackgroundTokenRefresh() {
        if (this.backgroundRefreshInterval) {
            clearInterval(this.backgroundRefreshInterval);
            this.backgroundRefreshInterval = null;
            console.log('🛑 Background token refresh stopped');
        }
    }
}

export default new ParasutApiService();