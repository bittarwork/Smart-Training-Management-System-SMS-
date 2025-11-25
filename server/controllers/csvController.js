// CSV controller
// Handles CSV file upload and parsing for bulk employee import

const csv = require('csv-parser');
const fs = require('fs');
const multer = require('multer');
const Employee = require('../models/Employee');

// Configure multer for file uploads
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use absolute path to avoid issues
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Preserve original filename with timestamp to avoid conflicts
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `employees-${Date.now()}-${originalName}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Middleware for file upload
exports.uploadCSV = upload.single('file');

// @desc    Parse and import employees from CSV
// @route   POST /api/employees/upload
// @access  Private
exports.parseCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate file exists
    if (!fs.existsSync(req.file.path)) {
      return res.status(404).json({ message: 'Uploaded file not found. Please try uploading again.' });
    }

    const results = [];
    const errors = [];

    // Read and parse CSV file
    const fileStream = fs.createReadStream(req.file.path);
    
    fileStream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          const importedEmployees = [];
          const skippedEmployees = [];

          for (const row of results) {
            try {
              // Validate required fields
              if (!row.employee_id || !row.name || !row.email || !row.department) {
                skippedEmployees.push({
                  row,
                  reason: 'Missing required fields',
                });
                continue;
              }

              // Parse skills if provided
              let skills = [];
              if (row.skills) {
                try {
                  skills = JSON.parse(row.skills);
                } catch {
                  // If not JSON, try comma-separated
                  skills = row.skills.split(',').map(skill => ({
                    name: skill.trim(),
                    level: parseInt(row[`${skill.trim()}_level`]) || 3,
                  }));
                }
              }

              // Limit skills to 15
              if (skills.length > 15) {
                skills = skills.slice(0, 15);
              }

              // Create employee
              const employeeData = {
                employee_id: row.employee_id.trim(),
                name: row.name.trim(),
                email: row.email.trim().toLowerCase(),
                department: {
                  name: row.department.trim(),
                  subgroup: row.department_subgroup?.trim(),
                  critical_skills: row.critical_skills
                    ? row.critical_skills.split(',').map(s => s.trim())
                    : [],
                },
                skills: skills,
                experience: {
                  years: parseInt(row.experience_years) || 0,
                  domain: row.experience_domain?.trim(),
                },
                location: row.location?.trim(),
              };

              // Check if employee already exists
              const existingEmployee = await Employee.findOne({
                employee_id: employeeData.employee_id,
              });

              if (existingEmployee) {
                // Update existing employee
                await Employee.findByIdAndUpdate(existingEmployee._id, employeeData);
                importedEmployees.push({ employee_id: employeeData.employee_id, action: 'updated' });
              } else {
                // Create new employee
                const employee = await Employee.create(employeeData);
                importedEmployees.push({ employee_id: employeeData.employee_id, action: 'created' });
              }
            } catch (error) {
              skippedEmployees.push({
                row,
                reason: error.message,
              });
            }
          }

          // Delete uploaded file after successful processing
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch (cleanupError) {
            console.error('Error cleaning up uploaded file:', cleanupError);
            // Don't fail the request if cleanup fails
          }

          res.status(200).json({
            success: true,
            message: 'CSV import completed successfully',
            imported: importedEmployees.length,
            skipped: skippedEmployees.length,
            details: {
              imported: importedEmployees,
              skipped: skippedEmployees,
            },
          });
        } catch (error) {
          // Clean up file on error
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch (cleanupError) {
            console.error('Error cleaning up file after error:', cleanupError);
          }
          next(error);
        }
      })
      .on('error', (error) => {
        // Clean up file on stream error
        try {
          if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up file after stream error:', cleanupError);
        }
        next(error);
      });
  } catch (error) {
    // Clean up file on outer catch error
    try {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up file in outer catch:', cleanupError);
    }
    next(error);
  }
};

