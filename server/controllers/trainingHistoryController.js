// Training History controller
// Handles CRUD operations for employee training records

const TrainingHistory = require('../models/TrainingHistory');
const Employee = require('../models/Employee');
const Course = require('../models/Course');

/**
 * Get paginated training history records with advanced filtering.
 * @route GET /api/training-history
 * @access Private
 * @param {Object} req.query Filtering options (employeeId, courseId, status, startDate, endDate, page, limit)
 */
exports.getAllTrainingHistory = async (req, res, next) => {
  try {
    const {
      employeeId,
      courseId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 100,
    } = req.query;

    // Build filter query dynamically to avoid unnecessary conditions
    const filter = {};
    
    if (employeeId) {
      filter.employee_id = employeeId;
    }
    
    if (courseId) {
      filter.course_id = courseId;
    }
    
    if (status) {
      filter.status = status;
    }

    // Date range filtering
    if (startDate || endDate) {
      filter.start_date = {};
      if (startDate) {
        filter.start_date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.start_date.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Fetch training history with population
    const trainingHistory = await TrainingHistory.find(filter)
      .populate('employee_id', 'name email department')
      .populate('course_id', 'title duration department')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const total = await TrainingHistory.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: trainingHistory.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: trainingHistory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single training history record by ID.
 * @route GET /api/training-history/:id
 * @access Private
 */
exports.getTrainingHistoryById = async (req, res, next) => {
  try {
    const trainingHistory = await TrainingHistory.findById(req.params.id)
      .populate('employee_id', 'name email department skills')
      .populate('course_id', 'title description duration department');

    if (!trainingHistory) {
      return res.status(404).json({
        success: false,
        error: 'Training history record not found',
      });
    }

    res.status(200).json({
      success: true,
      data: trainingHistory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new training history record after validating employee and course references.
 * @route POST /api/training-history
 * @access Private (Admin, Manager)
 */
exports.createTrainingHistory = async (req, res, next) => {
  try {
    const {
      employee_id,
      course_id,
      start_date,
      completion_date,
      assessment_score,
      status,
      progress,
      feedback,
    } = req.body;

    // Validate employee exists
    const employee = await Employee.findById(employee_id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
      });
    }

    // Validate course exists
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    // Prevent overlapping active training records for the same employee/course
    const existingRecord = await TrainingHistory.findOne({
      employee_id,
      course_id,
      status: { $in: ['Not Started', 'In Progress'] },
    });

    if (existingRecord) {
      return res.status(400).json({
        success: false,
        error: 'Active training record already exists for this employee and course',
      });
    }

    // Create training history record
    const trainingHistory = await TrainingHistory.create({
      employee_id,
      course_id,
      start_date: start_date || Date.now(),
      completion_date,
      assessment_score,
      status: status || 'Not Started',
      progress: progress || 0,
      feedback,
    });

    // Populate fields before sending response
    const populatedRecord = await TrainingHistory.findById(trainingHistory._id)
      .populate('employee_id', 'name email department')
      .populate('course_id', 'title duration department');

    res.status(201).json({
      success: true,
      data: populatedRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update mutable fields of a training history record.
 * @route PUT /api/training-history/:id
 * @access Private (Admin, Manager)
 */
exports.updateTrainingHistory = async (req, res, next) => {
  try {
    let trainingHistory = await TrainingHistory.findById(req.params.id);

    if (!trainingHistory) {
      return res.status(404).json({
        success: false,
        error: 'Training history record not found',
      });
    }

    const {
      start_date,
      completion_date,
      assessment_score,
      status,
      progress,
      feedback,
    } = req.body;

    // Update fields
    if (start_date !== undefined) trainingHistory.start_date = start_date;
    if (completion_date !== undefined) trainingHistory.completion_date = completion_date;
    if (assessment_score !== undefined) trainingHistory.assessment_score = assessment_score;
    if (status !== undefined) trainingHistory.status = status;
    if (progress !== undefined) trainingHistory.progress = progress;
    if (feedback !== undefined) trainingHistory.feedback = feedback;

    // Auto-update progress based on status
    if (status === 'Completed' && progress !== 100) {
      trainingHistory.progress = 100;
      if (!completion_date) {
        trainingHistory.completion_date = Date.now();
      }
    } else if (status === 'Not Started' && progress !== 0) {
      trainingHistory.progress = 0;
    }

    await trainingHistory.save();

    // Populate fields
    const updatedRecord = await TrainingHistory.findById(trainingHistory._id)
      .populate('employee_id', 'name email department')
      .populate('course_id', 'title duration department');

    res.status(200).json({
      success: true,
      data: updatedRecord,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete training history record
// @route   DELETE /api/training-history/:id
// @access  Private
exports.deleteTrainingHistory = async (req, res, next) => {
  try {
    const trainingHistory = await TrainingHistory.findById(req.params.id);

    if (!trainingHistory) {
      return res.status(404).json({
        success: false,
        error: 'Training history record not found',
      });
    }

    await trainingHistory.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Training history record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get training history statistics
// @route   GET /api/training-history/stats/overview
// @access  Private
exports.getTrainingStats = async (req, res, next) => {
  try {
    const { employeeId } = req.query;

    const filter = employeeId ? { employee_id: employeeId } : {};

    // Get status distribution
    const statusStats = await TrainingHistory.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgScore: { $avg: '$assessment_score' },
          avgProgress: { $avg: '$progress' },
        },
      },
    ]);

    // Get total records
    const total = await TrainingHistory.countDocuments(filter);

    // Get average completion time (for completed trainings)
    const completedTrainings = await TrainingHistory.find({
      ...filter,
      status: 'Completed',
      start_date: { $exists: true },
      completion_date: { $exists: true },
    });

    let avgCompletionDays = 0;
    if (completedTrainings.length > 0) {
      const totalDays = completedTrainings.reduce((sum, record) => {
        const days = Math.ceil(
          (new Date(record.completion_date) - new Date(record.start_date)) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0);
      avgCompletionDays = Math.round(totalDays / completedTrainings.length);
    }

    res.status(200).json({
      success: true,
      data: {
        total,
        statusStats,
        avgCompletionDays,
      },
    });
  } catch (error) {
    next(error);
  }
};

