// Report controller
// Handles report generation (PDF/CSV/Excel) and scheduled email delivery

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Employee = require('../models/Employee');
const Course = require('../models/Course');
const Recommendation = require('../models/Recommendation');
const TrainingHistory = require('../models/TrainingHistory');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// @desc    Generate monthly training participation report
// @route   GET /api/reports/participation
// @access  Private
/**
 * Normalize month/year query params to safe integer values.
 * @param {Object} param0 month/year strings supplied by the UI
 */
const parseMonthYear = ({ month, year }) => {
  const currentDate = new Date();
  const parsedMonth = month ? parseInt(month, 10) : currentDate.getMonth() + 1;
  const parsedYear = year ? parseInt(year, 10) : currentDate.getFullYear();
  return {
    month: Math.min(Math.max(parsedMonth, 1), 12),
    year: parsedYear,
  };
};

/**
 * Build an inclusive date range for a given month/year pair.
 */
const buildDateRange = (month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate, endDate };
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Participation analytics grouped by department within a month.
 * @route GET /api/reports/participation
 */
exports.getParticipationReport = async (req, res, next) => {
  try {
    const { month, year } = parseMonthYear(req.query);
    const { startDate, endDate } = buildDateRange(month, year);

    const trainingRecords = await TrainingHistory.find({
      completion_date: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate('employee_id')
      .populate('course_id');

    const participationByDepartment = {};
    trainingRecords.forEach((record) => {
      const dept = record.employee_id?.department?.name || 'Unknown';
      if (!participationByDepartment[dept]) {
        participationByDepartment[dept] = {
          total: 0,
          completed: 0,
          inProgress: 0,
        };
      }
      participationByDepartment[dept].total++;
      if (record.status === 'Completed') {
        participationByDepartment[dept].completed++;
      } else if (record.status === 'In Progress') {
        participationByDepartment[dept].inProgress++;
      }
    });

    res.status(200).json({
      success: true,
      period: {
        month,
        year,
      },
      data: {
        totalRecords: trainingRecords.length,
        byDepartment: participationByDepartment,
        records: trainingRecords,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate skill gap analysis report
// @route   GET /api/reports/skill-gaps
// @access  Private
/**
 * Calculate missing skill counts per department for all employees.
 * @route GET /api/reports/skill-gaps
 */
exports.getSkillGapReport = async (req, res, next) => {
  try {
    const employees = await Employee.find();
    const courses = await Course.find();

    const skillGaps = {};

    employees.forEach((employee) => {
      const dept = employee.department.name;
      if (!skillGaps[dept]) {
        skillGaps[dept] = {};
      }

      // Get required skills for department
      const requiredSkills = employee.department.critical_skills || [];
      const employeeSkills = employee.skills.map(s => s.name);

      requiredSkills.forEach((skill) => {
        if (!employeeSkills.includes(skill)) {
          if (!skillGaps[dept][skill]) {
            skillGaps[dept][skill] = 0;
          }
          skillGaps[dept][skill]++;
        }
      });
    });

    res.status(200).json({
      success: true,
      data: skillGaps,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate course completion report
// @route   GET /api/reports/completion
// @access  Private
/**
 * Course completion metrics across all recommendations/training history.
 * @route GET /api/reports/completion
 */
exports.getCompletionReport = async (req, res, next) => {
  try {
    const courses = await Course.find();
    const completionStats = [];

    for (const course of courses) {
      const totalEnrollments = await Recommendation.countDocuments({
        course_id: course._id,
      });

      const completed = await TrainingHistory.countDocuments({
        course_id: course._id,
        status: 'Completed',
      });

      const completionRate = totalEnrollments > 0 ? (completed / totalEnrollments) * 100 : 0;

      completionStats.push({
        course: {
          id: course._id,
          title: course.title,
          department: course.department,
        },
        totalEnrollments,
        completed,
        completionRate: Math.round(completionRate * 100) / 100,
      });
    }

    res.status(200).json({
      success: true,
      data: completionStats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export report as PDF
// @route   GET /api/reports/export/pdf
// @access  Private
/**
 * Generate a downloadable PDF for the requested report type.
 * @route GET /api/reports/export/pdf
 */
exports.exportPDF = async (req, res, next) => {
  try {
    const { type } = req.query; // participation, skill-gaps, completion

    const doc = new PDFDocument();
    const filename = `report-${type}-${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../temp', filename);

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    doc.pipe(fs.createWriteStream(filepath));

    // Add content based on report type
    doc.fontSize(20).text('Training Management System Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Report Type: ${type}`, { align: 'center' });
    doc.moveDown();

    // Add report-specific content
    if (type === 'participation') {
      const { month, year } = parseMonthYear(req.query);
      const targetDate = new Date(year, month - 1, 1);
      doc.fontSize(12).text(`Participation Report for ${targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
      doc.moveDown();
      doc.text('Report data will be populated here.');
    } else {
      doc.fontSize(12).text('Report content');
    }

    doc.end();

    // Wait for PDF to be written
    doc.on('end', () => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.sendFile(filepath, (err) => {
        if (err) {
          next(err);
        } else {
          // Clean up file after sending
          setTimeout(() => {
            if (fs.existsSync(filepath)) {
              fs.unlinkSync(filepath);
            }
          }, 5000);
        }
      });
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to escape CSV values
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If value contains comma, quotes, or newline, wrap in quotes and escape existing quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  // Return as-is if no special characters (more standard CSV format)
  return str;
};

const buildCSVContent = (headers, rows) => {
  const lines = [
    headers.map((header) => escapeCSV(header)).join(','),
    ...rows.map((row) => row.map((value) => escapeCSV(value)).join(',')),
  ];
  return lines.join('\n');
};

// @desc    Export report as CSV
// @route   GET /api/reports/export/csv
// @access  Private
/**
 * Stream CSV exports for multiple report types (participation, skills, completion, employees, recommendations).
 * @route GET /api/reports/export/csv
 */
exports.exportCSV = async (req, res, next) => {
  try {
    const { type } = req.query;
    const bom = '\ufeff'; // Ensure Excel compatibility (UTF-8 BOM)
    let csvData = '';
    let filename = '';

    if (type === 'participation') {
      const { month, year } = parseMonthYear(req.query);
      const { startDate, endDate } = buildDateRange(month, year);

      const records = await TrainingHistory.find({
        completion_date: { $gte: startDate, $lte: endDate },
      })
        .populate('employee_id')
        .populate('course_id');

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Training Participation');
      
      // Define styles
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF7B1FA2' } // Purple
        },
        alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      };
      
      const dataStyle = {
        alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
        border: {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        }
      };
      
      const headers = [
        'Employee Name',
        'Employee ID',
        'Department',
        'Course Title',
        'Status',
        'Progress (%)',
        'Start Date',
        'Completion Date',
        'Duration (Days)',
      ];
      
      // Add header row
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.style = headerStyle;
      });
      headerRow.height = 25;
      
      // Add data rows
      const rows = records.map((record, index) => {
        const startDate = record.start_date ? new Date(record.start_date) : null;
        const completionDate = record.completion_date ? new Date(record.completion_date) : null;
        const duration = startDate && completionDate 
          ? Math.ceil((completionDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          : '';
        
        return [
          record.employee_id?.name || 'Unknown',
          record.employee_id?.employee_id || '',
          record.employee_id?.department?.name || 'Unknown',
          record.course_id?.title || 'Unknown',
          record.status,
          record.progress ?? 0,
          formatDate(record.start_date),
          formatDate(record.completion_date),
          duration,
        ];
      });
      
      rows.forEach((rowData, index) => {
        const row = worksheet.addRow(rowData);
        row.eachCell((cell, colNumber) => {
          cell.style = dataStyle;
          
          // Status column coloring
          if (colNumber === 5) {
            if (rowData[4] === 'Completed') {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFC6EFCE' } // Light green
              };
            } else if (rowData[4] === 'In Progress') {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFD966' } // Light yellow
              };
            } else if (rowData[4] === 'Failed') {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFC7CE' } // Light red
              };
            }
          }
          
          // Progress column
          if (colNumber === 6) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.numFmt = '#,##0"%"';
          }
          
          // Alternate row colors
          if (index % 2 === 0 && colNumber !== 5) {
            cell.style.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9F9F9' }
            };
          }
        });
        row.height = 20;
      });
      
      // Set column widths
      worksheet.columns = [
        { width: 25 }, // Employee Name
        { width: 15 }, // Employee ID
        { width: 20 }, // Department
        { width: 35 }, // Course Title
        { width: 15 }, // Status
        { width: 12 }, // Progress
        { width: 15 }, // Start Date
        { width: 15 }, // Completion Date
        { width: 15 }, // Duration
      ];
      
      // Freeze header row
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      
      // Add summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRow([`Training Participation Report - ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`]);
      summarySheet.addRow(['']);
      summarySheet.addRow(['Total Records', records.length]);
      summarySheet.addRow(['Completed', records.filter(r => r.status === 'Completed').length]);
      summarySheet.addRow(['In Progress', records.filter(r => r.status === 'In Progress').length]);
      summarySheet.addRow(['Failed', records.filter(r => r.status === 'Failed').length]);
      summarySheet.addRow(['']);
      
      // Department breakdown
      const deptStats = {};
      records.forEach(r => {
        const dept = r.employee_id?.department?.name || 'Unknown';
        deptStats[dept] = (deptStats[dept] || 0) + 1;
      });
      
      summarySheet.addRow(['Department Breakdown']);
      Object.keys(deptStats).sort().forEach(dept => {
        summarySheet.addRow([dept, deptStats[dept]]);
      });
      
      summarySheet.getRow(1).font = { bold: true, size: 14 };
      summarySheet.columns = [{ width: 25 }, { width: 15 }];
      
      const excelBuffer = await workbook.xlsx.writeBuffer();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Training_Participation_${month}-${year}.xlsx"`);
      res.send(excelBuffer);
      return;
    } else if (type === 'skill-gaps') {
      const employees = await Employee.find();
      
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Skill Gaps');
      
      // Define styles
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF9800' } // Orange
        },
        alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      };
      
      const dataStyle = {
        alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
        border: {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        }
      };
      
      const headers = ['Department', 'Employee ID', 'Employee Name', 'Missing Skill', 'Skill Priority'];
      
      // Add header row
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.style = headerStyle;
      });
      headerRow.height = 25;
      
      // Build skill gap data
      const skillRows = [];
      employees.forEach((employee) => {
        const dept = employee.department?.name || 'Unknown';
        const requiredSkills = employee.department?.critical_skills || [];
        const employeeSkills = employee.skills.map((skill) => skill.name);

        requiredSkills.forEach((skill) => {
          if (!employeeSkills.includes(skill)) {
            skillRows.push([
              dept,
              employee.employee_id,
              employee.name,
              skill,
              'Critical'
            ]);
          }
        });
      });
      
      // Add data rows
      skillRows.forEach((rowData, index) => {
        const row = worksheet.addRow(rowData);
        row.eachCell((cell, colNumber) => {
          cell.style = dataStyle;
          
          // Priority column
          if (colNumber === 5) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFC7CE' } // Light red
            };
            cell.font = { bold: true };
          }
          
          // Alternate row colors
          if (index % 2 === 0 && colNumber !== 5) {
            cell.style.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9F9F9' }
            };
          }
        });
        row.height = 20;
      });
      
      // Set column widths
      worksheet.columns = [
        { width: 20 }, // Department
        { width: 15 }, // Employee ID
        { width: 25 }, // Employee Name
        { width: 30 }, // Missing Skill
        { width: 15 }, // Priority
      ];
      
      // Freeze header row
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      
      // Add summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRow(['Skill Gap Analysis Report']);
      summarySheet.addRow(['']);
      summarySheet.addRow(['Total Skill Gaps', skillRows.length]);
      summarySheet.addRow(['Affected Employees', new Set(skillRows.map(r => r[2])).size]);
      summarySheet.addRow(['']);
      
      // Department breakdown
      const deptGaps = {};
      skillRows.forEach(row => {
        const dept = row[0];
        deptGaps[dept] = (deptGaps[dept] || 0) + 1;
      });
      
      summarySheet.addRow(['Skill Gaps by Department']);
      Object.keys(deptGaps).sort().forEach(dept => {
        summarySheet.addRow([dept, deptGaps[dept]]);
      });
      
      summarySheet.getRow(1).font = { bold: true, size: 14 };
      summarySheet.columns = [{ width: 25 }, { width: 15 }];
      
      const excelBuffer = await workbook.xlsx.writeBuffer();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Skill_Gap_Analysis_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(excelBuffer);
      return;
    } else if (type === 'completion') {
      const courses = await Course.find();
      
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Course Completion');
      
      // Define styles
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF009688' } // Teal
        },
        alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      };
      
      const dataStyle = {
        alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
        border: {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        }
      };
      
      const headers = [
        'Course Title',
        'Department',
        'Total Enrollments',
        'Completed',
        'In Progress',
        'Failed',
        'Completion Rate (%)',
        'Average Progress (%)',
      ];
      
      // Add header row
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.style = headerStyle;
      });
      headerRow.height = 25;
      
      // Build data
      const rows = [];
      for (const course of courses) {
        const totalEnrollments = await Recommendation.countDocuments({
          course_id: course._id,
        });

        const completed = await TrainingHistory.countDocuments({
          course_id: course._id,
          status: 'Completed',
        });
        
        const inProgress = await TrainingHistory.countDocuments({
          course_id: course._id,
          status: 'In Progress',
        });
        
        const failed = await TrainingHistory.countDocuments({
          course_id: course._id,
          status: 'Failed',
        });
        
        const trainingRecords = await TrainingHistory.find({
          course_id: course._id,
        });
        
        const avgProgress = trainingRecords.length > 0
          ? trainingRecords.reduce((sum, r) => sum + (r.progress || 0), 0) / trainingRecords.length
          : 0;

        const completionRate =
          totalEnrollments > 0
            ? ((completed / totalEnrollments) * 100)
            : 0;

        rows.push([
          course.title,
          course.department,
          totalEnrollments,
          completed,
          inProgress,
          failed,
          completionRate,
          avgProgress,
        ]);
      }
      
      // Add data rows
      rows.forEach((rowData, index) => {
        const row = worksheet.addRow(rowData);
        row.eachCell((cell, colNumber) => {
          cell.style = dataStyle;
          
          // Number columns
          if (colNumber >= 3 && colNumber <= 6) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.numFmt = '#,##0';
          }
          
          // Percentage columns
          if (colNumber === 7 || colNumber === 8) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.numFmt = '0.00"%"';
            
            // Color coding for completion rate
            if (colNumber === 7) {
              const rate = rowData[6];
              if (rate >= 80) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFC6EFCE' } // Light green
                };
              } else if (rate >= 50) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFFFD966' } // Light yellow
                };
              } else {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFFFC7CE' } // Light red
                };
              }
            }
          }
          
          // Alternate row colors
          if (index % 2 === 0 && colNumber !== 7) {
            if (!cell.style.fill || cell.style.fill.fgColor.argb === 'FFF9F9F9') {
              cell.style.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF9F9F9' }
              };
            }
          }
        });
        row.height = 20;
      });
      
      // Set column widths
      worksheet.columns = [
        { width: 35 }, // Course Title
        { width: 20 }, // Department
        { width: 18 }, // Total Enrollments
        { width: 12 }, // Completed
        { width: 12 }, // In Progress
        { width: 12 }, // Failed
        { width: 18 }, // Completion Rate
        { width: 18 }, // Average Progress
      ];
      
      // Freeze header row
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      
      // Add summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRow(['Course Completion Report']);
      summarySheet.addRow(['']);
      summarySheet.addRow(['Total Courses', courses.length]);
      summarySheet.addRow(['Total Enrollments', rows.reduce((sum, r) => sum + r[2], 0)]);
      summarySheet.addRow(['Total Completed', rows.reduce((sum, r) => sum + r[3], 0)]);
      summarySheet.addRow(['Total In Progress', rows.reduce((sum, r) => sum + r[4], 0)]);
      summarySheet.addRow(['Total Failed', rows.reduce((sum, r) => sum + r[5], 0)]);
      
      summarySheet.getRow(1).font = { bold: true, size: 14 };
      summarySheet.columns = [{ width: 25 }, { width: 15 }];
      
      const excelBuffer = await workbook.xlsx.writeBuffer();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Course_Completion_Report_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(excelBuffer);
      return;
    } else if (type === 'employees') {
      const employees = await Employee.find().sort({ name: 1 });
      
      // Define skill categories for better organization
      const technicalSkills = ['Python', 'JavaScript', 'Java', 'SQL', 'React', 'Node.js', 'TypeScript', 
                               'Angular', 'Vue.js', 'C#', 'PHP', 'Docker', 'Kubernetes', 'AWS', 
                               'CI/CD', 'Git', 'MongoDB', 'Cybersecurity', 'Network Security', 
                               'Penetration Testing'];
      const businessSkills = ['Project Management', 'Agile', 'Scrum', 'Leadership', 'Communication', 
                            'Negotiation', 'Sales Strategy', 'Market Research', 'Brand Strategy', 
                            'Content Marketing', 'SEO', 'Social Media', 'CRM'];
      const hrSkills = ['Talent Acquisition', 'Interviewing', 'HR Analytics', 'Training Design', 
                       'Learning Management', 'Performance Management'];
      const financeSkills = ['Financial Analysis', 'Accounting', 'Tax Planning', 'Internal Audit', 
                            'Risk Management', 'Compliance'];
      const operationsSkills = ['Supply Chain Management', 'Logistics', 'Inventory Management', 
                               'Quality Control', 'Process Improvement'];
      
      // Build comprehensive headers with organized structure
      const headers = [
        'Employee ID',
        'Full Name',
        'Email Address',
        'Department',
        'Department Subgroup',
        'Experience (Years)',
        'Experience Domain',
        'Location',
        'Total Skills',
        'Average Skill Level',
        'Highest Skill Level',
        'Technical Skills',
        'Business Skills',
        'HR Skills',
        'Finance Skills',
        'Operations Skills',
        'Other Skills',
        'All Skills (Detailed)',
      ];
      
      // Helper function to categorize and format skills
      const categorizeSkills = (skills) => {
        const categorized = {
          technical: [],
          business: [],
          hr: [],
          finance: [],
          operations: [],
          other: []
        };
        
        if (skills && skills.length > 0) {
          skills.forEach(skill => {
            const skillName = skill.name;
            const skillLevel = skill.level;
            // Use clearer format: "Skill Name - Level X"
            const skillFormatted = { name: skillName, level: skillLevel };
            
            if (technicalSkills.includes(skillName)) {
              categorized.technical.push(skillFormatted);
            } else if (businessSkills.includes(skillName)) {
              categorized.business.push(skillFormatted);
            } else if (hrSkills.includes(skillName)) {
              categorized.hr.push(skillFormatted);
            } else if (financeSkills.includes(skillName)) {
              categorized.finance.push(skillFormatted);
            } else if (operationsSkills.includes(skillName)) {
              categorized.operations.push(skillFormatted);
            } else {
              categorized.other.push(skillFormatted);
            }
          });
        }
        
        return categorized;
      };
      
      // Build rows with organized and formatted data
      const rows = employees.map((emp) => {
        const skillCount = emp.skills?.length || 0;
        let totalLevel = 0;
        let maxLevel = 0;
        
        // Calculate statistics
        if (emp.skills && emp.skills.length > 0) {
          emp.skills.forEach(skill => {
            totalLevel += skill.level;
            if (skill.level > maxLevel) {
              maxLevel = skill.level;
            }
          });
        }
        
        const avgLevel = skillCount > 0 ? parseFloat((totalLevel / skillCount).toFixed(1)) : 0;
        
        // Categorize skills
        const categorized = categorizeSkills(emp.skills);
        
        // Format skills by category (sorted by level descending, then alphabetically)
        const formatCategory = (categorySkills) => {
          if (categorySkills.length === 0) return '';
          // Sort by level descending, then by name
          return categorySkills
            .sort((a, b) => {
              if (b.level !== a.level) {
                return b.level - a.level; // Higher level first
              }
              return a.name.localeCompare(b.name); // Alphabetical if same level
            })
            .map(s => `${s.name} - Level ${s.level}`)
            .join(' | ');
        };
        
        // Create detailed skills list (all skills sorted by level)
        const allSkillsDetailed = emp.skills && emp.skills.length > 0
          ? emp.skills
              .sort((a, b) => {
                if (b.level !== a.level) {
                  return b.level - a.level;
                }
                return a.name.localeCompare(b.name);
              })
              .map(s => `${s.name} (Level ${s.level})`)
              .join(' | ')
          : '';
        
        return [
          emp.employee_id || '',
          emp.name || '',
          emp.email || '',
          emp.department?.name || '',
          emp.department?.subgroup || '',
          emp.experience?.years || 0,
          emp.experience?.domain || '',
          emp.location || '',
          skillCount,
          avgLevel,
          maxLevel || '',
          formatCategory(categorized.technical),
          formatCategory(categorized.business),
          formatCategory(categorized.hr),
          formatCategory(categorized.finance),
          formatCategory(categorized.operations),
          formatCategory(categorized.other),
          allSkillsDetailed,
        ];
      });
      
      // For employees, export as Excel instead of CSV for better formatting
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Employees');
      
      // Define styles
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' } // Blue background
        },
        alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        }
      };
      
      const dataStyle = {
        alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
        border: {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        }
      };
      
      const numberStyle = {
        ...dataStyle,
        alignment: { vertical: 'middle', horizontal: 'center' },
        numFmt: '#,##0'
      };
      
      const decimalStyle = {
        ...dataStyle,
        alignment: { vertical: 'middle', horizontal: 'center' },
        numFmt: '#,##0.0'
      };
      
      // Add header row
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell, colNumber) => {
        cell.style = headerStyle;
      });
      headerRow.height = 25;
      
      // Add data rows
      rows.forEach((rowData, index) => {
        const row = worksheet.addRow(rowData);
        row.eachCell((cell, colNumber) => {
          // Apply different styles based on column type
          if (colNumber <= 8) {
            // Basic info columns
            cell.style = dataStyle;
          } else if (colNumber === 9 || colNumber === 11) {
            // Integer number columns (Total Skills, Highest Level)
            cell.style = numberStyle;
          } else if (colNumber === 10) {
            // Decimal number column (Average Level)
            cell.style = decimalStyle;
          } else if (colNumber >= 12 && colNumber <= 17) {
            // Skills category columns
            cell.style = {
              ...dataStyle,
              fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF0F0F0' } // Light gray background
              }
            };
          } else {
            // All Skills column
            cell.style = dataStyle;
          }
          
          // Alternate row colors for better readability
          if (index % 2 === 0) {
            if (colNumber <= 8 || colNumber === 18) {
              cell.style.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF9F9F9' } // Very light gray
              };
            }
          }
        });
        row.height = 20;
      });
      
      // Set column widths
      worksheet.columns = [
        { width: 12 }, // Employee ID
        { width: 25 }, // Full Name
        { width: 30 }, // Email
        { width: 18 }, // Department
        { width: 20 }, // Subgroup
        { width: 15 }, // Experience Years
        { width: 18 }, // Experience Domain
        { width: 15 }, // Location
        { width: 12 }, // Total Skills
        { width: 15 }, // Average Level
        { width: 15 }, // Highest Level
        { width: 40 }, // Technical Skills
        { width: 40 }, // Business Skills
        { width: 40 }, // HR Skills
        { width: 40 }, // Finance Skills
        { width: 40 }, // Operations Skills
        { width: 40 }, // Other Skills
        { width: 60 }, // All Skills
      ];
      
      // Freeze header row
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      
      // Add summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRow(['Employees Export Summary']);
      summarySheet.addRow(['']);
      summarySheet.addRow(['Export Date', new Date().toLocaleString()]);
      summarySheet.addRow(['Total Employees', employees.length]);
      summarySheet.addRow(['']);
      
      const deptCounts = {};
      employees.forEach(emp => {
        const dept = emp.department?.name || 'Unknown';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });
      
      summarySheet.addRow(['Department Distribution']);
      Object.keys(deptCounts).sort().forEach(dept => {
        summarySheet.addRow([dept, deptCounts[dept]]);
      });
      
      // Style summary sheet
      summarySheet.getRow(1).font = { bold: true, size: 14 };
      summarySheet.columns = [{ width: 25 }, { width: 15 }];
      
      // Generate Excel buffer
      const excelBuffer = await workbook.xlsx.writeBuffer();
      
      // Return Excel instead of CSV
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Employees_Export_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(excelBuffer);
      return; // Exit early for employees type
    } else if (type === 'recommendations') {
      const recommendations = await Recommendation.find()
        .populate('employee_id')
        .populate('course_id');

      // Create Excel workbook for recommendations
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Recommendations');
      
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE91E63' } // Pink
        },
        alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      };
      
      const dataStyle = {
        alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
        border: {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        }
      };
      
      const headers = [
        'Employee ID',
        'Employee Name',
        'Department',
        'Course Title',
        'Confidence Score',
        'Rank',
        'Status',
        'Generated Date',
      ];
      
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.style = headerStyle;
      });
      headerRow.height = 25;
      
      const rows = recommendations.map((rec) => [
        rec.employee_id?.employee_id || '',
        rec.employee_id?.name || '',
        rec.employee_id?.department?.name || '',
        rec.course_id?.title || '',
        rec.confidence_score ?? '',
        rec.rank ?? '',
        rec.status,
        rec.generated_at ? formatDate(rec.generated_at) : '',
      ]);
      
      rows.forEach((rowData, index) => {
        const row = worksheet.addRow(rowData);
        row.eachCell((cell, colNumber) => {
          cell.style = dataStyle;
          
          if (colNumber === 5 || colNumber === 6) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.numFmt = '0.00';
          }
          
          if (colNumber === 7) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            if (rowData[6] === 'Accepted') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
            } else if (rowData[6] === 'Pending') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } };
            }
          }
          
          if (index % 2 === 0 && colNumber !== 7) {
            cell.style.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
          }
        });
        row.height = 20;
      });
      
      worksheet.columns = [
        { width: 15 },
        { width: 25 },
        { width: 20 },
        { width: 35 },
        { width: 18 },
        { width: 10 },
        { width: 15 },
        { width: 15 },
      ];
      
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRow(['ML Recommendations Report']);
      summarySheet.addRow(['']);
      summarySheet.addRow(['Total Recommendations', recommendations.length]);
      summarySheet.addRow(['Accepted', recommendations.filter(r => r.status === 'Accepted').length]);
      summarySheet.addRow(['Pending', recommendations.filter(r => r.status === 'Pending').length]);
      summarySheet.addRow(['Rejected', recommendations.filter(r => r.status === 'Rejected').length]);
      
      summarySheet.getRow(1).font = { bold: true, size: 14 };
      summarySheet.columns = [{ width: 25 }, { width: 15 }];
      
      const excelBuffer = await workbook.xlsx.writeBuffer();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="ML_Recommendations_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(excelBuffer);
      return;
    } else if (type === 'courses') {
      const courses = await Course.find().sort({ title: 1 }).populate('prerequisites');
      
      // Create Excel workbook for courses
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Courses');
      
      // Define styles
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2E7D32' } // Green background
        },
        alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        }
      };
      
      const dataStyle = {
        alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
        border: {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        }
      };
      
      const numberStyle = {
        ...dataStyle,
        alignment: { vertical: 'middle', horizontal: 'center' },
        numFmt: '#,##0'
      };
      
      const statusStyle = {
        ...dataStyle,
        alignment: { vertical: 'middle', horizontal: 'center' }
      };
      
      // Build headers
      const headers = [
        'Course Title',
        'Description',
        'Department',
        'Delivery Mode',
        'Duration (Hours)',
        'Max Participants',
        'Target Experience Level',
        'Status',
        'Required Skills',
        'Prerequisites',
        'Created Date',
      ];
      
      // Add header row
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.style = headerStyle;
      });
      headerRow.height = 25;
      
      // Build rows
      const rows = courses.map((course, index) => {
        const prerequisites = course.prerequisites && Array.isArray(course.prerequisites)
          ? course.prerequisites.map((p) => p.title || p).join(' | ')
          : '';
        
        const requiredSkills = course.required_skills && course.required_skills.length > 0
          ? course.required_skills.join(' | ')
          : '';
        
        return [
          course.title || '',
          course.description || '',
          course.department || '',
          course.delivery_mode || '',
          course.duration || 0,
          course.max_participants || '',
          course.target_experience_level || '',
          course.isActive ? 'Active' : 'Inactive',
          requiredSkills,
          prerequisites,
          course.createdAt ? formatDate(course.createdAt) : '',
        ];
      });
      
      // Add data rows
      rows.forEach((rowData, index) => {
        const row = worksheet.addRow(rowData);
        row.eachCell((cell, colNumber) => {
          // Apply different styles based on column type
          if (colNumber === 4 || colNumber === 5) {
            // Number columns (Duration, Max Participants)
            cell.style = numberStyle;
          } else if (colNumber === 8) {
            // Status column
            cell.style = statusStyle;
            if (rowData[7] === 'Active') {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFC6EFCE' } // Light green
              };
            } else {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFC7CE' } // Light red
              };
            }
          } else {
            // Text columns
            cell.style = dataStyle;
          }
          
          // Alternate row colors
          if (index % 2 === 0) {
            if (colNumber !== 8) {
              cell.style.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF9F9F9' } // Very light gray
              };
            }
          }
        });
        row.height = 20;
      });
      
      // Set column widths
      worksheet.columns = [
        { width: 30 }, // Course Title
        { width: 40 }, // Description
        { width: 18 }, // Department
        { width: 15 }, // Delivery Mode
        { width: 15 }, // Duration
        { width: 15 }, // Max Participants
        { width: 20 }, // Experience Level
        { width: 12 }, // Status
        { width: 40 }, // Required Skills
        { width: 40 }, // Prerequisites
        { width: 15 }, // Created Date
      ];
      
      // Freeze header row
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      
      // Add summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRow(['Courses Export Summary']);
      summarySheet.addRow(['']);
      summarySheet.addRow(['Export Date', new Date().toLocaleString()]);
      summarySheet.addRow(['Total Courses', courses.length]);
      summarySheet.addRow(['Active Courses', courses.filter(c => c.isActive).length]);
      summarySheet.addRow(['Inactive Courses', courses.filter(c => !c.isActive).length]);
      summarySheet.addRow(['']);
      
      // Department distribution
      const deptCounts = {};
      courses.forEach(course => {
        const dept = course.department || 'Unknown';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });
      
      summarySheet.addRow(['Department Distribution']);
      Object.keys(deptCounts).sort().forEach(dept => {
        summarySheet.addRow([dept, deptCounts[dept]]);
      });
      
      summarySheet.addRow(['']);
      
      // Delivery mode distribution
      const modeCounts = {};
      courses.forEach(course => {
        const mode = course.delivery_mode || 'Unknown';
        modeCounts[mode] = (modeCounts[mode] || 0) + 1;
      });
      
      summarySheet.addRow(['Delivery Mode Distribution']);
      Object.keys(modeCounts).sort().forEach(mode => {
        summarySheet.addRow([mode, modeCounts[mode]]);
      });
      
      // Style summary sheet
      summarySheet.getRow(1).font = { bold: true, size: 14 };
      summarySheet.columns = [{ width: 25 }, { width: 15 }];
      
      // Generate Excel buffer
      const excelBuffer = await workbook.xlsx.writeBuffer();
      
      // Return Excel
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Courses_Export_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(excelBuffer);
      return; // Exit early for courses type
    } else {
      return res.status(400).json({ message: 'Invalid export type' });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(bom + csvData);
  } catch (error) {
    next(error);
  }
};

// Helper method for PDF generation
exports.getParticipationReportData = async (req, res, next) => {
  // This would be called internally by exportPDF
  return { message: 'Report data' };
};

