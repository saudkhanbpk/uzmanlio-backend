import mongoose, { Mongoose } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";



const { Schema } = mongoose;

const Title = new Schema({
  id: { type: String, default: uuidv4 },
  title: { type: String },
  description: { type: String },
});

// ---------------- Sub-Schemas ----------------
const EducationSchema = new Schema({
  id: { type: String, default: uuidv4 },
  level: { type: String },
  university: { type: Schema.Types.ObjectId, ref: "University" },
  name: { type: String },
  department: { type: String },
  graduationYear: { type: Number },
});

const ExperienceSchema = new Schema({
  id: { type: String, default: uuidv4 },
  company: { type: String },
  position: { type: String },
  description: { type: String },
  start: { type: Number },
  end: { type: Number, default: null },
  stillWork: { type: Boolean, default: false },
  country: { type: String },
  city: { type: String },
});

const CertificateSchema = new Schema({
  id: { type: String, default: uuidv4 },
  name: { type: String },
  company: { type: String },
  country: { type: String },
  city: { type: String },
  issueDate: { type: Date },
  expiryDate: { type: Date },
  credentialId: { type: String },
  credentialUrl: { type: String },
});

const SkillSchema = new Schema({
  id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  level: { type: Number, min: 0, max: 100, required: true },
  category: { type: String },
  description: { type: String },
});

// const AppointmentSchema = new Schema({
//   id: { type: String, default: uuidv4 },
//   title: { type: String, required: true },
//   date: { type: String, required: true },
//   time: { type: String, required: true },
//   duration: { type: Number, required: true },
//   type: { type: String, enum: ["1-1", "group"], required: true },
//   status: {
//     type: String,
//     enum: ["confirmed", "pending", "cancelled"],
//     default: "pending",
//   },
//   clientName: { type: String },
//   clientEmail: { type: String },
//   notes: { type: String },
//   createdAt: { type: Date, default: Date.now },
// });

// const AppointmentSchema = [{ type: String, ref: "CustomerAppointment" }]



const AvailabilitySchema = new Schema({
  alwaysAvailable: { type: Boolean, default: false },
  selectedSlots: [{ type: String }],
  lastUpdated: { type: Date, default: Date.now },
});

const CalendarProviderSchema = new Schema({
  provider: { type: String, enum: ["google", "microsoft"], required: true },
  providerId: { type: String, required: true },
  email: { type: String, required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  tokenExpiry: { type: Date, required: true },
  calendarId: { type: String },
  subscriptionId: { type: String },
  subscriptionExpiry: { type: Date },
  isActive: { type: Boolean, default: true },
  lastSync: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

const AppointmentMappingSchema = new Schema({
  appointmentId: { type: String, required: true },
  provider: { type: String, enum: ["google", "microsoft"], required: true },
  providerEventId: { type: String, required: true },
  calendarId: { type: String, required: true },
  lastSynced: { type: Date, default: Date.now },
});

// ---------------- Forms System ----------------
const FormFieldSchema = new Schema({
  id: { type: String, default: uuidv4 },
  type: {
    type: String,
    enum: [
      "text",
      "email",
      "phone",
      "single-choice",
      "multiple-choice",
      "ranking",
      "file-upload",
    ],
    required: true,
  },
  label: { type: String, required: true },
  required: { type: Boolean, default: false },
  placeholder: { type: String },
  options: [{ type: String }],
  validation: {
    minLength: { type: Number },
    maxLength: { type: Number },
    pattern: { type: String },
  },
});

const FormResponseSchema = new Schema({
  id: { type: String, default: uuidv4 },
  respondentName: { type: String },
  respondentEmail: { type: String },
  respondentPhone: { type: String },
  responses: [
    {
      fieldId: { type: String, required: true },
      fieldLabel: { type: String, required: true },
      fieldType: { type: String, required: true },
      value: { type: Schema.Types.Mixed },
      files: [{ type: String }],
    },
  ],
  submittedAt: { type: Date, default: Date.now },
  ipAddress: { type: String },
  userAgent: { type: String },
});

const FormSchema = new Schema({
  id: { type: String, default: uuidv4 },
  title: { type: String, required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ["draft", "active", "inactive", "archived"],
    default: "draft",
  },
  fields: [FormFieldSchema],
  responses: [FormResponseSchema],
  participantCount: { type: Number, default: 0 },
  settings: {
    allowMultipleSubmissions: { type: Boolean, default: false },
    requireLogin: { type: Boolean, default: false },
    showProgressBar: { type: Boolean, default: true },
    customTheme: {
      primaryColor: { type: String, default: "#3B82F6" },
      backgroundColor: { type: String, default: "#FFFFFF" },
    },
    notifications: {
      emailOnSubmission: { type: Boolean, default: true },
      emailAddress: { type: String },
    },
  },
  analytics: {
    views: { type: Number, default: 0 },
    starts: { type: Number, default: 0 },
    completions: { type: Number, default: 0 },
    averageCompletionTime: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ---------------- Blog System ----------------
const BlogSchema = new Schema({
  id: { type: String, default: () => uuidv4() },
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true },
  keywords: [{ type: String }],
  status: { type: String, enum: ["draft", "published"], default: "draft" },
  slug: { type: String, required: true },
  author: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ---------------- Events System ----------------
const EventSchema = new Schema({
  id: { type: String, default: uuidv4 },
  title: { type: String, required: true },
  description: { type: String },
  serviceId: { type: String },
  serviceName: { type: String, },
  packageId: { type: String },
  packageName: { type: String, },
  serviceType: { type: String, enum: ["service", "package"], required: true },
  date: { type: String, },
  time: { type: String, },
  duration: { type: Number, required: true },
  location: { type: String },
  platform: { type: String },
  eventType: { type: String, enum: ["online", "offline", "hybrid"], required: true },
  meetingType: { type: String, enum: ["1-1", "grup", ""] },
  price: { type: Number, required: true },
  maxAttendees: { type: Number },
  customers: [{ type: Schema.Types.ObjectId, ref: "Customer" }],
  attendees: { type: Number, default: 0 },
  category: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "completed", "cancelled", "scheduled"],
    default: "pending",
  },
  paymentType: {
    type: String,
    enum: ["online", "havale-eft", "paketten-tahsil"],
    default: "online",
  },
  isRecurring: { type: Boolean, default: false },
  recurringType: { type: String, enum: ["haftalık", "aylık"] },
  selectedClients: [
    {
      // `id` was previously required, but this caused validation failures for
      // older events that don't have `selectedClients.id` populated.
      // Make this optional (like in ServiceSchema/PackageSchema) to ensure
      // backward compatibility while still storing it when available.
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
      name: { type: String, required: true },
      email: { type: String, required: true },
      packages: [{ type: String }],
    },
  ],
  appointmentNotes: { type: String },
  files: [
    {
      name: { type: String, required: true },
      url: { type: String, required: true },
      type: { type: String, required: true },
      size: { type: String, required: true },
      uploadDate: { type: String, required: true },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const DiplomaSchema = new Schema({
  id: { type: String, default: uuidv4 },
  code: { type: String },
  identity: { type: Number },
});

const LanguageSchema = new Schema({
  id: { type: String, default: uuidv4 },
  lang: { type: Schema.Types.ObjectId, ref: "Language" },
  level: { type: Number },
});

const Language = mongoose.model("Language", new Schema({ name: String }));

const SubCategorySchema = new Schema({
  id: { type: String, default: uuidv4 },
  subCategory: { type: Schema.Types.ObjectId, ref: "SubCategory" },
});

const ExpertPackagesSchema = new Schema({
  hour: {
    selected: { type: Boolean, default: false },
    price: { type: Number },
  },
  ninety: {
    selected: { type: Boolean, default: false },
    price: { type: Number },
  },
});

const ExpertPaymentInfoSchema = new Schema({
  id: { type: String, default: uuidv4 },
  type: { type: Boolean, default: false },
  iban: { type: String },
  owner: { type: String },
  taxNumber: { type: String },
  taxOffice: { type: String },
});

// Services Schema
const ServiceSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  iconBg: { type: String, default: '' },
  price: { type: String, default: '0' },
  duration: { type: String, default: '0' },
  category: { type: String },
  features: [{ type: String }],
  date: { type: Date },
  time: { type: String },
  location: { type: String },
  platform: { type: String },
  eventType: {
    type: String,
    enum: ['online', 'offline', 'hybrid', ''],
    default: 'online'
  },
  meetingType: {
    type: String,
    enum: ['1-1', 'grup', '']
  },
  maxAttendees: { type: Number },
  isOfflineEvent: { type: Boolean, default: false },
  selectedClients: [{
    id: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    name: { type: String },
    email: { type: String }
  }],
  status: {
    type: String, enum: ['active', 'inactive', 'onhold', ''], default: 'inactive'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

//  packages Schema
const PackageSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, default: 0 },
  originalPrice: { type: Number },
  duration: { type: Number, default: 0 }, // in minutes (for session duration)
  appointmentCount: { type: Number, default: 1 }, // number of sessions/appointments
  sessionsIncluded: { type: Number }, // legacy field, can be same as appointmentCount
  category: {
    type: String,
    enum: ['egitim', 'danismanlik', 'workshop', 'mentorluk', ''],
    default: ''
  },
  eventType: {
    type: String,
    enum: ['online', 'offline', 'hybrid'],
    default: 'online'
  },
  meetingType: {
    type: String,
    enum: ['1-1', 'grup', ''],
    default: ''
  },
  platform: { type: String, default: '' },
  location: { type: String, default: '' },
  date: { type: Date },
  time: { type: String },
  maxAttendees: { type: Number },
  icon: { type: String, default: '📦' },
  iconBg: { type: String, default: 'bg-primary-100' },
  status: {
    type: String,
    enum: ['active', 'inactive', 'onhold'],
    default: 'active'
  },
  isAvailable: { type: Boolean, default: true },
  isPurchased: { type: Boolean, default: false },
  isOfflineEvent: { type: Boolean, default: false },
  selectedClients: [{
    id: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    name: { type: String },
    email: { type: String }
  }],
  features: [{ type: String }],
  validUntil: { type: Date },
  purchasedBy: [{
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    purchaseDate: { type: Date, default: Date.now },
    expiryDate: { type: Date },
    sessionsUsed: { type: Number, default: 0 }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// Gallery Files Schema
const GalleryFileSchema = new Schema({
  id: { type: String, default: uuidv4 },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  fileType: { type: String, required: true }, // 'image' or 'pdf'
  mimeType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  filePath: { type: String, required: true },
  fileUrl: { type: String, required: true },
  description: { type: String },
  isVisible: { type: Boolean, default: true },
  uploadedAt: { type: Date, default: Date.now },
});

// ---------------- Email Schema ----------------
const EmailSchema = new Schema({
  subject: { type: String, required: true },
  body: { type: String, required: true },
  recipients: { type: [String], default: [] }, // array of email addresses
  recipientType: { type: String, enum: ['all', 'selected'], default: 'all' },
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  lastError: { type: String, default: '' },
  sentAt: { type: Date }
});

// Extend EmailSchema for per-recipient tracking
EmailSchema.add({
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  failedRecipients: { type: [String], default: [] }
});

const SocialMediaSchema = new Schema({
  website: { type: String },
  linkedin: { type: String },
  twitter: { type: String },
  instagram: { type: String },
  youtube: { type: String },
  tiktok: { type: String },
  facebook: { type: String },
});

// ---------------- Customer System ----------------
const CustomerNoteSchema = new Schema({
  id: { type: String, default: uuidv4 },
  content: { type: String, required: true },
  author: {
    type: String,
    enum: ["expert", "customer", "system"],
    required: true,
  },
  authorName: { type: String, required: true },
  files: [
    {
      name: { type: String, required: true },
      type: { type: String, required: true },
      size: { type: String },
      url: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  isPrivate: { type: Boolean, default: false }, // Private notes only visible to expert
  tags: [{ type: String }], // For categorizing notes
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// const CustomerAppointmentSchema = new Schema({
//   id: { type: String, default: uuidv4 },
//   appointmentId: { type: String }, // Reference to main appointment
//   serviceId: { type: String },
//   serviceName: { type: String },
//   packageId: { type: String },
//   packageName: { type: String },
//   date: { type: Date, required: true },
//   time: { type: String, required: true },
//   duration: { type: Number }, // in minutes
//   status: {
//     type: String,
//     enum: ["scheduled", "completed", "cancelled", "no-show", "rescheduled"],
//     default: "scheduled",
//   },
//   meetingType: {
//     type: String,
//     enum: ["online", "in-person", "phone", ""],
//     default: "online",
//   },
//   meetingLink: { type: String },
//   location: { type: String },
//   price: { type: Number },
//   paymentStatus: {
//     type: String,
//     enum: ["pending", "paid", "refunded", "cancelled"],
//     default: "pending",
//   },
//   notes: { type: String }, // Session notes
//   rating: { type: Number, min: 1, max: 5 }, // Customer rating
//   feedback: { type: String }, // Customer feedback
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
// });

const cardSchema = new Schema({
  id: { type: String, default: uuidv4 },
  cardNumber: { type: String, required: true },
  cardHolderName: { type: String, required: true },
  cardExpiry: { type: String, required: true },
  cardCvv: { type: String, required: true },
});

// const CustomerSchema = new Schema({
//   id: { type: String, default: uuidv4 },
//   name: { type: String, required: true },
//   surname: { type: String, required: true },
//   email: { type: String, required: true },
//   phone: { type: String, required: true },

//   // Additional customer information
//   dateOfBirth: { type: Date },
//   gender: { type: String, enum: ["male", "female", "other", "prefer-not-to-say"] },
//   address: {
//     street: { type: String },
//     city: { type: String },
//     state: { type: String },
//     postalCode: { type: String },
//     country: { type: String },
//   },

//   // Professional information
//   occupation: { type: String },
//   company: { type: String },

//   // Customer preferences and settings
//   preferences: {
//     communicationMethod: {
//       type: String,
//       enum: ["email", "phone", "sms", "whatsapp"],
//       default: "email",
//     },
//     language: { type: String, default: "tr" },
//     timezone: { type: String, default: "Europe/Istanbul" },
//     reminderSettings: {
//       enabled: { type: Boolean, default: true },
//       beforeHours: { type: Number, default: 24 }, // Hours before appointment
//     },
//   },

//   // Customer status and categorization
//   status: {
//     type: String,
//     enum: ["active", "inactive", "blocked", "prospect"],
//     default: "active",
//   },
//   category: { type: String }, // Custom category for grouping customers
//   tags: [{ type: String }], // Custom tags for filtering

//   // Relationship and interaction tracking
//   source: {
//     type: String,
//     enum: ["website", "referral", "social-media", "advertisement", "walk-in", "other"],
//     default: "website",
//   },
//   referredBy: { type: String }, // Name of person who referred

//   // Appointment and service history
//   appointments: [CustomerAppointmentSchema],
//   totalAppointments: { type: Number, default: 0 },
//   completedAppointments: { type: Number, default: 0 },
//   cancelledAppointments: { type: Number, default: 0 },
//   noShowAppointments: { type: Number, default: 0 },

//   // Financial information
//   totalSpent: { type: Number, default: 0 },
//   outstandingBalance: { type: Number, default: 0 },
//   paymentMethod: { type: String },

//   // Communication and notes
//   notes: [CustomerNoteSchema],

//   // Important dates
//   firstAppointment: { type: Date },
//   lastAppointment: { type: Date },
//   lastContact: { type: Date },

//   // Customer satisfaction and feedback
//   averageRating: { type: Number, min: 0, max: 5, default: 0 },
//   totalRatings: { type: Number, default: 0 },

//   // Privacy and consent
//   consentGiven: {
//     dataProcessing: { type: Boolean, default: false },
//     marketing: { type: Boolean, default: false },
//     dateGiven: { type: Date },
//   },

//   // System fields
//   isArchived: { type: Boolean, default: false },
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
// });

// ---------------- User Schema ----------------


const UserSchema = new Schema(
  {
    pp: { type: String },
    ppFile: { type: String },
    information: {
      name: { type: String, required: true },
      surname: { type: String, required: true },
      birthday: { type: String },
      country: { type: String },
      city: { type: String }, // Added
      district: { type: String }, // Added
      address: { type: String },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      phone: { type: String, required: true },
      about: { type: String },
      trailerUrl: { type: String },
      identity: { type: Number },
      phoneCode: { type: String },
      gender: { type: String },
    },
    subscription: {
      id: { type: String, default: uuidv4 },
      institutionId: { type: Schema.Types.ObjectId, ref: "Institution" || null },
      seats: { type: Number, default: 0 },
      isAdmin: { type: Boolean, default: false },
      plantype: { type: String, enum: ["individual", "institutional"], required: true },
      price: { type: Number, required: true },
      duration: { type: String, enum: ["yearly", "monthly"], required: true },
      startDate: { type: Date, default: Date.now },
      endDate: { type: Date, default: Date.now },
    },
    cards: [cardSchema],
    socialMedia: { type: SocialMediaSchema, default: () => ({}) },
    video: { type: String },
    videoFile: { type: String },
    videoStatus: { type: Schema.Types.Mixed, default: null },
    title: { type: String },
    resume: {
      education: [EducationSchema],
    },
    titles: [Title],
    experience: [ExperienceSchema],
    certificates: [CertificateSchema],
    diploma: [DiplomaSchema],
    languages: [LanguageSchema],
    skills: [SkillSchema],

    expertInformation: {
      percentage: { type: String },
      subs: [SubCategorySchema],
      category: { type: Schema.Types.ObjectId, ref: "Category" },
      image: { type: String },
      subMerchantID: { type: String },
    },
    username: { type: String, },
    fiveMin: { type: Boolean, default: true },
    expertPackages: ExpertPackagesSchema,

    // New fields for services, packages, and gallery
    services: [ServiceSchema],
    packages: [PackageSchema],
    galleryFiles: [GalleryFileSchema],
    emails: [EmailSchema],
    // customers: [CustomerSchema],
    customers: [{
      customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
      isArchived: { type: Boolean, default: false },
      addedAt: { type: Date, default: Date.now }
    }],

    //Orders 
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],



    // Calendar and availability data
    availability: { type: AvailabilitySchema, default: () => ({}) },
    appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: "CustomerAppointments" }],
    calendarProviders: [CalendarProviderSchema],
    appointmentMappings: [AppointmentMappingSchema],

    // Events system
    events: [EventSchema],

    // Blog system
    blogs: [BlogSchema],

    // Forms system
    forms: [FormSchema],

    // Customers system
    // customers: [CustomerSchema],

    vacationMode: { type: Boolean, default: false },
    expertType: { type: Boolean, default: false },
    expertAvaible: { type: Boolean, default: true },
    expertAvaibleHours: { type: Schema.Types.Mixed },
    expertPaymentInfo: ExpertPaymentInfoSchema,
    phoneVerifyCode: { type: Number },
    lastSend: { type: Date },
    lastOnline: { type: Date },
    tokenEmail: { type: Number },
    accountType: { type: Boolean, default: true },
    star: { type: Number, default: 0 },
    is_suspended: { type: Boolean, default: false },
    is_protected: { type: Boolean, default: false },
    is_phone_valid: { type: Boolean, default: false },
    is_mail_valid: { type: Boolean, default: false },
    is_verified: { type: Boolean, default: false },
    is_freezed: {
      date: { type: Number, default: 0 },
      status: { type: Boolean, default: false },
    },
    notification: {
      offer: { type: Boolean, default: true },
      blog: { type: Boolean, default: true },
      notificationWeb: { type: Boolean, default: true },
    },
    cardInfo: { type: Array, default: [] },
    favorites: { type: Array, default: [] },
    lastLogin: { type: String },
    token: { type: String },
    is_waiting: { type: Number, default: 0 },
    agreement: {
      status: { type: Boolean, default: false },
      date: { type: String },
    },
    hourlyPrice: { type: Number, default: 0 },
    refCode: { type: String },

    // Password reset fields
    resetPasswordOTP: { type: String },
    resetPasswordExpiry: { type: Date },

    // Email verification fields
    emailVerificationToken: { type: String },
    emailVerificationExpiry: { type: Date },

    // Sub-user system fields
    parentUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    isSubUser: { type: Boolean, default: false },
    subUserPermissions: [{
      type: String,
      enum: ['appointments', 'customers', 'reports', 'services', 'packages', 'calendar', 'emails']
    }],
    subUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Hash password before save
UserSchema.pre("save", async function (next) {
  if (!this.isModified("information.password")) return next();
  this.information.password = await bcrypt.hash(this.information.password, 10);
  next();
});

// Compare password method
UserSchema.methods.ComparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.information.password);
};

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access-secret";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh-secret";

//Generate Access token
UserSchema.methods.generateAccessToken = function () {
  return jwt.sign({ id: this._id }, ACCESS_TOKEN_SECRET, { expiresIn: "45m" });
};

//Generate Refresh tokens
UserSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ id: this._id }, REFRESH_TOKEN_SECRET, { expiresIn: "30d" });
};


// Verify Access Token
UserSchema.methods.verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

// Verify Refresh Token
UserSchema.methods.verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
};


const User = mongoose.model("User", UserSchema);
export default User;

// Also export individual schemas for potential separate use
export {
  Title,
  EducationSchema,
  ExperienceSchema,
  CertificateSchema,
  SkillSchema,
  // AppointmentSchema,
  AvailabilitySchema,
  CalendarProviderSchema,
  AppointmentMappingSchema,
  FormFieldSchema,
  FormResponseSchema,
  FormSchema,
  BlogSchema,
  EventSchema,
  DiplomaSchema,
  LanguageSchema,
  SubCategorySchema,
  ExpertPackagesSchema,
  ExpertPaymentInfoSchema,
  ServiceSchema,
  PackageSchema,
  GalleryFileSchema,
  // CustomerSchema,
  SocialMediaSchema,
  CustomerNoteSchema,
  // CustomerAppointmentSchema,
  // CustomerSchema,
};