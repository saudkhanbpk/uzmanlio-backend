import mongoose, { Mongoose } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import BlogSchema from "./Blog.js";


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



const cardSchema = new Schema({
  id: { type: String, default: uuidv4 },
  cardNumber: { type: String },
  cardHolderName: { type: String },
  cardExpiry: { type: String },
  cardCvv: { type: String },
  billingInfo: {
    companyName: { type: String },
    taxNumber: { type: String },
    taxOffice: { type: String },
    address: { type: String },
    city: { type: String },
    district: { type: String },
    phoneNumber: { type: String }
  }
});


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
      password: { type: String },
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
    eventRepetitionWarnings: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventRepetitionWarning"
    }],
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
    // Services and Packages now stored in separate collections with ObjectId references
    services: [{ type: Schema.Types.ObjectId, ref: "Service" }],
    packages: [{ type: Schema.Types.ObjectId, ref: "Package" }],
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
    calendarProviders: [CalendarProviderSchema],


    // Events system
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
    blogs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Blog" }],
    // Forms system
    forms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Form" }],

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
    refreshToken: { type: String }, // Added for JWT refresh token flow
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

// Add index for faster email lookups during login
UserSchema.index({ "information.email": 1 });

// Hash password before save
// Using salt rounds of 8 for better performance while maintaining security
// (10 rounds is ~4x slower, 8 rounds is still cryptographically secure)
UserSchema.pre("save", async function (next) {
  if (!this.isModified("information.password")) return next();
  this.information.password = await bcrypt.hash(this.information.password, 8);
  next();
});

// Compare password method
UserSchema.methods.ComparePassword = async function (candidatePassword) {
  // Defensive check: ensure both password and hash exist
  if (!candidatePassword || !this.information.password) {
    console.error("❌ ComparePassword: Missing password data", {
      hasCandidate: !!candidatePassword,
      hasStored: !!this.information.password,
      userId: this._id
    });
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.information.password);
};

// Token secrets - fallback provided but should be set in .env for production
if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  console.warn("⚠️ WARNING: Token secrets not set in .env - using fallback values. Set ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET for production!");
}

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

//Generate Access token
UserSchema.methods.generateAccessToken = function () {
  return jwt.sign({ id: this._id }, ACCESS_TOKEN_SECRET, { expiresIn: "10m" });
};

//Generate Refresh tokens
UserSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ id: this._id }, REFRESH_TOKEN_SECRET, { expiresIn: "2h" });
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
  AvailabilitySchema,
  CalendarProviderSchema,

  DiplomaSchema,
  LanguageSchema,
  SubCategorySchema,
  ExpertPackagesSchema,
  ExpertPaymentInfoSchema,

  GalleryFileSchema,
  SocialMediaSchema,
  CustomerNoteSchema,
};
