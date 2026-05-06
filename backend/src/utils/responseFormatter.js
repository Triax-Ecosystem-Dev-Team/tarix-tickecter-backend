const sendResponse = (res, statusCode, data = {}, message = "") => {
  res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    data,
    message,
  });
};

module.exports = { sendResponse };
