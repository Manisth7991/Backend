
// By Promises Method

const asyncHandler = (requestHandler) => {
    return async (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((error) => next(error));
    };
};

export { asyncHandler };








// By Try catch Method

// const asyncHandler = () =>{};
// const asyncHandler = (func) => {() => {}};
// const asyncHandler = (func) => async () => {}

// const asyncHandler = (func) => async (req, res, next) => {
//   try {
//     await func(req, res, next);
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Internal Server Error',
//     });
//     next(error);
//   }
// };