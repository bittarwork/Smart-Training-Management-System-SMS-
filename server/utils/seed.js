// Comprehensive database seeding utility
// Populates database with sample data for testing and development
// Includes: Users, Employees, Courses, TrainingHistory, and Recommendations

const User = require('../models/User');
const Employee = require('../models/Employee');
const Course = require('../models/Course');
const TrainingHistory = require('../models/TrainingHistory');
const Recommendation = require('../models/Recommendation');
const connectDB = require('../config/database');
require('dotenv').config();

// Sample departments and locations
const departments = [
  { name: 'IT', subgroup: 'Development', critical_skills: ['JavaScript', 'Python', 'React', 'Node.js'] },
  { name: 'IT', subgroup: 'DevOps', critical_skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'] },
  { name: 'IT', subgroup: 'Security', critical_skills: ['Cybersecurity', 'Penetration Testing', 'Network Security'] },
  { name: 'HR', subgroup: 'Recruitment', critical_skills: ['Talent Acquisition', 'Interviewing', 'HR Analytics'] },
  { name: 'HR', subgroup: 'Training', critical_skills: ['Training Design', 'Learning Management', 'Performance Management'] },
  { name: 'Finance', subgroup: 'Accounting', critical_skills: ['Financial Analysis', 'Accounting', 'Tax Planning'] },
  { name: 'Finance', subgroup: 'Audit', critical_skills: ['Internal Audit', 'Risk Management', 'Compliance'] },
  { name: 'Marketing', subgroup: 'Digital Marketing', critical_skills: ['SEO', 'Social Media', 'Content Marketing'] },
  { name: 'Marketing', subgroup: 'Brand Management', critical_skills: ['Brand Strategy', 'Market Research', 'Advertising'] },
  { name: 'Sales', subgroup: 'Business Development', critical_skills: ['Sales Strategy', 'Negotiation', 'CRM'] },
  { name: 'Operations', subgroup: 'Supply Chain', critical_skills: ['Supply Chain Management', 'Logistics', 'Inventory Management'] },
  { name: 'Operations', subgroup: 'Quality Assurance', critical_skills: ['Quality Control', 'Process Improvement', 'ISO Standards'] },
];

const locations = ['Damascus', 'Aleppo', 'Latakia', 'Homs', 'Tartus', 'Remote'];

const EMPLOYEE_TARGET = 50;
const COURSE_TARGET = 25;
const TRAINING_HISTORY_TARGET = 40;

// Sample skills pool
const skillPool = [
  { name: 'JavaScript', level: 4 }, { name: 'Python', level: 5 }, { name: 'React', level: 4 },
  { name: 'Node.js', level: 3 }, { name: 'MongoDB', level: 4 }, { name: 'SQL', level: 4 },
  { name: 'Docker', level: 3 }, { name: 'Kubernetes', level: 2 }, { name: 'AWS', level: 3 },
  { name: 'CI/CD', level: 3 }, { name: 'Git', level: 5 }, { name: 'TypeScript', level: 3 },
  { name: 'Angular', level: 2 }, { name: 'Vue.js', level: 3 }, { name: 'Java', level: 4 },
  { name: 'C#', level: 3 }, { name: 'PHP', level: 3 }, { name: 'Cybersecurity', level: 2 },
  { name: 'Network Security', level: 2 }, { name: 'Penetration Testing', level: 1 },
  { name: 'Talent Acquisition', level: 4 }, { name: 'Interviewing', level: 5 },
  { name: 'HR Analytics', level: 3 }, { name: 'Training Design', level: 4 },
  { name: 'Learning Management', level: 3 }, { name: 'Performance Management', level: 4 },
  { name: 'Financial Analysis', level: 4 }, { name: 'Accounting', level: 5 },
  { name: 'Tax Planning', level: 3 }, { name: 'Internal Audit', level: 3 },
  { name: 'Risk Management', level: 4 }, { name: 'Compliance', level: 3 },
  { name: 'SEO', level: 4 }, { name: 'Social Media', level: 5 }, { name: 'Content Marketing', level: 4 },
  { name: 'Brand Strategy', level: 3 }, { name: 'Market Research', level: 4 },
  { name: 'Sales Strategy', level: 4 }, { name: 'Negotiation', level: 5 },
  { name: 'CRM', level: 4 }, { name: 'Supply Chain Management', level: 3 },
  { name: 'Logistics', level: 4 }, { name: 'Inventory Management', level: 3 },
  { name: 'Quality Control', level: 4 }, { name: 'Process Improvement', level: 3 },
  { name: 'Project Management', level: 4 }, { name: 'Agile', level: 4 },
  { name: 'Scrum', level: 3 }, { name: 'Leadership', level: 4 }, { name: 'Communication', level: 5 },
];

// Generate random employee data
const generateEmployee = (index) => {
  const dept = departments[Math.floor(Math.random() * departments.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];
  const experienceYears = Math.floor(Math.random() * 15) + 1;
  const domain = dept.name;
  
  // Select 5-12 random skills
  const numSkills = Math.floor(Math.random() * 8) + 5;
  const selectedSkills = [];
  const usedSkillNames = new Set();
  
  for (let i = 0; i < numSkills; i++) {
    let skill;
    do {
      skill = skillPool[Math.floor(Math.random() * skillPool.length)];
    } while (usedSkillNames.has(skill.name));
    
    usedSkillNames.add(skill.name);
    const daysAgo = Math.floor(Math.random() * 365);
    selectedSkills.push({
      name: skill.name,
      level: Math.floor(Math.random() * 3) + 1, // Random level 1-3
      last_used: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    });
  }
  
  const firstNames = ['Ahmad', 'Mohammed', 'Ali', 'Omar', 'Khaled', 'Hassan', 'Youssef', 'Mahmoud', 'Samer', 'Bassam', 'Fadi', 'Rami', 'Tarek', 'Waleed', 'Nader'];
  const lastNames = ['Al-Ahmad', 'Al-Hassan', 'Al-Mohammed', 'Al-Khaled', 'Al-Omar', 'Al-Ali', 'Al-Youssef', 'Al-Mahmoud', 'Al-Samer', 'Al-Bassam', 'Al-Fadi', 'Al-Rami', 'Al-Tarek', 'Al-Waleed', 'Al-Nader'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const name = `${firstName} ${lastName}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@company.com`;
  
  return {
    employee_id: `EMP${String(index).padStart(4, '0')}`,
    name,
    email,
    department: {
      name: dept.name,
      subgroup: dept.subgroup,
      critical_skills: dept.critical_skills,
    },
    skills: selectedSkills,
    experience: {
      years: experienceYears,
      domain,
    },
    location,
  };
};

// Sample courses data
const coursesData = [
  {
    title: 'Advanced JavaScript Development',
    description: 'Deep dive into modern JavaScript features, async programming, and best practices',
    department: 'IT',
    delivery_mode: 'Online',
    duration: 40,
    max_participants: 25,
    required_skills: ['JavaScript', 'HTML', 'CSS'],
    target_experience_level: 'Intermediate',
  },
  {
    title: 'React Mastery Course',
    description: 'Comprehensive React training covering hooks, context, state management, and performance optimization',
    department: 'IT',
    delivery_mode: 'Hybrid',
    duration: 50,
    max_participants: 20,
    required_skills: ['JavaScript', 'React'],
    target_experience_level: 'Intermediate',
  },
  {
    title: 'Node.js Backend Development',
    description: 'Building scalable backend applications with Node.js, Express, and MongoDB',
    department: 'IT',
    delivery_mode: 'Online',
    duration: 45,
    max_participants: 30,
    required_skills: ['JavaScript', 'Node.js'],
    target_experience_level: 'Intermediate',
  },
  {
    title: 'Docker and Containerization',
    description: 'Learn containerization with Docker, Docker Compose, and container orchestration basics',
    department: 'IT',
    delivery_mode: 'In-Person',
    duration: 30,
    max_participants: 15,
    required_skills: ['Linux', 'Command Line'],
    target_experience_level: 'Beginner',
  },
  {
    title: 'Kubernetes Fundamentals',
    description: 'Introduction to Kubernetes for container orchestration and deployment',
    department: 'IT',
    delivery_mode: 'Hybrid',
    duration: 35,
    max_participants: 20,
    required_skills: ['Docker', 'Linux'],
    target_experience_level: 'Intermediate',
  },
  {
    title: 'AWS Cloud Architecture',
    description: 'Design and deploy scalable applications on AWS cloud infrastructure',
    department: 'IT',
    delivery_mode: 'Online',
    duration: 60,
    max_participants: 25,
    required_skills: ['Cloud Computing', 'Networking'],
    target_experience_level: 'Advanced',
  },
  {
    title: 'Cybersecurity Essentials',
    description: 'Fundamentals of cybersecurity, threat detection, and security best practices',
    department: 'IT',
    delivery_mode: 'In-Person',
    duration: 40,
    max_participants: 20,
    required_skills: ['Networking', 'Operating Systems'],
    target_experience_level: 'Beginner',
  },
  {
    title: 'Penetration Testing and Ethical Hacking',
    description: 'Learn ethical hacking techniques and penetration testing methodologies',
    department: 'IT',
    delivery_mode: 'Hybrid',
    duration: 50,
    max_participants: 15,
    required_skills: ['Cybersecurity', 'Networking'],
    target_experience_level: 'Advanced',
  },
  {
    title: 'Talent Acquisition Strategies',
    description: 'Modern recruitment techniques, sourcing strategies, and candidate assessment',
    department: 'HR',
    delivery_mode: 'Online',
    duration: 35,
    max_participants: 30,
    required_skills: ['Communication', 'Interviewing'],
    target_experience_level: 'Intermediate',
  },
  {
    title: 'Advanced Interviewing Techniques',
    description: 'Master behavioral interviews, technical assessments, and candidate evaluation',
    department: 'HR',
    delivery_mode: 'In-Person',
    duration: 25,
    max_participants: 20,
    required_skills: ['Talent Acquisition', 'Communication'],
    target_experience_level: 'Intermediate',
  },
  {
    title: 'HR Analytics and Data-Driven Decisions',
    description: 'Using data analytics to make informed HR decisions and measure workforce effectiveness',
    department: 'HR',
    delivery_mode: 'Online',
    duration: 40,
    max_participants: 25,
    required_skills: ['Data Analysis', 'Excel'],
    target_experience_level: 'Intermediate',
  },
  {
    title: 'Training Program Design and Development',
    description: 'Create effective training programs, learning objectives, and evaluation methods',
    department: 'HR',
    delivery_mode: 'Hybrid',
    duration: 45,
    max_participants: 20,
    required_skills: ['Training Design', 'Communication'],
    target_experience_level: 'Advanced',
  },
  {
    title: 'Performance Management Systems',
    description: 'Design and implement performance management frameworks and evaluation processes',
    department: 'HR',
    delivery_mode: 'Online',
    duration: 30,
    max_participants: 30,
    required_skills: ['Performance Management', 'Communication'],
    target_experience_level: 'Intermediate',
  },
  {
    title: 'Financial Analysis and Reporting',
    description: 'Advanced financial analysis techniques, financial modeling, and reporting standards',
    department: 'Finance',
    delivery_mode: 'In-Person',
    duration: 50,
    max_participants: 20,
    required_skills: ['Accounting', 'Excel'],
    target_experience_level: 'Advanced',
  },
  {
    title: 'Advanced Accounting Principles',
    description: 'Deep dive into accounting standards, financial statements, and regulatory compliance',
    department: 'Finance',
    delivery_mode: 'Hybrid',
    duration: 60,
    max_participants: 25,
    required_skills: ['Accounting'],
    target_experience_level: 'Advanced',
  },
  {
    title: 'Tax Planning and Optimization',
    description: 'Strategic tax planning, tax optimization strategies, and compliance requirements',
    department: 'Finance',
    delivery_mode: 'Online',
    duration: 35,
    max_participants: 30,
    required_skills: ['Accounting', 'Tax Planning'],
    target_experience_level: 'Intermediate',
  },
  {
    title: 'Internal Audit and Risk Management',
    description: 'Internal audit processes, risk assessment, and control evaluation',
    department: 'Finance',
    delivery_mode: 'In-Person',
    duration: 40,
    max_participants: 20,
    required_skills: ['Internal Audit', 'Risk Management'],
    target_experience_level: 'Advanced',
  },
  {
    title: 'SEO and Search Engine Optimization',
    description: 'Master SEO techniques, keyword research, on-page and off-page optimization',
    department: 'Marketing',
    delivery_mode: 'Online',
    duration: 40,
    max_participants: 30,
    required_skills: ['Content Marketing', 'Analytics'],
    target_experience_level: 'Intermediate',
  },
  {
    title: 'Social Media Marketing Mastery',
    description: 'Comprehensive social media strategy, content creation, and engagement tactics',
    department: 'Marketing',
    delivery_mode: 'Hybrid',
    duration: 35,
    max_participants: 25,
    required_skills: ['Social Media', 'Content Marketing'],
    target_experience_level: 'Intermediate',
  },
  {
    title: 'Content Marketing Strategy',
    description: 'Develop content strategies, content creation, and content distribution channels',
    department: 'Marketing',
    delivery_mode: 'Online',
    duration: 45,
    max_participants: 30,
    required_skills: ['Writing', 'Marketing'],
    target_experience_level: 'Beginner',
  },
  {
    title: 'Brand Strategy and Management',
    description: 'Build and manage strong brands, brand positioning, and brand equity',
    department: 'Marketing',
    delivery_mode: 'In-Person',
    duration: 50,
    max_participants: 20,
    required_skills: ['Marketing', 'Brand Strategy'],
    target_experience_level: 'Advanced',
  },
  {
    title: 'Market Research and Consumer Insights',
    description: 'Conduct market research, analyze consumer behavior, and generate insights',
    department: 'Marketing',
    delivery_mode: 'Hybrid',
    duration: 40,
    max_participants: 25,
    required_skills: ['Market Research', 'Data Analysis'],
    target_experience_level: 'Intermediate',
  },
  {
    title: 'Sales Strategy and Business Development',
    description: 'Develop sales strategies, build client relationships, and drive revenue growth',
    department: 'Sales',
    delivery_mode: 'In-Person',
    duration: 45,
    max_participants: 25,
    required_skills: ['Communication', 'Sales Strategy'],
    target_experience_level: 'Intermediate',
  },
  {
    title: 'Advanced Negotiation Techniques',
    description: 'Master negotiation skills, deal structuring, and conflict resolution',
    department: 'Sales',
    delivery_mode: 'Hybrid',
    duration: 30,
    max_participants: 20,
    required_skills: ['Negotiation', 'Communication'],
    target_experience_level: 'Advanced',
  },
  {
    title: 'CRM Systems and Customer Management',
    description: 'Implement and optimize CRM systems for customer relationship management',
    department: 'Sales',
    delivery_mode: 'Online',
    duration: 35,
    max_participants: 30,
    required_skills: ['CRM', 'Sales Strategy'],
    target_experience_level: 'Beginner',
  },
  {
    title: 'Supply Chain Management Fundamentals',
    description: 'Introduction to supply chain management, logistics, and inventory control',
    department: 'Operations',
    delivery_mode: 'Online',
    duration: 40,
    max_participants: 30,
    required_skills: ['Logistics', 'Analytics'],
    target_experience_level: 'Beginner',
  },
  {
    title: 'Logistics and Distribution Management',
    description: 'Optimize logistics operations, warehouse management, and distribution networks',
    department: 'Operations',
    delivery_mode: 'In-Person',
    duration: 45,
    max_participants: 25,
    required_skills: ['Supply Chain Management', 'Logistics'],
    target_experience_level: 'Intermediate',
  },
  {
    title: 'Quality Control and Process Improvement',
    description: 'Implement quality control systems, process improvement methodologies, and ISO standards',
    department: 'Operations',
    delivery_mode: 'Hybrid',
    duration: 50,
    max_participants: 20,
    required_skills: ['Quality Control', 'Process Improvement'],
    target_experience_level: 'Advanced',
  },
  {
    title: 'Project Management Professional (PMP)',
    description: 'Comprehensive project management training covering PMP methodologies and best practices',
    department: 'Operations',
    delivery_mode: 'Online',
    duration: 60,
    max_participants: 30,
    required_skills: ['Project Management', 'Communication'],
    target_experience_level: 'Intermediate',
  },
  {
    title: 'Agile and Scrum Master Certification',
    description: 'Master Agile methodologies, Scrum framework, and sprint management',
    department: 'Operations',
    delivery_mode: 'Hybrid',
    duration: 40,
    max_participants: 25,
    required_skills: ['Project Management', 'Agile'],
    target_experience_level: 'Intermediate',
  },
];

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');
    await connectDB();

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Course.deleteMany({});
    await TrainingHistory.deleteMany({});
    await Recommendation.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // 1. Seed Users
    // Use User.create() instead of insertMany() to trigger pre-save hooks for password hashing
    console.log('👤 Creating users...');
    const admin = await User.create({ username: 'admin', password: 'Admin@123', role: 'Admin' });
    const manager = await User.create({ username: 'manager', password: 'Manager@123', role: 'Manager' });
    const viewer = await User.create({ username: 'viewer', password: 'Viewer@123', role: 'Viewer' });
    const users = [admin, manager, viewer];
    console.log(`✅ Created ${users.length} users`);
    console.log('   - admin / Admin@123 (Admin)');
    console.log('   - manager / Manager@123 (Manager)');
    console.log('   - viewer / Viewer@123 (Viewer)\n');

    // 2. Seed Courses
    console.log('📚 Creating courses...');
    const coursePayload = coursesData.slice(0, COURSE_TARGET);
    const courses = await Course.insertMany(coursePayload);
    console.log(`✅ Created ${courses.length} courses\n`);

    // Set prerequisites for some courses (creating dependencies)
    const jsCourse = courses.find(c => c.title.includes('JavaScript'));
    const reactCourse = courses.find(c => c.title.includes('React'));
    const nodeCourse = courses.find(c => c.title.includes('Node.js'));
    const dockerCourse = courses.find(c => c.title.includes('Docker'));
    const k8sCourse = courses.find(c => c.title.includes('Kubernetes'));
    const cybersecCourse = courses.find(c => c.title.includes('Cybersecurity'));
    const penTestCourse = courses.find(c => c.title.includes('Penetration'));

    if (reactCourse && jsCourse) {
      reactCourse.prerequisites = [jsCourse._id];
      await reactCourse.save();
    }
    if (nodeCourse && jsCourse) {
      nodeCourse.prerequisites = [jsCourse._id];
      await nodeCourse.save();
    }
    if (k8sCourse && dockerCourse) {
      k8sCourse.prerequisites = [dockerCourse._id];
      await k8sCourse.save();
    }
    if (penTestCourse && cybersecCourse) {
      penTestCourse.prerequisites = [cybersecCourse._id];
      await penTestCourse.save();
    }

    // 3. Seed Employees
    console.log('👥 Creating employees...');
    const employees = [];
    for (let i = 1; i <= EMPLOYEE_TARGET; i++) {
      employees.push(generateEmployee(i));
    }
    const createdEmployees = await Employee.insertMany(employees);
    console.log(`✅ Created ${createdEmployees.length} employees\n`);

    // 4. Seed Training History
    console.log('📖 Creating training history records...');
    const trainingHistoryRecords = [];
    const trainingStatuses = ['Completed', 'In Progress', 'Not Started', 'Failed'];

    const getCourseForEmployee = (employee) => {
      const availableCourses = courses.filter(c =>
        c.department === employee.department.name ||
        Math.random() > 0.6
      );
      if (availableCourses.length === 0) {
        return courses[Math.floor(Math.random() * courses.length)];
      }
      return availableCourses[Math.floor(Math.random() * availableCourses.length)];
    };

    while (trainingHistoryRecords.length < TRAINING_HISTORY_TARGET) {
      const employee = createdEmployees[Math.floor(Math.random() * createdEmployees.length)];
      const course = getCourseForEmployee(employee);
      const status = trainingStatuses[trainingHistoryRecords.length % trainingStatuses.length];
      const startDaysAgo = Math.floor(Math.random() * 120);
      const startDate = new Date(Date.now() - startDaysAgo * 24 * 60 * 60 * 1000);

      let completionDate = null;
      let assessmentScore = undefined;
      let progress = 0;
      let feedback = null;

      if (status === 'Completed') {
        const completionDaysAgo = Math.max(startDaysAgo - Math.floor(Math.random() * 20), 1);
        completionDate = new Date(Date.now() - completionDaysAgo * 24 * 60 * 60 * 1000);
        assessmentScore = Math.floor(Math.random() * 25) + 75;
        progress = 100;
        feedback = `Completed successfully, applied in ${employee.department.subgroup}`;

        employee.training_history.push({
          course_id: course._id,
          completion_date: completionDate,
          assessment_score: assessmentScore,
        });
      } else if (status === 'In Progress') {
        progress = Math.floor(Math.random() * 60) + 30; // 30-90
        feedback = 'On track, needs more practice';
      } else if (status === 'Failed') {
        completionDate = new Date(Date.now() - Math.max(startDaysAgo - 5, 1) * 24 * 60 * 60 * 1000);
        assessmentScore = Math.floor(Math.random() * 20) + 55;
        progress = Math.floor(Math.random() * 20) + 60;
        feedback = 'Needs to retake with more preparation';
      } else {
        progress = 0;
      }

      trainingHistoryRecords.push({
        employee_id: employee._id,
        course_id: course._id,
        start_date: startDate,
        completion_date: completionDate,
        assessment_score: assessmentScore,
        status,
        progress,
        feedback,
      });

      await employee.save();
    }

    const createdHistory = await TrainingHistory.insertMany(trainingHistoryRecords);
    console.log(`✅ Created ${createdHistory.length} training history records (mixed statuses)\n`);

    // 5. Seed Recommendations
    console.log('🎯 Creating ML recommendations...');
    const recommendations = [];
    
    // Create recommendations for 50-60% of employees
    const employeesForRecommendation = createdEmployees.slice(
      Math.floor(createdEmployees.length * 0.4),
      Math.floor(createdEmployees.length * 0.9)
    );
    
    for (const employee of employeesForRecommendation) {
      // Each employee gets 1-3 recommendations
      const numRecommendations = Math.floor(Math.random() * 3) + 1;
      
      // Filter courses relevant to employee's department and skills
      const relevantCourses = courses.filter(c => {
        const hasRelevantSkill = employee.skills.some(skill => 
          c.required_skills && c.required_skills.some(rs => 
            skill.name.toLowerCase().includes(rs.toLowerCase()) || 
            rs.toLowerCase().includes(skill.name.toLowerCase())
          )
        );
        return c.department === employee.department.name || hasRelevantSkill;
      });
      
      const selectedCourses = relevantCourses
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(numRecommendations, relevantCourses.length));
      
      for (let i = 0; i < selectedCourses.length; i++) {
        const course = selectedCourses[i];
        const confidenceScore = 0.65 + Math.random() * 0.3; // Between 0.65 and 0.95
        const statuses = ['Pending', 'Accepted', 'Rejected'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        recommendations.push({
          employee_id: employee._id,
          course_id: course._id,
          confidence_score: confidenceScore,
          rank: i + 1,
          status: status,
          override_flag: Math.random() > 0.9, // 10% have manual override
          override_reason: Math.random() > 0.9 ? 'Manager override based on business needs' : undefined,
        });
      }
    }
    
    const createdRecommendations = await Recommendation.insertMany(recommendations);
    console.log(`✅ Created ${createdRecommendations.length} recommendations\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 Database Seeding Summary:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`👤 Users:           ${users.length}`);
    console.log(`👥 Employees:       ${createdEmployees.length}`);
    console.log(`📚 Courses:         ${courses.length}`);
    console.log(`📖 Training History: ${createdHistory.length}`);
    console.log(`🎯 Recommendations:  ${createdRecommendations.length}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n🔑 Login Credentials:');
    console.log('   Admin:  admin / Admin@123');
    console.log('   Manager: manager / Manager@123');
    console.log('   Viewer: viewer / Viewer@123');
    console.log('\n⚠️  Please change passwords after first login!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
