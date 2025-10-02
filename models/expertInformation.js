import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const { Schema } = mongoose;

const Title = new Schema({
  id: { type: String, default: uuidv4 },
  title: { type: String },
  description: { type: String },
});

const CustomerSchema = new Schema({
  id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// ---------------- Sub-Schemas ----------------
const EducationSchema = new Schema({
  id: { type: String, default: uuidv4 },
  level: { type: String },
  university: { type: Schema.Types.ObjectId, ref: "University" },
  name: { type: String }, // university name
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
  country: { type: Schema.Types.ObjectId, ref: "Country" },
  city: { type: Schema.Types.ObjectId, ref: "City" }, // Added to match population
});

const CertificateSchema = new Schema({
  id: { type: String, default: uuidv4 },
  name: { type: String },
  company: { type: String },
  country: { type: Schema.Types.ObjectId, ref: "Country" },
  city: { type: Schema.Types.ObjectId, ref: "City" }, // Added to match population
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
    id: { type: Number },
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
    id: { type: Number },
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

const UserSchema = new Schema(
  {
    password: { type: String, required: true },
    pp: { type: String },
    ppFile: { type: String },
    information: {
      name: { type: String, required: true },
      surname: { type: String, required: true },
      birthday: { type: String },
      country: { type: Schema.Types.ObjectId, ref: "Country" },
      city: { type: Schema.Types.ObjectId, ref: "City" }, // Added
      district: { type: Schema.Types.ObjectId, ref: "District" }, // Added
      address: { type: String },
      email: { type: String, required: true, unique: true },
      phone: { type: String, required: true },
      about: { type: String },
      trailerUrl: { type: String },
      identity: { type: Number },
      phoneCode: { type: String },
      gender: { type: String },
    },
    socialMedia: { type: SocialMediaSchema, default: () => ({}) },
    video: { type: String },
    videoFile: { type: String },
    videoStatus: { type: Schema.Types.Mixed, default: null },
    title: { type: String },
    blogs: [BlogSchema],
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
    username: { type: String, unique: true, required: true },
    fiveMin: { type: Boolean, default: true },
    expertPackages: ExpertPackagesSchema,

    // New fields for services, packages, and gallery
    services: [ServiceSchema],
    packages: [PackageSchema],
    galleryFiles: [GalleryFileSchema],
    emails: [EmailSchema],
    customers: [CustomerSchema],

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
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
export default User;


// Also export individual schemas for potential separate use
export {
  Title,
  EducationSchema,
  ExperienceSchema,
  CertificateSchema,
  ServiceSchema,
  PackageSchema,
  GalleryFileSchema,
  CustomerSchema,
  SocialMediaSchema,
};
