/**
 * Controller for application health check endpoint.
 * Returns server status, timestamp, and environment.
 */
const getHealthStatus = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'RideTogether API Server is operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
};

module.exports = {
  getHealthStatus
};
