// admin.js - EduManage Pro Admin Dashboard

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initApp();
    setupEventListeners();
    
    // Initialize empty data structures
    initializeEmptyData();
});

// Application State
const appState = {
    teachers: [],
    students: [],
    parents: [],
    classes: [],
    subjects: [],
    attendance: [],
    nextIds: {
        teacher: 1,
        student: 1,
        parent: 1,
        class: 1,
        subject: 1,
        attendance: 1
    }
};

// Initialize empty data structures
function initializeEmptyData() {
    // Load any saved data from localStorage
    const savedData = localStorage.getItem('eduManageData');
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        Object.assign(appState, parsedData);
    }
    
    // Update all tables and counters
    updateTeacherTable();
    updateStudentTable();
    updateParentTable();
    updateClassTable();
    updateSubjectTable();
    updateAttendanceTable();
    updateAttendanceSummary();
    updateCounters();
}

// Save data to localStorage
function saveDataToStorage() {
    localStorage.setItem('eduManageData', JSON.stringify({
        teachers: appState.teachers,
        students: appState.students,
        parents: appState.parents,
        classes: appState.classes,
        subjects: appState.subjects,
        attendance: appState.attendance,
        nextIds: appState.nextIds
    }));
}

// Initialize the application
function initApp() {
    // Check if user is logged in (in a real app, this would verify session/token)
    const loggedIn = localStorage.getItem('eduManageLoggedIn');
    if (!loggedIn && !window.location.href.includes('login.html')) {
        // In a real app, redirect to login page
        // window.location.href = 'login.html';
        console.log('In a real app, would redirect to login');
    }

    // Set admin name from local storage if available
    const adminName = localStorage.getItem('adminName');
    if (adminName) {
        document.getElementById('admin-name').textContent = adminName;
    }

    // Initialize sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const dashboardContainer = document.querySelector('.dashboard-container');
    
    sidebarToggle.addEventListener('click', function() {
        dashboardContainer.classList.toggle('sidebar-collapsed');
    });
}

// Setup all event listeners
function setupEventListeners() {
    // Sidebar navigation
    const navItems = document.querySelectorAll('.sidebar-nav li');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            activateSection(section);
        });
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', function() {
        logout();
    });

    // Quick action buttons
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleQuickAction(action);
        });
    });

    // Add new item buttons
    document.getElementById('add-teacher-btn').addEventListener('click', () => openModal('add-teacher-modal'));
    document.getElementById('add-student-btn').addEventListener('click', () => openModal('add-student-modal'));
    document.getElementById('add-class-btn').addEventListener('click', () => openModal('add-class-modal'));
    document.getElementById('add-subject-btn').addEventListener('click', () => openModal('add-subject-modal'));
    document.getElementById('add-parent-btn').addEventListener('click', () => openModal('add-parent-modal'));
    document.getElementById('take-attendance-btn').addEventListener('click', () => prepareAttendanceModal());

    // Modal close buttons
    const closeButtons = document.querySelectorAll('.close-modal, .cancel-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal.id);
        });
    });

    // Form submissions
    document.getElementById('add-teacher-form').addEventListener('submit', handleAddTeacher);
    document.getElementById('add-student-form').addEventListener('submit', handleAddStudent);
    document.getElementById('add-class-form').addEventListener('submit', handleAddClass);
    document.getElementById('add-subject-form').addEventListener('submit', handleAddSubject);
    document.getElementById('add-parent-form').addEventListener('submit', handleAddParent);
    document.getElementById('take-attendance-form').addEventListener('submit', handleSaveAttendance);
    document.getElementById('school-info-form').addEventListener('submit', handleSaveSchoolInfo);
    document.getElementById('account-settings-form').addEventListener('submit', handleSaveAccountSettings);

    // Search filters
    document.getElementById('teacher-search').addEventListener('input', () => filterTeachers());
    document.getElementById('student-search').addEventListener('input', () => filterStudents());
    document.getElementById('parent-search').addEventListener('input', () => filterParents());
    document.getElementById('class-search').addEventListener('input', () => filterClasses());
    document.getElementById('subject-search').addEventListener('input', () => filterSubjects());

    // Dropdown filters
    document.getElementById('teacher-filter').addEventListener('change', () => filterTeachers());
    document.getElementById('student-filter').addEventListener('change', () => filterStudents());
    document.getElementById('subject-filter').addEventListener('change', () => filterSubjects());

    // Attendance view button
    document.getElementById('view-attendance-btn').addEventListener('click', viewAttendance);
}

// Handle sidebar navigation
function activateSection(section) {
    // Update navigation active state
    const navItems = document.querySelectorAll('.sidebar-nav li');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === section) {
            item.classList.add('active');
        }
    });

    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const selectedSection = document.getElementById(`${section}-section`);
    if (selectedSection) {
        selectedSection.classList.add('active');
        document.getElementById('section-title').textContent = section.charAt(0).toUpperCase() + section.slice(1);
    }
}

// Handle quick actions
function handleQuickAction(action) {
    switch (action) {
        case 'add-teacher':
            openModal('add-teacher-modal');
            break;
        case 'add-student':
            openModal('add-student-modal');
            break;
        case 'add-class':
            openModal('add-class-modal');
            break;
        case 'add-subject':
            openModal('add-subject-modal');
            break;
        default:
            console.error('Unknown action:', action);
    }
}

// Modal handling
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Reset form if it exists
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
        
        // For student form, populate parent dropdown
        if (modalId === 'add-student-modal') {
            const parentSelect = document.getElementById('student-parent');
            parentSelect.innerHTML = '<option value="">Select Parent</option>';
            appState.parents.forEach(parent => {
                const option = document.createElement('option');
                option.value = parent.id;
                option.textContent = parent.name;
                parentSelect.appendChild(option);
            });
        }
        
        // For class form, populate teacher dropdown
        if (modalId === 'add-class-modal') {
            const teacherSelect = document.getElementById('class-teacher');
            teacherSelect.innerHTML = '<option value="">Select Teacher</option>';
            appState.teachers.forEach(teacher => {
                const option = document.createElement('option');
                option.value = teacher.id;
                option.textContent = teacher.name;
                teacherSelect.appendChild(option);
            });
        }
        
        // For subject form, populate class and teacher dropdowns
        if (modalId === 'add-subject-modal') {
            const classSelect = document.getElementById('subject-class');
            classSelect.innerHTML = '<option value="">Select Class</option>';
            appState.classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.id;
                option.textContent = cls.name;
                classSelect.appendChild(option);
            });
            
            const teacherSelect = document.getElementById('subject-teacher');
            teacherSelect.innerHTML = '<option value="">Select Teacher</option>';
            appState.teachers.forEach(teacher => {
                const option = document.createElement('option');
                option.value = teacher.id;
                option.textContent = teacher.name;
                teacherSelect.appendChild(option);
            });
        }
        
        modal.style.display = 'flex';
        
        // Focus on first input if it exists
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => {
                firstInput.focus();
            }, 100);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Prepare attendance modal
function prepareAttendanceModal() {
    // Clear previous list
    const attendanceList = document.getElementById('attendance-students-list');
    attendanceList.innerHTML = '';

    // Set today's date as default
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    document.getElementById('attendance-date-input').value = formattedDate;

    // Populate class dropdown
    const classSelect = document.getElementById('attendance-class');
    classSelect.innerHTML = '<option value="">Select Class</option>';
    appState.classes.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.id;
        option.textContent = cls.name;
        classSelect.appendChild(option);
    });

    // Listen for class selection change
    classSelect.addEventListener('change', function() {
        const selectedClassId = this.value;
        if (!selectedClassId) {
            attendanceList.innerHTML = '<tr class="empty-row"><td colspan="4">No students in this class.</td></tr>';
            return;
        }

        // Filter students by class
        const studentsInClass = appState.students.filter(student => student.classId === selectedClassId);
        if (studentsInClass.length === 0) {
            attendanceList.innerHTML = '<tr class="empty-row"><td colspan="4">No students in this class.</td></tr>';
            return;
        }

        // Populate student list
        attendanceList.innerHTML = '';
        studentsInClass.forEach(student => {
            attendanceList.innerHTML += `
                <tr>
                    <td>${student.id}</td>
                    <td>${student.name}</td>
                    <td>
                        <select class="attendance-status" data-student-id="${student.id}">
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                        </select>
                    </td>
                    <td>
                        <input type="text" class="attendance-note" data-student-id="${student.id}" placeholder="Add note...">
                    </td>
                </tr>
            `;
        });
    });

    openModal('take-attendance-modal');
}

// Form handling functions
function handleAddTeacher(e) {
    e.preventDefault();
    
    const teacher = {
        id: `T${appState.nextIds.teacher++}`,
        name: document.getElementById('teacher-name').value,
        email: document.getElementById('teacher-email').value,
        department: document.getElementById('teacher-department').value,
        phone: document.getElementById('teacher-phone').value,
        address: document.getElementById('teacher-address').value,
        status: 'Active'
    };
    
    appState.teachers.push(teacher);
    updateTeacherTable();
    updateCounters();
    saveDataToStorage();
    closeModal('add-teacher-modal');
    showToast('Teacher added successfully!');
}

function handleAddStudent(e) {
    e.preventDefault();
    
    const classId = document.getElementById('student-class').value;
    const student = {
        id: `S${appState.nextIds.student++}`,
        name: document.getElementById('student-name').value,
        email: document.getElementById('student-email').value,
        classId: classId,
        parentId: document.getElementById('student-parent').value,
        address: document.getElementById('student-address').value,
        status: 'Active'
    };
    
    // Find class and parent names for display
    let className = 'None';
    if (classId) {
        const classObj = appState.classes.find(c => c.id === classId);
        if (classObj) {
            className = classObj.name;
        }
    }
    
    let parentName = 'None';
    if (student.parentId) {
        const parent = appState.parents.find(p => p.id === student.parentId);
        if (parent) {
            parentName = parent.name;
        }
    }
    
    student.className = className;
    student.parentName = parentName;
    
    appState.students.push(student);
    updateStudentTable();
    updateCounters();
    saveDataToStorage();
    closeModal('add-student-modal');
    showToast('Student added successfully!');
}

function handleAddClass(e) {
    e.preventDefault();
    
    const teacherId = document.getElementById('class-teacher').value;
    const classObj = {
        id: `C${appState.nextIds.class++}`,
        name: document.getElementById('class-name').value,
        teacherId: teacherId,
        roomNo: document.getElementById('class-room').value,
        students: []
    };
    
    // Find teacher name for display
    let teacherName = 'Unassigned';
    if (teacherId) {
        const teacher = appState.teachers.find(t => t.id === teacherId);
        if (teacher) {
            teacherName = teacher.name;
        }
    }
    
    classObj.teacherName = teacherName;
    
    appState.classes.push(classObj);
    updateClassTable();
    updateCounters();
    saveDataToStorage();
    closeModal('add-class-modal');
    showToast('Class added successfully!');
}

function handleAddSubject(e) {
    e.preventDefault();
    
    const classId = document.getElementById('subject-class').value;
    const teacherId = document.getElementById('subject-teacher').value;
    
    const subject = {
        id: `SUB${appState.nextIds.subject++}`,
        name: document.getElementById('subject-name').value,
        classId: classId,
        teacherId: teacherId,
        book: document.getElementById('subject-book').value
    };
    
    // Find class and teacher names for display
    let className = 'None';
    if (classId) {
        const classObj = appState.classes.find(c => c.id === classId);
        if (classObj) {
            className = classObj.name;
        }
    }
    
    let teacherName = 'Unassigned';
    if (teacherId) {
        const teacher = appState.teachers.find(t => t.id === teacherId);
        if (teacher) {
            teacherName = teacher.name;
        }
    }
    
    subject.className = className;
    subject.teacherName = teacherName;
    
    appState.subjects.push(subject);
    updateSubjectTable();
    updateCounters();
    saveDataToStorage();
    closeModal('add-subject-modal');
    showToast('Subject added successfully!');
}

function handleAddParent(e) {
    e.preventDefault();
    
    const parent = {
        id: `P${appState.nextIds.parent++}`,
        name: document.getElementById('parent-name').value,
        email: document.getElementById('parent-email').value,
        phone: document.getElementById('parent-phone').value,
        address: document.getElementById('parent-address').value,
        children: []
    };
    
    appState.parents.push(parent);
    updateParentTable();
    saveDataToStorage();
    closeModal('add-parent-modal');
    showToast('Parent added successfully!');
}

function handleSaveAttendance(e) {
    e.preventDefault();
    
    const classId = document.getElementById('attendance-class').value;
    const date = document.getElementById('attendance-date-input').value;
    const statusElements = document.querySelectorAll('.attendance-status');
    const noteElements = document.querySelectorAll('.attendance-note');
    
    // Create attendance records
    statusElements.forEach((element, index) => {
        const studentId = element.getAttribute('data-student-id');
        const status = element.value;
        const note = noteElements[index].value;
        
        // Find student name
        const student = appState.students.find(s => s.id === studentId);
        if (!student) return;
        
        // Find class name
        const classObj = appState.classes.find(c => c.id === classId);
        if (!classObj) return;
        
        const attendanceRecord = {
            id: `A${appState.nextIds.attendance++}`,
            studentId: studentId,
            studentName: student.name,
            classId: classId,
            className: classObj.name,
            date: date,
            status: status,
            note: note
        };

        appState.attendance.push(attendanceRecord);
    });

    closeModal('take-attendance-modal');
    showToast('Attendance saved successfully!');
    saveDataToStorage();
    updateAttendanceTable();
    updateAttendanceSummary();
}

function handleSaveSchoolInfo(e) {
    e.preventDefault();
    
    // In a real app, this would save to a database
    const schoolInfo = {
        name: document.getElementById('school-name').value,
        address: document.getElementById('school-address').value,
        email: document.getElementById('school-email').value,
        phone: document.getElementById('school-phone').value
    };
    
    localStorage.setItem('schoolInfo', JSON.stringify(schoolInfo));
    showToast('School information saved successfully!');
}

function handleSaveAccountSettings(e) {
    e.preventDefault();
    
    const adminName = document.getElementById('admin-fullname').value;
    const adminEmail = document.getElementById('admin-email').value;
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;
    
    // Simple validation
    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match!', 'error');
        return;
    }
    
    // In a real app, verify current password and update account
    if (adminName) {
        document.getElementById('admin-name').textContent = adminName;
        localStorage.setItem('adminName', adminName);
    }
    
    showToast('Account settings updated successfully!');
    document.getElementById('account-settings-form').reset();
}

// View attendance records
function viewAttendance() {
    const date = document.getElementById('attendance-date').value;
    const classId = document.getElementById('attendance-class-filter').value;
    
    let filteredAttendance = appState.attendance;
    
    if (date) {
        filteredAttendance = filteredAttendance.filter(record => record.date === date);
    }
    
    if (classId && classId !== 'all') {
        filteredAttendance = filteredAttendance.filter(record => record.classId === classId);
    }
    
    updateAttendanceTable(filteredAttendance);
    updateAttendanceSummary(filteredAttendance);
}

// Update data tables
function updateTeacherTable(teachers = appState.teachers) {
    const tbody = document.getElementById('teachers-table-body');
    
    if (teachers.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No teachers added yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    teachers.forEach(teacher => {
        tbody.innerHTML += `
            <tr>
                <td>${teacher.id}</td>
                <td>${teacher.name}</td>
                <td>${teacher.email}</td>
                <td>${teacher.department}</td>
                <td>${teacher.phone || 'N/A'}</td>
                <td><span class="status-badge ${teacher.status.toLowerCase()}">${teacher.status}</span></td>
                <td>
                    <button class="action-icon edit-btn" data-id="${teacher.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-icon delete-btn" data-id="${teacher.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editTeacher(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete('teacher', btn.getAttribute('data-id')));
    });
}

function updateStudentTable(students = appState.students) {
    const tbody = document.getElementById('students-table-body');
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No students added yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    students.forEach(student => {
        tbody.innerHTML += `
            <tr>
                <td>${student.id}</td>
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${student.className || 'None'}</td>
                <td>${student.parentName || 'None'}</td>
                <td><span class="status-badge ${student.status.toLowerCase()}">${student.status}</span></td>
                <td>
                    <button class="action-icon edit-btn" data-id="${student.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-icon delete-btn" data-id="${student.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editStudent(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete('student', btn.getAttribute('data-id')));
    });
}

function updateParentTable(parents = appState.parents) {
    const tbody = document.getElementById('parents-table-body');
    
    if (parents.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No parents added yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    parents.forEach(parent => {
        const childrenCount = parent.children ? parent.children.length : 0;
        tbody.innerHTML += `
            <tr>
                <td>${parent.id}</td>
                <td>${parent.name}</td>
                <td>${parent.email}</td>
                <td>${parent.phone || 'N/A'}</td>
                <td>${childrenCount} child${childrenCount !== 1 ? 'ren' : ''}</td>
                <td>
                    <button class="action-icon edit-btn" data-id="${parent.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-icon delete-btn" data-id="${parent.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editParent(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete('parent', btn.getAttribute('data-id')));
    });
}

function updateClassTable(classes = appState.classes) {
    const tbody = document.getElementById('classes-table-body');
    
    if (classes.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No classes added yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    classes.forEach(cls => {
        const studentsCount = appState.students.filter(s => s.classId === cls.id).length;
        tbody.innerHTML += `
            <tr>
                <td>${cls.id}</td>
                <td>${cls.name}</td>
                <td>${cls.teacherName || 'Unassigned'}</td>
                <td>${studentsCount}</td>
                <td>${cls.roomNo || 'N/A'}</td>
                <td>
                    <button class="action-icon edit-btn" data-id="${cls.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-icon delete-btn" data-id="${cls.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editClass(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete('class', btn.getAttribute('data-id')));
    });
}

function updateSubjectTable(subjects = appState.subjects) {
    const tbody = document.getElementById('subjects-table-body');
    
    if (subjects.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No subjects added yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    subjects.forEach(subject => {
        tbody.innerHTML += `
            <tr>
                <td>${subject.id}</td>
                <td>${subject.name}</td>
                <td>${subject.className || 'None'}</td>
                <td>${subject.teacherName || 'Unassigned'}</td>
                <td>${subject.book || 'N/A'}</td>
                <td>
                    <button class="action-icon edit-btn" data-id="${subject.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-icon delete-btn" data-id="${subject.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editSubject(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete('subject', btn.getAttribute('data-id')));
    });
}

function updateAttendanceTable(attendance = appState.attendance) {
    const tbody = document.getElementById('attendance-table-body');
    
    if (attendance.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No attendance records to display.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    attendance.forEach(record => {
        tbody.innerHTML += `
            <tr>
                <td>${record.studentId}</td>
                <td>${record.studentName}</td>
                <td>${record.className}</td>
                <td>${record.date}</td>
                <td><span class="status-badge ${record.status}">${record.status}</span></td>
                <td>
                    <button class="action-icon edit-btn" data-id="${record.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-icon delete-btn" data-id="${record.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editAttendance(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete('attendance', btn.getAttribute('data-id')));
    });
}

function updateAttendanceSummary(attendance = appState.attendance) {
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;
    const lateCount = attendance.filter(a => a.status === 'late').length;
    const totalRecords = attendance.length;
    
    const attendancePercentage = totalRecords > 0 
        ? Math.round((presentCount / totalRecords) * 100) 
        : 0;
    
    document.getElementById('present-count').textContent = presentCount;
    document.getElementById('absent-count').textContent = absentCount;
    document.getElementById('late-count').textContent = lateCount;
    document.getElementById('attendance-percentage').textContent = `${attendancePercentage}%`;
}

// Filter functions
function filterTeachers() {
    const searchTerm = document.getElementById('teacher-search').value.toLowerCase();
    const departmentFilter = document.getElementById('teacher-filter').value;
    
    let filtered = appState.teachers;
    
    if (searchTerm) {
        filtered = filtered.filter(teacher => 
            teacher.name.toLowerCase().includes(searchTerm) || 
            teacher.email.toLowerCase().includes(searchTerm)
        );
    }
    
    if (departmentFilter !== 'all') {
        filtered = filtered.filter(teacher => teacher.department === departmentFilter);
    }
    
    updateTeacherTable(filtered);
}

function filterStudents() {
    const searchTerm = document.getElementById('student-search').value.toLowerCase();
    const classFilter = document.getElementById('student-filter').value;
    
    let filtered = appState.students;
    
    if (searchTerm) {
        filtered = filtered.filter(student => 
            student.name.toLowerCase().includes(searchTerm) || 
            student.email.toLowerCase().includes(searchTerm)
        );
    }
    
    if (classFilter !== 'all') {
        filtered = filtered.filter(student => student.classId === classFilter);
    }
    
    updateStudentTable(filtered);
}

function filterParents() {
    const searchTerm = document.getElementById('parent-search').value.toLowerCase();
    
    let filtered = appState.parents;
    
    if (searchTerm) {
        filtered = filtered.filter(parent => 
            parent.name.toLowerCase().includes(searchTerm) || 
            parent.email.toLowerCase().includes(searchTerm)
        );
    }
    
    updateParentTable(filtered);
}

function filterClasses() {
    const searchTerm = document.getElementById('class-search').value.toLowerCase();
    
    let filtered = appState.classes;
    
    if (searchTerm) {
        filtered = filtered.filter(cls => 
            cls.name.toLowerCase().includes(searchTerm) || 
            (cls.teacherName && cls.teacherName.toLowerCase().includes(searchTerm))
        );
    }
    
    updateClassTable(filtered);
}

function filterSubjects() {
    const searchTerm = document.getElementById('subject-search').value.toLowerCase();
    const classFilter = document.getElementById('subject-filter').value;
    
    let filtered = appState.subjects;
    
    if (searchTerm) {
        filtered = filtered.filter(subject => 
            subject.name.toLowerCase().includes(searchTerm) || 
            (subject.book && subject.book.toLowerCase().includes(searchTerm))
        );
    }
    
    if (classFilter !== 'all') {
        filtered = filtered.filter(subject => subject.classId === classFilter);
    }
    
    updateSubjectTable(filtered);
}

// Edit functions
function editTeacher(id) {
    const teacher = appState.teachers.find(t => t.id === id);
    if (!teacher) return;
    
    document.getElementById('teacher-name').value = teacher.name;
    document.getElementById('teacher-email').value = teacher.email;
    document.getElementById('teacher-department').value = teacher.department;
    document.getElementById('teacher-phone').value = teacher.phone;
    document.getElementById('teacher-address').value = teacher.address;
    
    // In a real app, you would have an update function instead of add
    openModal('add-teacher-modal');
    showToast('Edit mode: Teacher details loaded', 'info');
}

function editStudent(id) {
    const student = appState.students.find(s => s.id === id);
    if (!student) return;
    
    document.getElementById('student-name').value = student.name;
    document.getElementById('student-email').value = student.email;
    document.getElementById('student-class').value = student.classId;
    document.getElementById('student-parent').value = student.parentId;
    document.getElementById('student-address').value = student.address;
    
    openModal('add-student-modal');
    showToast('Edit mode: Student details loaded', 'info');
}

function editParent(id) {
    const parent = appState.parents.find(p => p.id === id);
    if (!parent) return;
    
    document.getElementById('parent-name').value = parent.name;
    document.getElementById('parent-email').value = parent.email;
    document.getElementById('parent-phone').value = parent.phone;
    document.getElementById('parent-address').value = parent.address;
    
    openModal('add-parent-modal');
    showToast('Edit mode: Parent details loaded', 'info');
}

function editClass(id) {
    const cls = appState.classes.find(c => c.id === id);
    if (!cls) return;
    
    document.getElementById('class-name').value = cls.name;
    document.getElementById('class-teacher').value = cls.teacherId;
    document.getElementById('class-room').value = cls.roomNo;
    
    openModal('add-class-modal');
    showToast('Edit mode: Class details loaded', 'info');
}

function editSubject(id) {
    const subject = appState.subjects.find(s => s.id === id);
    if (!subject) return;
    
    document.getElementById('subject-name').value = subject.name;
    document.getElementById('subject-class').value = subject.classId;
    document.getElementById('subject-teacher').value = subject.teacherId;
    document.getElementById('subject-book').value = subject.book;
    
    openModal('add-subject-modal');
    showToast('Edit mode: Subject details loaded', 'info');
}

function editAttendance(id) {
    const record = appState.attendance.find(a => a.id === id);
    if (!record) return;
    
    // In a real app, you would implement this
    showToast('Edit attendance functionality would be implemented here', 'info');
}

// Delete confirmation
function confirmDelete(type, id) {
    const modal = document.getElementById('confirmation-modal');
    const message = document.getElementById('confirmation-message');
    
    let itemName = '';
    switch (type) {
        case 'teacher':
            const teacher = appState.teachers.find(t => t.id === id);
            itemName = teacher ? teacher.name : 'this teacher';
            break;
        case 'student':
            const student = appState.students.find(s => s.id === id);
            itemName = student ? student.name : 'this student';
            break;
        case 'parent':
            const parent = appState.parents.find(p => p.id === id);
            itemName = parent ? parent.name : 'this parent';
            break;
        case 'class':
            const cls = appState.classes.find(c => c.id === id);
            itemName = cls ? cls.name : 'this class';
            break;
        case 'subject':
            const subject = appState.subjects.find(s => s.id === id);
            itemName = subject ? subject.name : 'this subject';
            break;
        case 'attendance':
            itemName = 'this attendance record';
            break;
    }
    
    message.textContent = `Are you sure you want to delete ${itemName}? This action cannot be undone.`;
    
    const confirmBtn = document.getElementById('confirm-action-btn');
    confirmBtn.onclick = function() {
        deleteItem(type, id);
        closeModal('confirmation-modal');
    };
    
    openModal('confirmation-modal');
}

function deleteItem(type, id) {
    switch (type) {
        case 'teacher':
            appState.teachers = appState.teachers.filter(t => t.id !== id);
            updateTeacherTable();
            break;
        case 'student':
            appState.students = appState.students.filter(s => s.id !== id);
            updateStudentTable();
            break;
        case 'parent':
            appState.parents = appState.parents.filter(p => p.id !== id);
            updateParentTable();
            break;
        case 'class':
            appState.classes = appState.classes.filter(c => c.id !== id);
            updateClassTable();
            break;
        case 'subject':
            appState.subjects = appState.subjects.filter(s => s.id !== id);
            updateSubjectTable();
            break;
        case 'attendance':
            appState.attendance = appState.attendance.filter(a => a.id !== id);
            updateAttendanceTable();
            break;
    }
    
    updateCounters();
    saveDataToStorage();
    showToast('Item deleted successfully!');
}

// Update counters on dashboard
function updateCounters() {
    document.getElementById('teacher-count').textContent = appState.teachers.length;
    document.getElementById('student-count').textContent = appState.students.length;
    document.getElementById('class-count').textContent = appState.classes.length;
    document.getElementById('subject-count').textContent = appState.subjects.length;
}

// Toast notifications
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Logout function
function logout() {
    // In a real app, this would clear session/token
    localStorage.removeItem('eduManageLoggedIn');
    localStorage.removeItem('adminName');
    
    // Redirect to login page
    // window.location.href = 'login.html';
    showToast('Logged out successfully!');
    console.log('In a real app, would redirect to login page');
}