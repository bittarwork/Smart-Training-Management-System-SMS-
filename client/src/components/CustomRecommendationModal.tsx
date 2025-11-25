// Custom Recommendation Modal Component
// Allows modification of employee data before generating recommendations

import { useState, useEffect } from 'react'
import { Employee } from '../types'

interface Skill {
  name: string
  level: number
}

interface TrainingRecord {
  course_id: string | null
  completion_date: string
  assessment_score?: number
}

interface CustomRecommendationModalProps {
  employee: Employee
  onGenerate: (customData: any) => void
  onClose: () => void
}

const CustomRecommendationModal = ({ employee, onGenerate, onClose }: CustomRecommendationModalProps) => {
  const [skills, setSkills] = useState<Skill[]>([])
  const [experience, setExperience] = useState<number>(0)
  const [department, setDepartment] = useState<string>('')
  const [location, setLocation] = useState<string>('')
  const [deptCriticalSkills, setDeptCriticalSkills] = useState<string>('')
  const [trainingHistory, setTrainingHistory] = useState<TrainingRecord[]>([])

  useEffect(() => {
    // Initialize with employee data
    setSkills(employee.skills.map(s => ({ name: s.name, level: s.level })))
    setExperience(employee.experience.years)
    setDepartment(employee.department.name)
    setLocation(employee.location || '')
    setDeptCriticalSkills((employee.department.critical_skills || []).join(', '))
    setTrainingHistory(employee.training_history?.map(t => ({
      course_id: typeof t.course_id === 'string' ? t.course_id : t.course_id?._id || null,
      completion_date: t.completion_date ? new Date(t.completion_date).toISOString().split('T')[0] : '',
      assessment_score: t.assessment_score
    })) || [])
  }, [employee])

  const handleAddSkill = () => {
    setSkills([...skills, { name: '', level: 3 }])
  }

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index))
  }

  const handleSkillChange = (index: number, field: 'name' | 'level', value: string | number) => {
    const newSkills = [...skills]
    newSkills[index] = { ...newSkills[index], [field]: value }
    setSkills(newSkills)
  }

  const handleGenerate = () => {
    const customData = {
      skills: skills.filter(s => s.name.trim() !== ''),
      experience,
      department,
      location,
      dept_critical_skills: deptCriticalSkills
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== ''),
      training_history: trainingHistory
    }
    onGenerate(customData)
  }

  const handleReset = () => {
    // Reset to original employee data
    setSkills(employee.skills.map(s => ({ name: s.name, level: s.level })))
    setExperience(employee.experience.years)
    setDepartment(employee.department.name)
    setLocation(employee.location || '')
    setDeptCriticalSkills((employee.department.critical_skills || []).join(', '))
    setTrainingHistory(employee.training_history?.map(t => ({
      course_id: typeof t.course_id === 'string' ? t.course_id : t.course_id?._id || null,
      completion_date: t.completion_date ? new Date(t.completion_date).toISOString().split('T')[0] : '',
      assessment_score: t.assessment_score
    })) || [])
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl shadow-2xl my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">تخصيص بيانات التوصية</h2>
              <p className="text-purple-100">
                قم بتعديل البيانات المستخدمة في توليد التوصيات للموظف: <strong>{employee.name}</strong>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Skills Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                المهارات (Skills)
              </h3>
              <button
                onClick={handleAddSkill}
                className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                إضافة مهارة
              </button>
            </div>
            <div className="space-y-2 bg-gray-50 rounded-lg p-4">
              {skills.map((skill, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={skill.name}
                    onChange={(e) => handleSkillChange(index, 'name', e.target.value)}
                    placeholder="اسم المهارة"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 whitespace-nowrap">المستوى:</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={skill.level}
                      onChange={(e) => handleSkillChange(index, 'level', parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveSkill(index)}
                    className="text-red-600 hover:text-red-700 p-2"
                    title="حذف"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              {skills.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">لا توجد مهارات. اضغط "إضافة مهارة" لإضافة مهارة جديدة</p>
              )}
            </div>
          </div>

          {/* Experience & Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                سنوات الخبرة (Experience)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={experience}
                onChange={(e) => setExperience(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                القسم (Department)
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الموقع (Location)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="مثال: Jeddah"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المهارات الحرجة للقسم (مفصولة بفاصلة)
              </label>
              <input
                type="text"
                value={deptCriticalSkills}
                onChange={(e) => setDeptCriticalSkills(e.target.value)}
                placeholder="python, sql, leadership"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Training History Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              سجل التدريب (Training History)
            </h3>
            <p className="text-sm text-gray-700">
              عدد الدورات المكتملة: <strong>{trainingHistory.length}</strong>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              سجل التدريب يستخدم تلقائياً من بيانات الموظف الحالية
            </p>
          </div>

          {/* Info Banner */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">كيف تؤثر هذه القيم على التوصيات؟</h4>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• <strong>المهارات:</strong> تحدد مدى توافق الموظف مع متطلبات الكورسات</li>
              <li>• <strong>الخبرة:</strong> تؤثر على تحديد المستوى المناسب للكورسات</li>
              <li>• <strong>القسم:</strong> يربط الموظف بالكورسات المخصصة للقسم</li>
              <li>• <strong>المهارات الحرجة:</strong> تزيد من أولوية الكورسات التي تغطي هذه المهارات</li>
              <li>• <strong>سجل التدريب:</strong> يساعد في تحديد أنماط التعلم ونقاط التطور</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 rounded-b-lg flex gap-3">
          <button
            onClick={handleGenerate}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 font-semibold flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            توليد التوصيات
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
          >
            إعادة تعيين
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomRecommendationModal

