class apiResponse{
    constructor(statusCode, message="Success", data = null) {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.success = statusCode >= 200 && statusCode < 400; // Determine success based on status code
    }
}
export { apiResponse };