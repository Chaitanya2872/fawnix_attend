import type {
  EmployeeMasterResourceConfig,
  EmployeeMasterResourceKey,
  EmployeeMasterSidebarId,
  SidebarId,
} from '../../../types/admin'

export const EMPLOYEE_MASTER_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const statusField = {
  key: 'status',
  label: 'Status',
  required: true,
  type: 'select' as const,
  options: EMPLOYEE_MASTER_STATUS_OPTIONS,
}

const descriptionField = {
  key: 'description',
  label: 'Description',
  type: 'textarea' as const,
  placeholder: 'Optional operational notes',
}

export const employeeMasterResourceConfigs: Record<EmployeeMasterResourceKey, EmployeeMasterResourceConfig> = {
  workingUnits: {
    key: 'workingUnits',
    sidebarId: 'employee-master-working-units',
    title: 'Working Units',
    tabLabel: 'Working Units',
    singularLabel: 'Working Unit',
    endpoint: '/api/admin/employee-master/working-units',
    codeField: 'working_unit_code',
    nameField: 'working_unit_name',
    tableColumns: [
      { key: 'working_unit_name', label: 'Working Unit', kind: 'primary', minWidth: 220 },
      { key: 'working_unit_code', label: 'Code', kind: 'code', minWidth: 120 },
      { key: 'unit_head_manager', label: 'Unit Head / Manager', minWidth: 190 },
      { key: 'location', label: 'Location', minWidth: 160 },
      { key: 'status', label: 'Status', kind: 'status', minWidth: 120 },
      { key: 'description', label: 'Description', minWidth: 240 },
    ],
    formFields: [
      {
        key: 'working_unit_code',
        label: 'Working Unit Code',
        required: true,
        placeholder: 'WU-001',
      },
      {
        key: 'working_unit_name',
        label: 'Working Unit Name',
        required: true,
        placeholder: 'Corporate Office',
      },
      {
        key: 'unit_head_manager',
        label: 'Unit Head / Manager',
        required: true,
        optionKey: 'unit_head_managers',
        placeholder: 'Manager name or code',
      },
      {
        key: 'location',
        label: 'Location',
        required: true,
        optionKey: 'locations',
        placeholder: 'Bengaluru',
      },
      statusField,
      descriptionField,
    ],
    filters: [
      {
        stateKey: 'location',
        param: 'location',
        label: 'Location',
        optionKey: 'locations',
        recordField: 'location',
      },
      {
        stateKey: 'unitHeadManager',
        param: 'unit_head_manager',
        label: 'Unit Head',
        optionKey: 'unit_head_managers',
        recordField: 'unit_head_manager',
      },
    ],
  },
  payrollUnits: {
    key: 'payrollUnits',
    sidebarId: 'employee-master-payroll-units',
    title: 'Payroll Units',
    tabLabel: 'Payroll Units',
    singularLabel: 'Payroll Unit',
    endpoint: '/api/admin/employee-master/payroll-units',
    codeField: 'payroll_unit_code',
    nameField: 'payroll_unit_name',
    tableColumns: [
      { key: 'payroll_unit_name', label: 'Payroll Unit', kind: 'primary', minWidth: 220 },
      { key: 'payroll_unit_code', label: 'Code', kind: 'code', minWidth: 120 },
      { key: 'payroll_manager', label: 'Payroll Manager / Responsible Person', minWidth: 230 },
      { key: 'pay_cycle', label: 'Pay Cycle', minWidth: 140 },
      { key: 'location', label: 'Location', minWidth: 160 },
      { key: 'status', label: 'Status', kind: 'status', minWidth: 120 },
      { key: 'description', label: 'Description', minWidth: 240 },
    ],
    formFields: [
      {
        key: 'payroll_unit_code',
        label: 'Payroll Unit Code',
        required: true,
        placeholder: 'PU-001',
      },
      {
        key: 'payroll_unit_name',
        label: 'Payroll Unit Name',
        required: true,
        placeholder: 'Monthly India Payroll',
      },
      {
        key: 'payroll_manager',
        label: 'Payroll Manager / Responsible Person',
        required: true,
        optionKey: 'payroll_managers',
        placeholder: 'Manager name or code',
      },
      {
        key: 'pay_cycle',
        label: 'Pay Cycle',
        required: true,
        optionKey: 'pay_cycles',
        placeholder: 'Monthly',
      },
      {
        key: 'location',
        label: 'Location',
        required: true,
        optionKey: 'locations',
        placeholder: 'Bengaluru',
      },
      statusField,
      descriptionField,
    ],
    filters: [
      {
        stateKey: 'payCycle',
        param: 'pay_cycle',
        label: 'Pay Cycle',
        optionKey: 'pay_cycles',
        recordField: 'pay_cycle',
      },
      {
        stateKey: 'location',
        param: 'location',
        label: 'Location',
        optionKey: 'locations',
        recordField: 'location',
      },
    ],
  },
  designations: {
    key: 'designations',
    sidebarId: 'employee-master-designations',
    title: 'Designations',
    tabLabel: 'Designations',
    singularLabel: 'Designation',
    endpoint: '/api/admin/employee-master/designations',
    codeField: 'designation_code',
    nameField: 'designation_name',
    tableColumns: [
      { key: 'designation_name', label: 'Designation', kind: 'primary', minWidth: 220 },
      { key: 'designation_code', label: 'Code', kind: 'code', minWidth: 120 },
      { key: 'job_level_grade', label: 'Job Level / Grade', minWidth: 160 },
      { key: 'department', label: 'Department', minWidth: 180 },
      { key: 'status', label: 'Status', kind: 'status', minWidth: 120 },
      { key: 'description', label: 'Description', minWidth: 240 },
    ],
    formFields: [
      {
        key: 'designation_code',
        label: 'Designation Code',
        required: true,
        placeholder: 'DES-001',
      },
      {
        key: 'designation_name',
        label: 'Designation Name',
        required: true,
        placeholder: 'Senior Executive',
      },
      {
        key: 'job_level_grade',
        label: 'Job Level / Grade',
        required: true,
        optionKey: 'job_level_grades',
        placeholder: 'L3',
      },
      {
        key: 'department',
        label: 'Department',
        required: true,
        optionKey: 'departments',
        placeholder: 'Operations',
      },
      statusField,
      descriptionField,
    ],
    filters: [
      {
        stateKey: 'jobLevelGrade',
        param: 'job_level_grade',
        label: 'Job Level',
        optionKey: 'job_level_grades',
        recordField: 'job_level_grade',
      },
      {
        stateKey: 'department',
        param: 'department',
        label: 'Department',
        optionKey: 'departments',
        recordField: 'department',
      },
    ],
  },
  departments: {
    key: 'departments',
    sidebarId: 'employee-master-departments',
    title: 'Departments',
    tabLabel: 'Departments',
    singularLabel: 'Department',
    endpoint: '/api/admin/employee-master/departments',
    codeField: 'department_code',
    nameField: 'department_name',
    tableColumns: [
      { key: 'department_name', label: 'Department', kind: 'primary', minWidth: 220 },
      { key: 'department_code', label: 'Code', kind: 'code', minWidth: 120 },
      { key: 'department_head', label: 'Department Head', minWidth: 180 },
      { key: 'parent_department', label: 'Parent Department', minWidth: 180 },
      { key: 'working_unit', label: 'Working Unit', minWidth: 180 },
      { key: 'location', label: 'Location', minWidth: 160 },
      { key: 'status', label: 'Status', kind: 'status', minWidth: 120 },
      { key: 'description', label: 'Description', minWidth: 240 },
    ],
    formFields: [
      {
        key: 'department_code',
        label: 'Department Code',
        required: true,
        placeholder: 'DEP-001',
      },
      {
        key: 'department_name',
        label: 'Department Name',
        required: true,
        placeholder: 'Customer Success',
      },
      {
        key: 'department_head',
        label: 'Department Head',
        required: true,
        optionKey: 'department_heads',
        placeholder: 'Head name or code',
      },
      {
        key: 'working_unit',
        label: 'Working Unit',
        required: true,
        optionKey: 'working_units',
        placeholder: 'Corporate Office',
      },
      {
        key: 'location',
        label: 'Location',
        required: true,
        optionKey: 'locations',
        placeholder: 'Bengaluru',
      },
      {
        key: 'parent_department',
        label: 'Parent Department',
        optionKey: 'parent_departments',
        placeholder: 'Optional parent',
      },
      statusField,
      descriptionField,
    ],
    filters: [
      {
        stateKey: 'workingUnit',
        param: 'working_unit',
        label: 'Working Unit',
        optionKey: 'working_units',
        recordField: 'working_unit',
      },
      {
        stateKey: 'location',
        param: 'location',
        label: 'Location',
        optionKey: 'locations',
        recordField: 'location',
      },
      {
        stateKey: 'parentDepartment',
        param: 'parent_department',
        label: 'Parent',
        optionKey: 'parent_departments',
        recordField: 'parent_department',
      },
    ],
  },
}

export const employeeMasterResources = Object.values(employeeMasterResourceConfigs)

export function getEmployeeMasterResourceByPanel(panel: SidebarId): EmployeeMasterResourceConfig | null {
  return employeeMasterResources.find((resource) => resource.sidebarId === panel) || null
}

export function isEmployeeMasterSidebarId(panel: SidebarId): panel is EmployeeMasterSidebarId {
  return employeeMasterResources.some((resource) => resource.sidebarId === panel)
}
