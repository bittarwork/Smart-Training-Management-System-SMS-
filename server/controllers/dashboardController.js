// Dashboard controller
// Handles dashboard statistics and analytics endpoints

const TrainingHistory = require('../models/TrainingHistory');
const Employee = require('../models/Employee');
const Course = require('../models/Course');
const Recommendation = require('../models/Recommendation');
const axios = require('axios');

/**
 * Retrieve aggregated dashboard statistics such as training counts and recommendations.
 * @route GET /api/dashboard/stats
 * @access Private
 */
exports.getStats = async (req, res, next) => {
  try {
    // Get training history statistics
    const totalTrainingRecords = await TrainingHistory.countDocuments();
    const completedTraining = await TrainingHistory.countDocuments({ status: 'Completed' });
    const inProgressTraining = await TrainingHistory.countDocuments({ status: 'In Progress' });
    const failedTraining = await TrainingHistory.countDocuments({ status: 'Failed' });

    // Get employee count
    const totalEmployees = await Employee.countDocuments();

    // Get course statistics
    const totalCourses = await Course.countDocuments();
    const activeCourses = await Course.countDocuments({ isActive: true });

    // Get recommendation statistics
    const totalRecommendations = await Recommendation.countDocuments();
    const pendingRecommendations = await Recommendation.countDocuments({ status: 'Pending' });
    const acceptedRecommendations = await Recommendation.countDocuments({ status: 'Accepted' });

    res.status(200).json({
      success: true,
      data: {
        training: {
          total: totalTrainingRecords,
          completed: completedTraining,
          inProgress: inProgressTraining,
          failed: failedTraining,
        },
        employees: totalEmployees,
        courses: {
          total: totalCourses,
          active: activeCourses,
        },
        recommendations: {
          total: totalRecommendations,
          pending: pendingRecommendations,
          accepted: acceptedRecommendations,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch the latest mixed activity feed from recommendations and training records.
 * @route GET /api/dashboard/recent-activities
 * @access Private
 */
exports.getRecentActivities = async (req, res, next) => {
  try {
    const recentRecommendations = await Recommendation.find()
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('employee_id', 'name')
      .populate('course_id', 'title');

    const recentTrainings = await TrainingHistory.find()
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('employee_id', 'name')
      .populate('course_id', 'title');

    const recommendationActivities = recentRecommendations.map((rec) => {
      let type = 'recommendation_generated';
      let message = `New recommendation: ${rec.course_id?.title || 'Course'} for ${rec.employee_id?.name || 'Employee'}`;
      let timestamp = rec.generated_at || rec.updatedAt;

      if (rec.status === 'Accepted') {
        type = 'recommendation_accepted';
        message = `${rec.employee_id?.name || 'Employee'} accepted ${rec.course_id?.title || 'course'} recommendation`;
        timestamp = rec.updatedAt || rec.generated_at;
      } else if (rec.status === 'Completed') {
        type = 'recommendation_completed';
        message = `${rec.employee_id?.name || 'Employee'} completed recommended course ${rec.course_id?.title || 'course'}`;
      } else if (rec.status === 'Rejected') {
        type = 'recommendation_rejected';
        message = `${rec.employee_id?.name || 'Employee'} rejected ${rec.course_id?.title || 'course'} recommendation`;
      }

      return {
        type,
        message,
        date: timestamp,
        meta: {
          employee: rec.employee_id?.name,
          course: rec.course_id?.title,
          status: rec.status,
        },
      };
    });

    const trainingActivities = recentTrainings.map((record) => {
      let type = 'training_started';
      let message = `${record.employee_id?.name || 'Employee'} started ${record.course_id?.title || 'course'}`;

      if (record.status === 'Completed') {
        type = 'training_completed';
        message = `${record.employee_id?.name || 'Employee'} completed ${record.course_id?.title || 'course'}`;
      } else if (record.status === 'Failed') {
        type = 'training_failed';
        message = `${record.employee_id?.name || 'Employee'} could not complete ${record.course_id?.title || 'course'}`;
      } else if (record.status === 'Not Started') {
        type = 'training_not_started';
      }

      return {
        type,
        message,
        date: record.updatedAt || record.start_date,
        meta: {
          employee: record.employee_id?.name,
          course: record.course_id?.title,
          status: record.status,
          progress: record.progress,
        },
      };
    });

    const activities = [...recommendationActivities, ...trainingActivities]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Proxy ML metrics from the Python service to the dashboard.
 * @route GET /api/dashboard/ml-metrics
 * @access Private
 */
exports.getMLMetrics = async (req, res, next) => {
  try {
    // Get ML engine URL from environment variables
    const mlEngineUrl = process.env.ML_ENGINE_URL || 'http://localhost:5001';
    
    // Fetch metrics from ML engine
    const response = await axios.get(`${mlEngineUrl}/api/ml/metrics`, {
      timeout: 5000 // 5 second timeout
    });
    
    if (response.data.success) {
      res.status(200).json({
        success: true,
        data: response.data.metrics
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'ML metrics not available',
        message: 'Model needs to be trained first'
      });
    }
  } catch (error) {
    // Handle different error scenarios
    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({
        success: false,
        error: 'ML Engine is not running',
        message: 'Please start the ML engine service'
      });
    } else if (error.response && error.response.status === 404) {
      res.status(404).json({
        success: false,
        error: 'ML metrics not found',
        message: 'Train the model to generate metrics'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Error fetching ML metrics',
        message: 'Unable to retrieve ML performance metrics'
      });
    }
  }
};

