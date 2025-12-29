/**
 * Centralized Request Validation Middleware
 * ==========================================
 * This middleware validates incoming requests using Joi schemas.
 * It supports validation of body, params, query, and headers.
 */

/**
 * Creates a validation middleware for the given schema configuration
 * @param {Object} schemaConfig - Object containing validation schemas
 * @param {Object} schemaConfig.body - Joi schema for request body
 * @param {Object} schemaConfig.params - Joi schema for request params
 * @param {Object} schemaConfig.query - Joi schema for request query
 * @param {Object} schemaConfig.headers - Joi schema for request headers
 * @returns {Function} Express middleware function
 */
export const validateRequest = (schemaConfig) => {
  return async (req, res, next) => {
    const errors = [];

    // Default Joi validation options
    const validationOptions = {
      abortEarly: false, // Report all errors, not just the first one
      stripUnknown: true, // Remove unknown keys from validated data
      convert: true, // Type coercion
    };

    // Validate body if schema provided
    if (schemaConfig.body) {
      const { error, value } = schemaConfig.body.validate(req.body, validationOptions);
      if (error) {
        errors.push(...formatJoiErrors(error, 'body'));
      } else {
        Object.defineProperty(req, 'body', { value, writable: true, configurable: true, enumerable: true });
      }
    }

    // Validate params if schema provided
    if (schemaConfig.params) {
      const { error, value } = schemaConfig.params.validate(req.params, validationOptions);
      if (error) {
        errors.push(...formatJoiErrors(error, 'params'));
      } else {
        Object.defineProperty(req, 'params', { value, writable: true, configurable: true, enumerable: true });
      }
    }

    // Validate query if schema provided
    if (schemaConfig.query) {
      const { error, value } = schemaConfig.query.validate(req.query, validationOptions);
      if (error) {
        errors.push(...formatJoiErrors(error, 'query'));
      } else {
        Object.defineProperty(req, 'query', { value, writable: true, configurable: true, enumerable: true });
      }
    }

    // Validate headers if schema provided (custom headers only)
    if (schemaConfig.headers) {
      const customHeaders = extractCustomHeaders(req.headers);
      const { error, value } = schemaConfig.headers.validate(customHeaders, {
        ...validationOptions,
        stripUnknown: false, // Don't strip unknown headers
      });
      if (error) {
        errors.push(...formatJoiErrors(error, 'headers'));
      }
    }

    // If there are errors, return 400 with structured error response
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors,
        errorCount: errors.length,
      });
    }

    next();
  };
};

/**
 * Formats Joi error details into a structured error array
 * @param {Object} joiError - Joi validation error object
 * @param {string} source - Source of the validation (body, params, query, headers)
 * @returns {Array} Array of formatted error objects
 */
const formatJoiErrors = (joiError, source) => {
  return joiError.details.map((detail) => ({
    field: detail.path.join('.'),
    message: detail.message.replace(/"/g, ''),
    source: source,
    type: detail.type,
  }));
};

/**
 * Extracts custom headers (x- prefixed or specific ones)
 * @param {Object} headers - Request headers object
 * @returns {Object} Filtered headers object
 */
const extractCustomHeaders = (headers) => {
  const customHeaders = {};
  const relevantHeaders = [
    'x-client-id',
    'x-api-key',
    'x-request-id',
    'x-forwarded-for',
    'content-type',
    'accept-language',
  ];

  for (const key of Object.keys(headers)) {
    if (key.startsWith('x-') || relevantHeaders.includes(key.toLowerCase())) {
      customHeaders[key.toLowerCase()] = headers[key];
    }
  }

  return customHeaders;
};

/**
 * Quick validation helper for simple body-only validation
 * @param {Object} schema - Joi schema for request body
 * @returns {Function} Express middleware function
 */
export const validateBody = (schema) => validateRequest({ body: schema });

/**
 * Quick validation helper for params-only validation
 * @param {Object} schema - Joi schema for request params
 * @returns {Function} Express middleware function
 */
export const validateParams = (schema) => validateRequest({ params: schema });

/**
 * Quick validation helper for query-only validation
 * @param {Object} schema - Joi schema for request query
 * @returns {Function} Express middleware function
 */
export const validateQuery = (schema) => validateRequest({ query: schema });

export default validateRequest;
