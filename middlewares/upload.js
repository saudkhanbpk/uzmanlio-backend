import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates a configured multer instance with customizable options
 * @param {Object} options - Configuration options
 * @param {string} options.uploadPath - Path where files will be stored (relative to project root)
 * @param {string} options.fieldName - Field name for the file input (default: 'files')
 * @param {number} options.maxFiles - Maximum number of files (default: 10)
 * @param {number} options.maxFileSize - Maximum file size in MB (default: 5)
 * @param {Array<string>} options.allowedExtensions - Allowed file extensions (default: ['jpg', 'jpeg', 'png', 'gif'])
 * @param {Array<string>} options.allowedMimeTypes - Allowed MIME types (optional, derived from extensions if not provided)
 * @param {Function} options.fileNameGenerator - Custom filename generator function
 * @param {boolean} options.preserveOriginalName - Keep original filename (default: false)
 * @param {string} options.fileNamePrefix - Prefix for generated filenames
 * @param {string} options.fileNameSuffix - Suffix for generated filenames
 * @param {Object} options.metadata - Additional metadata to attach to files
 * @returns {multer} Configured multer instance
 */
export const createMulterUpload = (options = {}) => {
  const {
    uploadPath = "uploads/general",
    fieldName = "files",
    maxFiles = 50,
    maxFileSize = 50, // in 50MB
    allowedExtensions = ["jpg", "jpeg", "png", "gif"],
    allowedMimeTypes = null,
    fileNameGenerator = null,
    preserveOriginalName = false,
    fileNamePrefix = "",
    fileNameSuffix = "",
    metadata = {},
  } = options;

  // Create upload directory
  const uploadDir = path.join(__dirname, "..", ...uploadPath.split("/"));
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("Created upload directory:", uploadDir);
  }

  // Build regex for allowed extensions
  const extensionRegex = new RegExp(
    `\\.(${allowedExtensions.join("|")})$`,
    "i"
  );

  // Default MIME types based on common extensions
  const defaultMimeTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain",
    csv: "text/csv",
    zip: "application/zip",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
    wav: "audio/wav",
  };

  // Build allowed MIME types array
  const getAllowedMimeTypes = () => {
    if (allowedMimeTypes && allowedMimeTypes.length > 0) {
      return allowedMimeTypes;
    }
    return allowedExtensions
      .map((ext) => defaultMimeTypes[ext.toLowerCase()])
      .filter(Boolean);
  };

  const mimeTypesArray = getAllowedMimeTypes();

  // Storage configuration
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      // Allow dynamic path based on request
      let finalPath = uploadDir;
      if (req.uploadPath) {
        finalPath = path.join(__dirname, "..", ...req.uploadPath.split("/"));
        if (!fs.existsSync(finalPath)) {
          fs.mkdirSync(finalPath, { recursive: true });
        }
      }

      // Attach metadata to request for later use
      req.fileMetadata = metadata;

      cb(null, finalPath);
    },
    filename: function (req, file, cb) {
      let filename;

      if (preserveOriginalName) {
        // Sanitize original filename
        filename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      } else if (fileNameGenerator && typeof fileNameGenerator === "function") {
        // Use custom filename generator
        filename = fileNameGenerator(req, file);
      } else {
        // Default filename generation
        const timestamp = Date.now();
        const randomString = Math.round(Math.random() * 1e9);
        const extension = path.extname(file.originalname).toLowerCase();
        const baseName = path.basename(file.originalname, extension);

        // Build filename with optional prefix/suffix
        const parts = [
          fileNamePrefix,
          req.params?.customerId || req.body?.userId || "user",
          timestamp,
          randomString,
          fileNameSuffix,
        ].filter(Boolean);

        filename = `${parts.join("-")}${extension}`;
      }

      // Ensure filename is safe
      filename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

      cb(null, filename);
    },
  });

  // File filter
  const fileFilter = (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const hasValidExtension = extensionRegex.test(file.originalname);
    const hasValidMimeType = mimeTypesArray.includes(file.mimetype);

    if (hasValidExtension && hasValidMimeType) {
      return cb(null, true);
    }

    const errorMessage = `Invalid file type. Only ${allowedExtensions.join(
      ", "
    ).toUpperCase()} files are allowed.`;
    cb(new Error(errorMessage));
  };

  // Create multer instance
  const upload = multer({
    storage,
    limits: {
      fileSize: maxFileSize * 1024 * 1024, // Convert MB to bytes
      files: maxFiles,
    },
    fileFilter,
  });

  // Return different upload types based on field configuration
  return {
    single: (fieldNameOverride) => upload.single(fieldNameOverride || fieldName),
    array: (fieldNameOverride, maxCount) =>
      upload.array(fieldNameOverride || fieldName, maxCount || maxFiles),
    fields: (fields) => upload.fields(fields),
    none: () => upload.none(),
    any: () => upload.any(),
  };
};

// Pre-configured upload instances for common use cases
export const uploadConfigs = {
  // Profile images
  profileImage: createMulterUpload({
    uploadPath: "uploads/profiles",
    fieldName: "profileImage",
    maxFiles: 1,
    maxFileSize: 15,
    allowedExtensions: ["jpg", "jpeg", "png", "gif"],
    fileNamePrefix: "profile",
  }),

  // Document uploads
  documents: createMulterUpload({
    uploadPath: "uploads/documents",
    fieldName: "documents",
    maxFiles: 10,
    maxFileSize: 50,
    allowedExtensions: ["pdf", "doc", "docx", "txt", "mp4", "mp3"],
    fileNamePrefix: "doc",
  }),

  // Booking attachments
  bookingFiles: createMulterUpload({
    uploadPath: "uploads/bookings",
    fieldName: "files",
    maxFiles: 10,
    maxFileSize: 50,
    allowedExtensions: ["jpg", "jpeg", "png", "pdf", "doc", "docx"],
    fileNameGenerator: (req, file) => {
      const customerId = req.params?.customerId || "unknown";
      const bookingId = req.body?.bookingId || Date.now();
      const ext = path.extname(file.originalname);
      return `booking-${customerId}-${bookingId}-${Date.now()}${ext}`;
    },
  }),

  // General file uploads
  general: createMulterUpload({
    uploadPath: "uploads/general",
    fieldName: "file",
    maxFiles: 1,
    maxFileSize: 5,
    allowedExtensions: ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx",],
  }),
};

// Middleware to handle multer errors
export const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File too large",
        message: `File size should not exceed ${req.maxFileSize || 5}MB`,
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        error: "Too many files",
        message: `Maximum ${req.maxFiles || 10} files allowed`,
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        error: "Unexpected field",
        message: "File field name is incorrect",
      });
    }
  } else if (error) {
    return res.status(500).json({
      success: false,
      error: "Upload failed",
      message: error.message,
    });
  }
  next();
};

// Helper function to delete uploaded files (useful for cleanup)
export const deleteUploadedFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting file:", err);
        reject(err);
      } else {
        console.log("File deleted successfully:", filePath);
        resolve(true);
      }
    });
  });
};

// Helper to get file info
export const getFileInfo = (file) => {
  return {
    originalName: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    sizeInMB: (file.size / (1024 * 1024)).toFixed(2),
    path: file.path,
    destination: file.destination,
  };
};