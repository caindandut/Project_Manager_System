export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/** 400 - Dữ liệu gửi lên không hợp lệ (validation) */
export class ValidationError extends AppError {
  constructor(message: string = 'Dữ liệu không hợp lệ') {
    super(message, 400);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/** 401 - Chưa đăng nhập */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Chưa đăng nhập') {
    super(message, 401);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/** 403 - Không có quyền truy cập */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Bạn không có quyền thực hiện thao tác này') {
    super(message, 403);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/** 404 - Không tìm thấy tài nguyên */
export class NotFoundError extends AppError {
  constructor(message: string = 'Không tìm thấy') {
    super(message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
