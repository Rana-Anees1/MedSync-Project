import mongoose from 'mongoose';
import multer from 'multer';
import { ApiError } from '../utils/http.js';

export const notFound = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;
  if (err instanceof mongoose.Error.ValidationError) {
    status = 400; message = 'Validation failed';
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400; message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409; message = `${Object.keys(err.keyValue || {}).join(', ') || 'Value'} already exists`;
  } else if (err instanceof multer.MulterError) {
    status = 400; message = err.code === 'LIMIT_FILE_SIZE' ? 'File is larger than 5 MB' : err.message;
  }
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ success: false, error: { message, ...(details ? { details } : {}) } });
};
export { ApiError };
