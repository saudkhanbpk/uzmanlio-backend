// debug Middleware to log requests
export const requestLogger = (req, res, next) => {
  console.log(`\n${req.method} ${req.url}`);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  next();
};
