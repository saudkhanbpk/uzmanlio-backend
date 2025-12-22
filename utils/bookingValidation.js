import Joi from 'joi';

export const bookingDataSchema = Joi.object({
    clientInfo: Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
        phone: Joi.string().required(),
    }).required(),

    selectedOffering: Joi.object({
        id: Joi.string().required(),
        title: Joi.string().required(),
        price: Joi.number().allow(null, 0),
        duration: Joi.number().allow(null),
        sessionsIncluded: Joi.number().allow(null),
        sessions: Joi.number().allow(null),
        eventType: Joi.string().allow(null, ''),
        meetingType: Joi.string().allow(null, ''),
        category: Joi.string().allow(null, ''),
        isActive: Joi.boolean().allow(null, true),
        subCategory: Joi.string().allow(null, ''),
        date: Joi.string().allow(null, ''),
        time: Joi.string().allow(null, ''),
        description: Joi.string().allow(null, ''),
        details: Joi.string().allow(null, ''),
        location: Joi.string().allow('', null),
        discount: Joi.number().allow(null, 0),
        platform: Joi.string().allow('', null),
        icon: Joi.string().allow('', null),
        iconBg: Joi.string().allow('', null),
        features: Joi.array().items(Joi.any()).optional(),
        originalPrice: Joi.number().allow(null, 0),
        isAvailable: Joi.boolean().allow(null, false),
        appointmentCount: Joi.number().allow(null, 0),
        maxAttendees: Joi.number().allow(null),
        isOfflineEvent: Joi.boolean().allow(null),
        selectedClients: Joi.array().items(Joi.any()).optional(),
        status: Joi.string().allow('', null),
        createdAt: Joi.string().allow('', null),
        updatedAt: Joi.string().allow('', null),
        _id: Joi.string().allow('', null),

        // 🔽 ADDED (from latest payload)
        isPurchased: Joi.boolean().allow(null),
        validUntil: Joi.string().allow(null),
        purchasedBy: Joi.array().items(Joi.any()).optional(),
    }).required(),

    selectedPackage: Joi.object({
        packageId: Joi.string().allow(''),
        packageTitle: Joi.string().allow('', null),
    }).optional(),

    selectedService: Joi.object({
        serviceId: Joi.string().allow(''),
        serviceTitle: Joi.string().allow('', null),
    }).optional(),

    serviceType: Joi.string().allow('', null),
    packageType: Joi.string().allow('', null),

    providerId: Joi.string().required(),
    expertId: Joi.string().required(),
    providerName: Joi.string().required(),

    date: Joi.string().allow(null, ''),
    time: Joi.string().allow(null, ''),

    subtotal: Joi.number().required(),
    discount: Joi.number().allow(0),
    total: Joi.number().required(),

    paymentInfo: Joi.object({
        method: Joi.string().allow('card', 'havale-eft', 'online').default('card'),
        cardNumber: Joi.string().allow(''),
        cardHolderName: Joi.string().allow(''),
        cardExpiry: Joi.string().allow(''),
        cardCvv: Joi.string().allow(''),
        cardType: Joi.string().allow('', null),
    }).optional(),

    orderNotes: Joi.string().allow('', null),
    termsAccepted: Joi.boolean().required(),
    coupon: Joi.any().allow(null),
    source: Joi.string().allow('', null).default('website'),
}).unknown(true);

export const validateCouponSchema = Joi.object({
    customerId: Joi.string().required(),
    couponCode: Joi.string().required(),
    expertId: Joi.string().required(),
});
