import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";


const { Schema } = mongoose;

const Title = new Schema({
  id: { type: String, default: uuidv4 },
  title: {type : String},
  description: {type : String},
})

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
  start: { type: Number },
  end: { type: Number, default: null },
  stillWork: { type: Boolean, default: false },
  country: { type: Schema.Types.ObjectId, ref: "Country" },
  city: { type: Schema.Types.ObjectId, ref: "City" },
});

const CertificateSchema = new Schema({
  id: { type: String, default: uuidv4 },
  name: { type: String },
  company: { type: String },
  country: { type: Schema.Types.ObjectId, ref: "Country" },
  city: { type: Schema.Types.ObjectId, ref: "City" },
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
});


// ---------------- Main Schema ----------------
const UserSchema = new Schema(
  {
    password: { type: String, required: true }, // hashed
    pp: { type: String }, // profile pic URL
    ppFile: { type: String },

    information: {
      name: { type: String },
      birthday: { type: String },
      country: { type: Schema.Types.ObjectId, ref: "Country" },
      city: { type: Schema.Types.ObjectId, ref: "City" },
      district: { type: Schema.Types.ObjectId, ref: "District" },
      address: { type: String },
      email: { type: String },
      phone: { type: String },
      about: { type: String },
      trailerUrl: { type: String },
      identity: { type: Number },
      phoneCode: { type: String },
      gender: { type: String },
    },

    video: { type: String },
    videoFile: { type: String },
    videoStatus: { type: Schema.Types.Mixed, default: null },

    title: { type: String },
    blogs: { type: Number, default: 0 },

    resume: {
      education: [EducationSchema],
    },
    titles: [Title],
    experience: [ExperienceSchema],
    certificates: [CertificateSchema],
    diploma: [DiplomaSchema],
    languages: [LanguageSchema],

    expertInformation: {
      percentage: { type: String },
      subs: [SubCategorySchema],
      category: { type: Schema.Types.ObjectId, ref: "Category" },
      image: { type: String },
      subMerchantID: { type: String },
    },

    username: { type: String, unique: true },
    fiveMin: { type: Boolean, default: true },

    expertPackages: ExpertPackagesSchema,

    vacationMode: { type: Boolean, default: false },
    expertType: { type: Boolean, default: false },
    expertAvaible: { type: Boolean, default: true },
    expertAvaibleHours: { type: Schema.Types.Mixed }, // flexible object

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
    is_waiting: { type: Number, default: 0 }, // 0 waiting, 1 approved, 2 rejected

    agreement: {
      status: { type: Boolean, default: false },
      date: { type: String },
    },

    hourlyPrice: { type: Number, default: 0 },
    refCode: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Title", Title);
