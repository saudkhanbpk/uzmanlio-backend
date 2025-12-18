import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import User from "../models/expertInformation.js";
import Customer from "../models/customer.js";
import CustomerNote from "../models/customerNotes.js";
import { Parser } from "json2csv";

// Helper function to find user by ID (replicated from expertInformationRoutes.js)
const findUserById = async (userId) => {
    let user;

    // Try to find by MongoDB ObjectId first
    if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId);
    }

    // If not found or invalid ObjectId, try to find by custom ID field
    if (!user) {
        user = await User.findOne({
            $or: [
                { _id: userId },
                { id: userId },
                { userId: userId },
                { customId: userId }
            ]
        });
    }

    if (!user) {
        throw new Error('User not found');
    }
    return user;
};

export const getCustomers = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status, category, search } = req.query;

        // Find user and populate customer references inside 'customers.customerId'
        const user = await User.findById(userId)
            .populate({
                path: "customers.customerId",
                model: "Customer"
            })
            .lean();

        if (!user) return res.status(404).json({ error: "User not found" });

        // Map to include full customer document + isArchived + addedAt
        let customers = (user.customers || []).map(c => ({
            ...c.customerId,            // full customer document
            isArchived: c.isArchived,   // keep flag from user
            addedAt: c.addedAt           // keep addedAt timestamp
        }));

        // Apply filters if provided
        if (status && status !== "all") {
            customers = customers.filter(c => c.status === status);
        }

        if (category && category !== "all") {
            customers = customers.filter(c => c.category === category);
        }

        if (search) {
            const searchLower = search.toLowerCase();
            customers = customers.filter(c =>
                (c.name && c.name.toLowerCase().includes(searchLower)) ||
                (c.surname && c.surname.toLowerCase().includes(searchLower)) ||
                (c.email && c.email.toLowerCase().includes(searchLower)) ||
                (c.phone && c.phone.includes(search))
            );
        }

        // Sort by lastContact or updatedAt
        customers.sort(
            (a, b) => new Date(b.lastContact || b.updatedAt) - new Date(a.lastContact || a.updatedAt)
        );

        res.json({ customers }); // FULL customer objects returned here
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getCustomerById = async (req, res) => {
    try {
        const { userId, customerId } = req.params;
        const customerIDFromRequest = customerId;
        const user = await findUserById(userId);

        const ownsCustomer = user.customers.some(c =>
            c.customerId === customerIDFromRequest ||
            (c.customerId && c.customerId.toString() === customerIDFromRequest)
        );
        if (!ownsCustomer) return res.status(404).json({ error: "Customer not found for this user" });

        const customer = await Customer.findById(customerIDFromRequest);
        if (!customer) return res.status(404).json({ error: "Customer not found" });

        res.json({ customer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createCustomer = async (req, res) => {
    try {
        const { userId } = req.params;
        const data = req.body;

        const user = await findUserById(userId);

        const existingCustomer = await Customer.findOne({ email: data.email });
        if (existingCustomer) return res.status(400).json({ error: "Bu e-posta ile bir danışan zaten kayıtlı" });

        const newCustomer = await Customer.create({
            name: data.name,
            surname: data.surname,
            email: data.email,
            phone: data.phone,
            dateOfBirth: data.dateOfBirth || null,
            gender: data.gender || "prefer-not-to-say",
            address: {
                street: data.address?.street || "",
                city: data.address?.city || "",
                state: data.address?.state || "",
                postalCode: data.address?.postalCode || "",
                country: data.address?.country || "",
            },
            occupation: data.occupation || "",
            company: data.company || "",
            preferences: {
                communicationMethod: data.preferences?.communicationMethod || "email",
                language: data.preferences?.language || "tr",
                timezone: data.preferences?.timezone || "Europe/Istanbul",
                reminderSettings: {
                    enabled: data.preferences?.reminderSettings?.enabled !== false,
                    beforeHours: data.preferences?.reminderSettings?.beforeHours || 24
                }
            },
            status: data.status || "active",
            category: data.category || "",
            tags: data.tags || [],
            source: data.source || "website",
            referredBy: data.referredBy || "",
            appointments: data.appointments || [],
            totalAppointments: data.totalAppointments || 0,
            completedAppointments: data.completedAppointments || 0,
            cancelledAppointments: data.cancelledAppointments || 0,
            noShowAppointments: data.noShowAppointments || 0,
            totalSpent: data.totalSpent || 0,
            outstandingBalance: data.outstandingBalance || 0,
            paymentMethod: data.paymentMethod || "online",
            notes: data.notes || [],
            firstAppointment: data.firstAppointment || null,
            lastAppointment: data.lastAppointment || null,
            lastContact: data.lastContact || null,
            averageRating: data.averageRating || 0,
            totalRatings: data.totalRatings || 0,
            consentGiven: {
                termsAcceptionStatus: data.consentGiven?.termsAcceptionStatus,
                dataProcessingTerms: data.consentGiven?.dataProcessingTerms,
                marketingTerms: data.consentGiven?.marketingTerms,
                dateGiven: data.consentGiven?.dateGiven
            },
            isArchived: data.isArchived || false
        });

        user.customers.push({
            customerId: newCustomer._id,
            isArchived: false,
            addedAt: new Date()
        });
        await user.save();

        res.status(201).json({ customer: newCustomer, message: "Danışan başarıyla eklendi" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateCustomer = async (req, res) => {
    try {
        const { userId, customerId } = req.params;
        const data = req.body || {};

        const user = await findUserById(userId);
        // Flexible check for customer existence in user's list
        const hasCustomer = user.customers.some(c =>
            c.customerId === customerId ||
            (c.customerId && c.customerId.toString() === customerId)
        );

        if (!hasCustomer) return res.status(404).json({ error: "Customer not found for this user" });

        const customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ error: "Customer not found" });

        // Email uniqueness
        if (data.email && data.email !== customer.email) {
            const emailTaken = await Customer.findOne({ email: data.email, _id: { $ne: customerId } });
            if (emailTaken) return res.status(400).json({ error: "Bu e-posta adresi başka bir danışanda kayıtlı" });
            customer.email = data.email;
        }

        // Shallow fields
        ["name", "surname", "phone", "gender", "occupation", "company", "status", "category", "paymentMethod"].forEach(f => {
            if (data[f] !== undefined) customer[f] = data[f];
        });
        if (data.dateOfBirth !== undefined) customer.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;

        // Address merge
        if (data.address) customer.address = { ...(customer.address || {}), ...data.address };

        // Preferences merge
        if (data.preferences) {
            customer.preferences = {
                communicationMethod: data.preferences.communicationMethod ?? customer.preferences?.communicationMethod ?? "email",
                language: data.preferences.language ?? customer.preferences?.language ?? "tr",
                timezone: data.preferences.timezone ?? customer.preferences?.timezone ?? "Europe/Istanbul",
                reminderSettings: { ...(customer.preferences?.reminderSettings || {}), ...(data.preferences.reminderSettings || {}) }
            };
        }

        // Tags
        if (Array.isArray(data.tags)) customer.tags = data.tags;

        // Source / referredBy
        ["source", "referredBy"].forEach(f => { if (data[f] !== undefined) customer[f] = data[f]; });

        // Consent merge
        if (data.consentGiven) {
            const normalized = {
                termsAcceptionStatus: data.consentGiven.termsAcceptionStatus ?? data.consentGiven.termsAcception ?? customer.consentGiven?.termsAcceptionStatus,
                dataProcessingTerms: data.consentGiven.dataProcessingTerms ?? data.consentGiven.dataProcessing ?? customer.consentGiven?.dataProcessingTerms,
                marketingTerms: data.consentGiven.marketingTerms ?? data.consentGiven.marketing ?? customer.consentGiven?.marketingTerms,
                dateGiven: data.consentGiven.dateGiven ? new Date(data.consentGiven.dateGiven) : (data.consentGiven.dataProcessing || data.consentGiven.marketing) ? (customer.consentGiven?.dateGiven || new Date()) : customer.consentGiven?.dateGiven
            };
            customer.consentGiven = { ...customer.consentGiven, ...normalized };
        }

        // Appointments / stats
        ["appointments", "totalAppointments", "completedAppointments", "cancelledAppointments", "noShowAppointments", "totalSpent", "outstandingBalance", "averageRating", "totalRatings", "notes"].forEach(f => {
            if (data[f] !== undefined) customer[f] = data[f];
        });

        // Important dates
        ["firstAppointment", "lastAppointment", "lastContact"].forEach(f => { if (data[f]) customer[f] = new Date(data[f]); });

        if (data.isArchived !== undefined) customer.isArchived = !!data.isArchived;
        customer.updatedAt = new Date();
        await customer.save();

        res.json({ customer, message: "Danışan başarıyla güncellendi" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteCustomer = async (req, res) => {
    try {
        const { userId, customerId } = req.params;
        let customId = customerId;
        const user = await findUserById(userId);

        const customerIndex = user.customers.findIndex(customer =>
            customer.customerId === customId || (customer.customerId && customer.customerId.toString() === customId)
        );

        if (customerIndex === -1) {
            // Debug info in error
            const eventIds = user.customers.map(e => ({ id: e.id, _id: e._id }));
            return res.status(404).json({ error: "Customer not found for this user", availableEvents: eventIds });
        }

        const customerToDelete = await Customer.findById(customId);
        if (!customerToDelete) return res.status(404).json({ error: "Customer not found" });

        await customerToDelete.deleteOne();
        user.customers.splice(customerIndex, 1);
        await user.save();

        res.json({ message: "Customer reference successfully removed from user" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const archiveCustomer = async (req, res) => {
    try {
        const { userId, customerId } = req.params;
        const { isArchived } = req.body;

        const user = await findUserById(userId);
        const hasCustomer = user.customers.some(c =>
            c.customerId === customerId ||
            (c.customerId && c.customerId.toString() === customerId)
        );
        if (!hasCustomer) return res.status(404).json({ error: "Customer not found for this user" });

        const customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ error: "Customer not found" });

        customer.isArchived = !!isArchived;
        customer.updatedAt = new Date();
        await customer.save();

        res.json({ customer, message: `Danışan ${customer.isArchived ? "arşivlendi" : "arşivden çıkarıldı"}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateCustomerStatus = async (req, res) => {
    try {
        const { userId, customerId } = req.params;
        const { status } = req.body;

        if (!["active", "inactive", "blocked", "prospect"].includes(status))
            return res.status(400).json({ error: "Invalid status" });

        const user = await findUserById(userId);
        const hasCustomer = user.customers.some(c =>
            c.customerId === customerId ||
            (c.customerId && c.customerId.toString() === customerId)
        );
        if (!hasCustomer) return res.status(404).json({ error: "Customer not found for this user" });

        const customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ error: "Customer not found" });

        customer.status = status;
        customer.updatedAt = new Date();
        await customer.save();

        res.json({ customer, message: `Danışan durumu ${status} olarak güncellendi` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const exportCustomersCsv = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId)
            .populate({
                path: "customers.customerId",
                model: "Customer",
            })
            .lean();
        console.log("User customers:", user.customers);

        if (!user) return res.status(404).json({ error: "User not found" });

        const csvData = (user.customers || [])
            .map(c => {
                const customer = c.customerId;
                if (!customer) return null;

                return {
                    name: customer.name,
                    surname: customer.surname,
                    email: customer.email,
                    phone: customer.phone,
                    dateOfBirth: customer.dateOfBirth
                        ? customer.dateOfBirth.toISOString().split("T")[0]
                        : "",
                    gender: customer.gender || "",
                };
            })
            .filter(Boolean);

        // Convert JSON → CSV
        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(csvData);

        // Set CSV headers for download
        res.header("Content-Type", "text/csv");
        res.attachment("customers.csv");
        return res.send(csv);

    } catch (error) {
        console.error("CSV Export Error:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getCustomerNotes = async (req, res) => {
    try {
        const { userId, customerId } = req.params;

        // Fetch user
        const user = await findUserById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const hasCustomer = user.customers.some(c =>
            c.customerId === customerId ||
            (c.customerId && c.customerId.toString() === customerId)
        );
        if (!hasCustomer) return res.status(404).json({ error: "Customer not found for this user" });

        // Fetch customer with populated notes
        const customer = await Customer.findById(customerId).populate('notes').lean();
        if (!customer) return res.status(404).json({ error: "Customer not found" });

        // Sort notes by newest first
        const notes = (customer.notes || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Return full notes + minimal customer info
        res.json({
            notes,
            customer: {
                id: customer._id,
                name: customer.name,
                surname: customer.surname,
                email: customer.email,
                phone: customer.phone,
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const addCustomerNote = async (req, res) => {
    try {
        const { userId, customerId } = req.params;
        const noteData = req.body;

        const user = await findUserById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const hasCustomer = user.customers.some(c =>
            c.customerId === customerId ||
            (c.customerId && c.customerId.toString() === customerId)
        );
        if (!hasCustomer) return res.status(404).json({ error: "Customer not found for this user" });

        const customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ error: "Customer not found" });

        const noteId = uuidv4();

        // Handle file upload
        const files = [];
        if (req.file) {
            const file = req.file;
            const fileUrl = `/uploads/Experts_Files/customer_notes/${file.filename}`;
            let fileType = 'document';
            if (file.mimetype.startsWith('image/')) fileType = 'image';
            else if (file.mimetype === 'application/pdf') fileType = 'pdf';

            files.push({
                name: file.originalname,
                type: fileType,
                size: `${(file.size / 1024).toFixed(1)} KB`,
                url: fileUrl,
                uploadedAt: new Date()
            });
        }

        const newNote = new CustomerNote({
            id: noteId,
            content: noteData.content || '',
            author: noteData.author || 'expert',
            authorName: noteData.authorName || user.information?.name || 'Expert',
            files: files,
            isPrivate: noteData.isPrivate === 'true' || noteData.isPrivate === true,
            tags: noteData.tags ? (Array.isArray(noteData.tags) ? noteData.tags : [noteData.tags]) : [],
        });

        await newNote.save();

        customer.notes.push(newNote._id);
        customer.lastContact = new Date();
        customer.updatedAt = new Date();
        await customer.save();

        res.status(201).json({ note: newNote, message: "Not başarıyla eklendi" });
    } catch (error) {
        console.error('Error adding customer note:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateCustomerNote = async (req, res) => {
    try {
        const { userId, customerId, noteId } = req.params;
        const noteData = req.body;

        const user = await findUserById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const hasCustomer = user.customers.some(c =>
            c.customerId === customerId ||
            (c.customerId && c.customerId.toString() === customerId)
        );
        if (!hasCustomer) return res.status(404).json({ error: "Customer not found for this user" });

        const customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ error: "Customer not found" });

        const noteIndex = customer.notes.findIndex(note => note.toString() === noteId || note.id === noteId);
        // Note: customer.notes is array of ObjectIds. 
        // Wait, update logic in original file was finding note in customer.notes array?
        // In schema 'notes' is [{ type: mongoose.Schema.Types.ObjectId, ref: 'CustomerNote' }]
        // So customer.notes array contains ObjectIds. 
        // But the original code was: `const noteIndex = customer.notes.findIndex(note => note.id === noteId);`
        // This implies customer.notes was populated? 
        // OR original code was buggy depending on whether it was populated.
        // However, `updateCustomerNote` in `expertInformationRoutes.js` (lines 1984+) :
        // `const noteIndex = customer.notes.findIndex(note => note.id === noteId);`
        // `customer.notes[noteIndex] = updatedNote;`
        // This looks like it was treating customer.notes as subdocuments array, BUT the schema says it is Ref array.
        // If it is Ref array, we should update the `CustomerNote` document directly.
        // Let's check `customer.js` again.
        // Line 80: `notes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CustomerNote' }],`

        // So the original code was likely INCORRECT regarding `customer.notes` usage if it wasn't populated.
        // But wait, look at `addCustomerNote` in original file:
        // `customer.notes.push(newNote._id);` -> This pushes an ID.
        // So `customer.notes` is definitely IDs.

        // In `updateCustomerNote` original:
        // `const noteIndex = customer.notes.findIndex(note => note.id === noteId);`
        // `const updatedNote = { ...customer.notes[noteIndex], ... }`
        // This code would fail if specific fields weren't populated.
        // ACTUALLY, I should update the `CustomerNote` document directly using `CustomerNote.findByIdAndUpdate` or similar.
        // The original code:
        // `customer.notes[noteIndex] = updatedNote;` -> This assumes `notes` is an embedded array.
        // This strongly suggests I should fix this logic to update the `CustomerNote` model, NOT the `customer.notes` array (unless I'm replacing the reference, which I'm not).

        // FIX: I will update the CustomerNote document.

        const note = await CustomerNote.findById(noteId);
        if (!note) return res.status(404).json({ error: "Note not found" });

        // Verify note belongs to customer? 
        // The `customer.notes` array contains `noteId`.
        if (!customer.notes.some(n => n.toString() === noteId)) {
            return res.status(404).json({ error: "Note does not belong to this customer" });
        }

        if (noteData.content) note.content = noteData.content;
        if (noteData.files) note.files = noteData.files;
        if (noteData.isPrivate !== undefined) note.isPrivate = noteData.isPrivate;
        if (noteData.tags) note.tags = noteData.tags;

        await note.save();

        // Check if we need to update customer timestamp
        customer.updatedAt = new Date();
        await customer.save();

        res.json({ note, message: "Not başarıyla güncellendi" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteCustomerNote = async (req, res) => {
    try {
        const { userId, customerId, noteId } = req.params;

        const user = await findUserById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const hasCustomer = user.customers.some(c =>
            c.customerId === customerId ||
            (c.customerId && c.customerId.toString() === customerId)
        );
        if (!hasCustomer) return res.status(404).json({ error: "Customer not found for this user" });

        const customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ error: "Customer not found" });

        // Remove reference from customer.notes
        const initialLength = customer.notes.length;
        customer.notes = customer.notes.filter(n => n.toString() !== noteId);

        if (customer.notes.length === initialLength) {
            return res.status(404).json({ error: "Note not found in customer" });
        }

        // Delete the note document
        await CustomerNote.findByIdAndDelete(noteId);

        customer.updatedAt = new Date();
        await customer.save();

        res.json({ message: "Not başarıyla silindi" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getCustomerStats = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await findUserById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const customerIds = user.customers.map(c => c.customerId);
        const customers = await Customer.find({ _id: { $in: customerIds } });

        const stats = {
            total: customers.length,
            active: customers.filter(c => c.status === 'active').length,
            inactive: customers.filter(c => c.status === 'inactive').length,
            blocked: customers.filter(c => c.status === 'blocked').length,
            prospects: customers.filter(c => c.status === 'prospect').length,
            archived: customers.filter(c => c.isArchived).length,
            totalAppointments: customers.reduce((sum, c) => sum + (c.totalAppointments || 0), 0),
            completedAppointments: customers.reduce((sum, c) => sum + (c.completedAppointments || 0), 0),
            cancelledAppointments: customers.reduce((sum, c) => sum + (c.cancelledAppointments || 0), 0),
            noShowAppointments: customers.reduce((sum, c) => sum + (c.noShowAppointments || 0), 0),
            totalRevenue: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
            outstandingBalance: customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0),
            newCustomersThisMonth: customers.filter(c => {
                const created = new Date(c.createdAt);
                const now = new Date();
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
            }).length,
            recentCustomers: customers
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)
                .map(c => ({
                    id: c.id,
                    name: `${c.name} ${c.surname}`,
                    email: c.email,
                    createdAt: c.createdAt,
                    totalSpent: c.totalSpent || 0
                })),
            sourceBreakdown: customers.reduce((acc, c) => {
                acc[c.source || 'unknown'] = (acc[c.source || 'unknown'] || 0) + 1;
                return acc;
            }, {}),
            averageRating: customers.length > 0 ? customers.reduce((sum, c) => sum + (c.averageRating || 0), 0) / customers.length : 0,
            categoryBreakdown: customers.reduce((acc, c) => {
                acc[c.category || 'uncategorized'] = (acc[c.category || 'uncategorized'] || 0) + 1;
                return acc;
            }, {})
        };

        res.json({ stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const bulkImportCustomers = async (req, res) => {
    try {
        const { userId } = req.params;
        const { customers: customersData } = req.body;

        if (!Array.isArray(customersData) || customersData.length === 0)
            return res.status(400).json({ error: "Invalid customers data" });

        const user = await findUserById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const results = { success: 0, failed: 0, errors: [] };

        for (let i = 0; i < customersData.length; i++) {
            const cData = customersData[i];
            try {
                if (!cData.name || !cData.surname || !cData.email || !cData.phone) {
                    results.failed++;
                    results.errors.push(`Row ${i + 1}: Missing required fields`);
                    continue;
                }

                const existing = await Customer.findOne({ email: cData.email });
                if (existing) {
                    results.failed++;
                    results.errors.push(`Row ${i + 1}: Customer with email ${cData.email} already exists`);
                    continue;
                }

                const newCustomer = await Customer.create({
                    name: cData.name,
                    surname: cData.surname,
                    email: cData.email,
                    phone: cData.phone,
                    dateOfBirth: cData.dateOfBirth ? new Date(cData.dateOfBirth) : undefined,
                    gender: cData.gender || 'prefer-not-to-say',
                    occupation: cData.occupation,
                    company: cData.company,
                    status: cData.status || 'active',
                    category: cData.category,
                    source: cData.source || 'bulk-import',
                    referredBy: cData.referredBy,
                    preferences: {
                        communicationMethod: cData.communicationMethod || 'email',
                        language: 'tr',
                        timezone: 'Europe/Istanbul',
                        reminderSettings: { enabled: true, beforeHours: 24 }
                    },
                    appointments: [],
                    totalAppointments: 0,
                    completedAppointments: 0,
                    cancelledAppointments: 0,
                    noShowAppointments: 0,
                    totalSpent: 0,
                    outstandingBalance: 0,
                    notes: [],
                    averageRating: 0,
                    totalRatings: 0,
                    consentGiven: { dataProcessingTerms: true, marketingTerms: cData.marketingConsent || false, dateGiven: new Date() },
                    isArchived: false
                });

                // Push properly structured object to User.customers
                user.customers.push({
                    customerId: newCustomer._id,
                    isArchived: false,
                    addedAt: new Date()
                });

                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push(`Row ${i + 1}: ${err.message}`);
            }
        }

        await user.save();

        res.json({
            message: `Bulk import completed. ${results.success} customers imported, ${results.failed} failed.`,
            results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
