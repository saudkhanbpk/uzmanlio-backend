import Form from "../models/Form.js";
import User from "../models/expertInformation.js";
import mongoose from "mongoose";

// Helper function to find user by ID
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
// Create a new form
export const createForm = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const formData = req.body;

        // Create form in Form collection
        const form = await Form.create({
            expertId: user._id,
            title: formData.title,
            description: formData.description || "",
            status: formData.status || "draft",
            fields: formData.fields || [],
            responses: [],
            participantCount: 0,
            settings: {
                allowMultipleSubmissions:
                    formData.settings?.allowMultipleSubmissions ?? false,
                requireLogin: formData.settings?.requireLogin ?? false,
                showProgressBar: formData.settings?.showProgressBar ?? true,
                customTheme: {
                    primaryColor:
                        formData.settings?.customTheme?.primaryColor || "#3B82F6",
                    backgroundColor:
                        formData.settings?.customTheme?.backgroundColor || "#FFFFFF"
                },
                notifications: {
                    emailOnSubmission:
                        formData.settings?.notifications?.emailOnSubmission ?? true,
                    emailAddress:
                        formData.settings?.notifications?.emailAddress || user.email
                }
            },
            analytics: {
                views: 0,
                starts: 0,
                completions: 0,
                averageCompletionTime: 0
            }
        });

        // Save form reference in user
        if (!user.forms) user.forms = [];
        user.forms.push(form._id);
        await user.save();

        //  Response
        res.status(201).json({
            form,
            message: "Form successfully created"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Get all forms for an expert
export const getForms = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const forms = await Form.find({ expertId: user._id }).sort({ createdAt: -1 });
        res.json({ forms: forms || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Duplicate form
export const duplicateForm = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const originalForm = await Form.findOne({ _id: req.params.formId, expertId: user._id });

        if (!originalForm) {
            return res.status(404).json({ error: "Form not found" });
        }

        const duplicatedForm = await Form.create({
            expertId: user._id,
            title: `${originalForm.title} (Kopya)`,
            description: originalForm.description,
            status: "draft",
            fields: originalForm.fields,
            responses: [],
            participantCount: 0,
            settings: originalForm.settings,
            analytics: {
                views: 0,
                starts: 0,
                completions: 0,
                averageCompletionTime: 0
            },
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Optional: store in user's forms array
        if (!user.forms) user.forms = [];
        user.forms.push(duplicatedForm._id);
        await user.save();

        res.status(201).json({
            form: duplicatedForm,
            message: "Form başarıyla kopyalandı"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Delete a form
export const deleteForm = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        // Find form in the Form collection
        const form = await Form.findOne({ _id: req.params.formId, expertId: user._id });
        if (!form) {
            return res.status(404).json({ error: "Form not found" });
        }
        // Delete the form document
        await Form.deleteOne({ _id: form._id });
        // Remove reference from user's forms array
        if (user.forms) {
            user.forms = user.forms.filter(fId => !fId.equals(form._id));
            await user.save();
        }
        res.json({ message: "Form başarıyla silindi" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Get a single form by ID
export const getFormById = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);

        // Find form in Form collection and ensure it belongs to the user
        const form = await Form.findOne({ _id: req.params.formId, expertId: user._id });

        if (!form) {
            return res.status(404).json({ error: "Form not found" });
        }

        res.json({ form });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Update a form
export const updateForm = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const formId = req.params.formId;

        // Find the form in the Form collection
        const form = await Form.findOne({ _id: formId, expertId: user._id });
        if (!form) {
            return res.status(404).json({ error: "Form not found" });
        }

        const formData = req.body;

        // Update only provided fields
        form.title = formData.title || form.title;
        form.description = formData.description || form.description;
        form.status = formData.status || form.status;
        form.fields = formData.fields || form.fields;

        // Merge settings
        form.settings = {
            ...form.settings,
            ...formData.settings,
            customTheme: {
                ...form.settings.customTheme,
                ...formData.settings?.customTheme
            },
            notifications: {
                ...form.settings.notifications,
                ...formData.settings?.notifications
            }
        };

        form.updatedAt = new Date();

        await form.save();

        res.json({
            form,
            message: "Form successfully updated"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Get forms by status
export const getFormsByStatus = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const { status } = req.params;

        // Fetch forms from Form collection filtered by status and expertId
        const filteredForms = await Form.find({ expertId: user._id, status })
            .sort({ createdAt: -1 });

        res.json({ forms: filteredForms || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Update form status
export const updateFormStatus = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const formId = req.params.formId;
        const { status } = req.body;

        if (!['draft', 'active', 'inactive', 'archived'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        // Find form in Form collection
        const form = await Form.findOne({ _id: formId, expertId: user._id });
        if (!form) {
            return res.status(404).json({ error: "Form not found" });
        }

        form.status = status;
        form.updatedAt = new Date();

        await form.save();

        res.json({
            form,
            message: `Form status updated to ${status}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Get form responses
export const getFormResponses = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const form = user.forms?.find(form => form.id === req.params.formId);

        if (!form) {
            return res.status(404).json({ error: "Form not found" });
        }

        res.json({
            responses: form.responses || [],
            totalResponses: form.responses?.length || 0,
            form: {
                id: form.id,
                title: form.title,
                fields: form.fields
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Submit form response (public endpoint)
export const submitFormResponse = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const formIndex = user.forms.findIndex(form => form.id === req.params.formId);

        if (formIndex === -1) {
            return res.status(404).json({ error: "Form not found" });
        }

        const form = user.forms[formIndex];

        if (form.status !== 'active') {
            return res.status(400).json({ error: "Form is not active" });
        }

        const responseData = req.body;
        const responseId = uuidv4();

        const newResponse = {
            id: responseId,
            respondentName: responseData.respondentName,
            respondentEmail: responseData.respondentEmail,
            respondentPhone: responseData.respondentPhone,
            responses: responseData.responses || [],
            submittedAt: new Date(),
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        };

        // Add response to form
        if (!form.responses) {
            form.responses = [];
        }
        form.responses.push(newResponse);

        // Update participant count and analytics
        form.participantCount = form.responses.length;
        form.analytics.completions += 1;
        form.updatedAt = new Date();

        await user.save();

        res.status(201).json({
            message: "Form yanıtı başarıyla kaydedildi",
            responseId: responseId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get form analytics
export const getFormAnalytics = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const form = user.forms?.find(form => form.id === req.params.formId);

        if (!form) {
            return res.status(404).json({ error: "Form not found" });
        }

        const responses = form.responses || [];
        const analytics = {
            ...form.analytics,
            totalResponses: responses.length,
            responseRate: form.analytics.starts > 0 ? (responses.length / form.analytics.starts * 100).toFixed(2) : 0,
            recentResponses: responses
                .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                .slice(0, 10),
            responsesByDate: responses.reduce((acc, response) => {
                const date = new Date(response.submittedAt).toISOString().split('T')[0];
                acc[date] = (acc[date] || 0) + 1;
                return acc;
            }, {}),
            fieldAnalytics: form.fields.map(field => {
                const fieldResponses = responses
                    .map(r => r.responses.find(resp => resp.fieldId === field.id))
                    .filter(Boolean);

                return {
                    fieldId: field.id,
                    fieldLabel: field.label,
                    fieldType: field.type,
                    responseCount: fieldResponses.length,
                    responses: fieldResponses.map(r => r.value)
                };
            })
        };

        res.json({ analytics });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get forms statistics
export const getFormsStatistics = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const forms = user.forms || [];

        const stats = {
            total: forms.length,
            active: forms.filter(f => f.status === 'active').length,
            draft: forms.filter(f => f.status === 'draft').length,
            inactive: forms.filter(f => f.status === 'inactive').length,
            archived: forms.filter(f => f.status === 'archived').length,
            totalResponses: forms.reduce((sum, f) => sum + (f.responses?.length || 0), 0),
            totalViews: forms.reduce((sum, f) => sum + (f.analytics?.views || 0), 0),
            recentForms: forms
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                .slice(0, 5)
        };

        res.json({ stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};