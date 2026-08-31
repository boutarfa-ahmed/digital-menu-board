// Central error handler. Routes used to answer with `err.message` straight from
// Prisma, leaking table and column names; in production the client now gets a
// generic message for 5xx errors while the detail stays in the server log.
// 4xx errors (validation, bad input) are meant for the client and pass through
// in every environment.
//
// Takes `isProduction` as a parameter instead of importing config/env directly
// so tests can exercise both branches without touching real environment state.
function errorHandler({ isProduction }) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    console.error('[error]', req.method, req.originalUrl, err);
    const status = err.status || 500;
    res.status(status).json({
      error: isProduction && status >= 500 ? 'Internal server error' : err.message,
    });
  };
}

module.exports = errorHandler;
