class apiError extends Error {
  constructor(
    message = "Something went wrong",
    statusCode,
    errors = [],
    stack = "",
  ) {
    super(message); // Call the parent constructor with the message and we are overriding the default message
    this.statusCode = statusCode;
    this.errors = errors;
    this.stack = stack;
    this.data = null; // Initialize data to null
    this.success = false; // Initialize success to false

    if (stack) {
        this.stack = stack; // If a stack trace is provided, set it to the instance
    } else {
        Error.captureStackTrace(this, this.constructor); // Capture the stack trace if not provided
    }
  }
}

export { apiError };
