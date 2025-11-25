// Recommendation controller
// Handles ML-based training recommendations and manual overrides

const Recommendation = require('../models/Recommendation');
const Employee = require('../models/Employee');
const Course = require('../models/Course');
const axios = require('axios');

// @desc    Get recommendations for an employee
// @route   GET /api/recommendations/employee/:employeeId
// @access  Private
exports.getEmployeeRecommendations = async (req, res, next) => {
  try {
    const recommendations = await Recommendation.find({
      employee_id: req.params.employeeId,
    })
      .populate('course_id')
      .populate('employee_id')
      .sort({ rank: 1 });

    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all recommendations
// @route   GET /api/recommendations
// @access  Private
exports.getAllRecommendations = async (req, res, next) => {
  try {
    const recommendations = await Recommendation.find()
      .populate('course_id')
      .populate('employee_id')
      .sort({ generated_at: -1 });

    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate recommendations for an employee using ML engine
// @route   POST /api/recommendations/generate/:employeeId
// @access  Private
exports.generateRecommendations = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.employeeId)
      .populate('training_history.course_id');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Get all available courses for recommendations
    const allCourses = await Course.find({ isActive: true })
      .select('_id title department required_skills target_experience_level duration')
      .lean();
    
    if (allCourses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active courses available for recommendations'
      });
    }

    // Check if custom data is provided in request body
    let employeeData;
    if (req.body.customData) {
      // Use custom data from frontend
      employeeData = {
        skills: req.body.customData.skills || employee.skills.map(skill => ({
          name: skill.name,
          level: skill.level,
        })),
        experience: req.body.customData.experience !== undefined ? req.body.customData.experience : employee.experience.years,
        department: req.body.customData.department || employee.department.name,
        location: req.body.customData.location || employee.location || 'Unknown',
        training_history: req.body.customData.training_history || (employee.training_history ? employee.training_history.map(t => ({
          course_id: t.course_id ? t.course_id._id || t.course_id : null,
          completion_date: t.completion_date,
          assessment_score: t.assessment_score
        })) : []),
        dept_critical_skills: req.body.customData.dept_critical_skills || employee.department.critical_skills || [],
        courses: allCourses
      };
    } else {
      // Prepare enhanced employee data for ML engine v2
      employeeData = {
        skills: employee.skills.map(skill => ({
          name: skill.name,
          level: skill.level,
        })),
        experience: employee.experience.years,
        department: employee.department.name,
        location: employee.location || 'Unknown',
        // NEW: Enhanced data for hybrid system
        training_history: employee.training_history ? employee.training_history.map(t => ({
          course_id: t.course_id ? t.course_id._id || t.course_id : null,
          completion_date: t.completion_date,
          assessment_score: t.assessment_score
        })) : [],
        dept_critical_skills: employee.department.critical_skills || [],
        // Include courses for ranking
        courses: allCourses
      };
    }

    // Call ML engine API v2 (enhanced hybrid system)
    const mlEngineUrl = process.env.ML_ENGINE_URL || 'http://localhost:5001';
    let mlResponse;

    try {
      // Try new v2 endpoint first
      mlResponse = await axios.post(`${mlEngineUrl}/api/recommend-v2`, employeeData, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (mlError) {
      console.error('ML Engine V2 Error:', mlError.message);
      
      // Fallback to v1 if v2 fails
      try {
        console.log('Falling back to v1 API...');
        const simpleData = {
          skills: employeeData.skills,
          experience: employeeData.experience,
          department: employeeData.department,
          location: employeeData.location
        };
        
        mlResponse = await axios.post(`${mlEngineUrl}/api/recommend`, simpleData, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        // Map v1 response to course IDs
        const v1Recommendations = mlResponse.data.recommendations;
        const mappedRecommendations = v1Recommendations.slice(0, Math.min(v1Recommendations.length, allCourses.length)).map((rec, index) => {
          const courseIndex = parseInt(rec.course_id) % allCourses.length;
          const actualCourse = allCourses[courseIndex];
          
          return {
            course_id: actualCourse._id,
            final_score: rec.confidence_score,
            rank: index + 1,
            ml_confidence: rec.confidence_score,
            rule_score: 0,
            breakdown: {},
            explanation: null
          };
        });
        
        mlResponse.data.recommendations = mappedRecommendations;
        
      } catch (fallbackError) {
        console.error('ML Engine Fallback Error:', fallbackError.message);
        return res.status(503).json({
          success: false,
          message: 'ML engine is unavailable',
          error: process.env.NODE_ENV === 'development' ? fallbackError.message : undefined,
        });
      }
    }

    const recommendations = mlResponse.data.recommendations;

    // Delete existing recommendations for this employee
    await Recommendation.deleteMany({ employee_id: employee._id });

    // Save recommendations with enhanced metadata
    const savedRecommendations = await Recommendation.insertMany(
      recommendations.map((rec) => ({
        employee_id: employee._id,
        course_id: rec.course_id,
        confidence_score: rec.final_score || rec.confidence_score,
        rank: rec.rank,
        status: 'Pending',
        // NEW: Save hybrid system metadata and explanations
        metadata: {
          ml_confidence: rec.ml_confidence,
          rule_score: rec.rule_score,
          breakdown: rec.breakdown,
          explanation: rec.explanation,
          method: mlResponse.data.method || 'hybrid_system'
        }
      }))
    );

    // Populate course details for response
    const populatedRecommendations = await Recommendation.find({
      _id: { $in: savedRecommendations.map(r => r._id) }
    })
      .populate('course_id')
      .populate('employee_id');

    res.status(200).json({
      success: true,
      count: populatedRecommendations.length,
      data: populatedRecommendations,
      method: mlResponse.data.method || 'v1'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update recommendation (manual override)
// @route   PUT /api/recommendations/:id
// @access  Private
exports.updateRecommendation = async (req, res, next) => {
  try {
    const { override_flag, override_reason, status } = req.body;

    const recommendation = await Recommendation.findByIdAndUpdate(
      req.params.id,
      {
        override_flag: override_flag !== undefined ? override_flag : undefined,
        override_reason: override_reason || undefined,
        status: status || undefined,
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate('course_id').populate('employee_id');

    if (!recommendation) {
      return res.status(404).json({ message: 'Recommendation not found' });
    }

    res.status(200).json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Batch generate recommendations for all employees
// @route   POST /api/recommendations/batch-generate
// @access  Private
exports.batchGenerateRecommendations = async (req, res, next) => {
  try {
    const employees = await Employee.find().populate('training_history.course_id');
    const mlEngineUrl = process.env.ML_ENGINE_URL || 'http://localhost:5001';
    
    // Get all available courses once for efficiency
    const allCourses = await Course.find({ isActive: true })
      .select('_id title department required_skills target_experience_level duration')
      .lean();
    
    if (allCourses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active courses available for recommendations'
      });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const employee of employees) {
      try {
        const employeeData = {
          skills: employee.skills.map(skill => ({
            name: skill.name,
            level: skill.level,
          })),
          experience: employee.experience.years,
          department: employee.department.name,
          location: employee.location || 'Unknown',
          training_history: employee.training_history ? employee.training_history.map(t => ({
            course_id: t.course_id ? t.course_id._id || t.course_id : null,
            completion_date: t.completion_date,
            assessment_score: t.assessment_score
          })) : [],
          dept_critical_skills: employee.department.critical_skills || [],
          courses: allCourses
        };

        let mlResponse;
        try {
          // Try v2 first
          mlResponse = await axios.post(`${mlEngineUrl}/api/recommend-v2`, employeeData, {
            timeout: 15000,
          });
        } catch (v2Error) {
          // Fallback to v1
          const simpleData = {
            skills: employeeData.skills,
            experience: employeeData.experience,
            department: employeeData.department,
            location: employeeData.location
          };
          mlResponse = await axios.post(`${mlEngineUrl}/api/recommend`, simpleData, {
            timeout: 10000,
          });
          
          // Map v1 response
          const v1Recs = mlResponse.data.recommendations;
          mlResponse.data.recommendations = v1Recs.slice(0, Math.min(v1Recs.length, allCourses.length)).map((rec, index) => {
            const courseIndex = parseInt(rec.course_id) % allCourses.length;
            return {
              course_id: allCourses[courseIndex]._id,
              final_score: rec.confidence_score,
              rank: index + 1,
              ml_confidence: rec.confidence_score,
              rule_score: 0,
              breakdown: {},
              explanation: null
            };
          });
        }

        await Recommendation.deleteMany({ employee_id: employee._id });

        await Recommendation.insertMany(
          mlResponse.data.recommendations.map((rec) => ({
            employee_id: employee._id,
            course_id: rec.course_id,
            confidence_score: rec.final_score || rec.confidence_score,
            rank: rec.rank,
            status: 'Pending',
            metadata: {
              ml_confidence: rec.ml_confidence,
              rule_score: rec.rule_score,
              breakdown: rec.breakdown,
              explanation: rec.explanation,
              method: mlResponse.data.method || 'batch'
            }
          }))
        );

        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Error generating recommendations for employee ${employee._id}:`, error.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Batch generation completed`,
      successCount,
      errorCount,
    });
  } catch (error) {
    next(error);
  }
};

