/**
 * Bổ sung field do middleware gán (Express 5: không được ghi đè req.query).
 */
declare global {
  namespace Express {
    interface Request {
      /** Dữ liệu query đã parse/validate — từ validate(schema, 'query') */
      validatedQuery?: unknown;
    }
  }
}

export {};
