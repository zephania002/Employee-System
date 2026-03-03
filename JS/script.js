// Dashboard logic for EMS

(function() {
    /* storage helpers */
    const getStorage = () => JSON.parse(localStorage.getItem('employees') || '[]');
    const setStorage = (arr) => localStorage.setItem('employees', JSON.stringify(arr));
    const genId = () => Date.now();

    let employees = getStorage();
    if (!employees.length) {
        employees = [
            { id: genId(), firstName:'Alice', lastName:'Smith', email:'alice@example.com', contactNumber:'123456', salary:50000, address:'1st St', dob:'1990-04-12', age:33, department:'HR', gender:'Female', active:true },
            { id: genId()+1, firstName:'Bob', lastName:'Jones', email:'bob@example.com', contactNumber:'654321', salary:60000, address:'2nd Ave', dob:'1985-08-24', age:38, department:'Engineering', gender:'Male', active:true }
        ];
        setStorage(employees);
    }
    let selectedId = employees[0]?.id || -1;

    // element references
    const toastContainer = document.getElementById('toastContainer');
    const activityList = document.getElementById('activityList');
    const cards = {
        total: document.getElementById('stat-total'),
        active: document.getElementById('stat-active'),
        depts: document.getElementById('stat-depts'),
        payroll: document.getElementById('stat-payroll'),
        attendance: document.getElementById('stat-attendance')
    };
    // directory elements
    const listEl = document.querySelector('.emp-list-items');
    const infoEl = document.querySelector('.emp-detail-info');
    const searchEl = document.getElementById('searchInput');
    const sortEl = document.getElementById('sortSelect');

    // chart contexts
    const deptCtx = document.getElementById('deptChart').getContext('2d');
    const genderCtx = document.getElementById('genderChart').getContext('2d');
    const attendCtx = document.getElementById('attendanceChart').getContext('2d');
    const salaryCtx = document.getElementById('salaryChart').getContext('2d');

    let deptChart, genderChart, attendChart, salaryChart;

    function showToast(msg, type='success') {
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        toastContainer.appendChild(t);
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => { t.classList.remove('show'); t.addEventListener('transitionend',()=>t.remove()); }, 2500);
    }

    function updateStats() {
        const total = employees.length;
        const activeCount = employees.filter(e=>e.active).length;
        const inactiveCount = total - activeCount;
        const depts = [...new Set(employees.map(e=>e.department))].length;
        const payroll = employees.reduce((s,e)=>s+e.salary,0);
        const attendanceRate = total? Math.round((activeCount/total)*100):0;

        cards.total.textContent = total;
        cards.active.textContent = `${activeCount} / ${inactiveCount}`;
        cards.depts.textContent = depts;
        cards.payroll.textContent = `KSh ${payroll.toLocaleString()}`;
        cards.attendance.textContent = `${attendanceRate}%`;
    }

    function computeCharts() {
        // dept distribution
        const byDept = employees.reduce((acc,e)=>{ acc[e.department]=(acc[e.department]||0)+1; return acc; },{});
        const deptLabels = Object.keys(byDept);
        const deptData = Object.values(byDept);
        // gender
        const byGender = employees.reduce((acc,e)=>{ acc[e.gender]=(acc[e.gender]||0)+1; return acc; },{});
        const genderLabels=Object.keys(byGender);
        const genderData=Object.values(byGender);
        // attendance trend (random placeholder)
        const attendLabels=['Jan','Feb','Mar','Apr','May'];
        const attendData=attendLabels.map(_=>Math.floor(Math.random()*100));
        // salary distribution
        const salaries = employees.map(e=>e.salary);

        if (deptChart) deptChart.destroy();
        deptChart = new Chart(deptCtx,{type:'bar',data:{labels:deptLabels,datasets:[{label:'Employees',backgroundColor:'var(--accent)',data:deptData}]}});
        if (genderChart) genderChart.destroy();
        genderChart = new Chart(genderCtx,{type:'pie',data:{labels:genderLabels,datasets:[{backgroundColor:['#4a90d9','#2e5a8f'],data:genderData}]}});
        if (attendChart) attendChart.destroy();
        attendChart = new Chart(attendCtx,{type:'line',data:{labels:attendLabels,datasets:[{label:'Attendance',borderColor:'var(--primary)',data:attendData,fill:false}]}});
        if (salaryChart) salaryChart.destroy();
        // simple histogram: group salaries into ranges
        const bins = [0,20000,40000,60000,80000,100000];
        const counts = bins.map((limit,i) => salaries.filter(s=>s>=limit && s<(bins[i+1]||Infinity)).length);
        salaryChart = new Chart(salaryCtx,{type:'bar',data:{labels:bins.map(b=>`>=${b}`),datasets:[{label:'Employees',backgroundColor:'var(--accent)',data:counts}]}});
    }

    function addActivity(text) {
        const li = document.createElement('li');
        li.textContent = text;
        activityList.prepend(li);
    }

    function renderDirectory() {
        let filtered = [...employees];
        const q = searchEl.value.trim().toLowerCase();
        if (q) {
            filtered = filtered.filter(e =>
                e.firstName.toLowerCase().includes(q) ||
                e.lastName.toLowerCase().includes(q) ||
                e.email.toLowerCase().includes(q)
            );
        }
        const s = sortEl.value;
        filtered.sort((a,b)=>{
            switch(s){
                case 'name': return a.firstName.localeCompare(b.firstName);
                case 'nameDesc': return b.firstName.localeCompare(a.firstName);
                case 'salary': return a.salary-b.salary;
                case 'salaryDesc': return b.salary-a.salary;
                default: return 0;
            }
        });
        listEl.innerHTML = filtered.map(e=>{
            const sel = e.id===selectedId ? ' selected' : '';
            return `<div data-id="${e.id}" class="emp-item${sel}">
                    <span>${e.firstName} ${e.lastName}</span>
                    <span><i class="emp-edit" title="Edit">✏️</i><i class="emp-delete" title="Delete">×</i></span>
                </div>`;
        }).join('');
        const emp = employees.find(e=>e.id===selectedId);
        if(emp){
            infoEl.innerHTML = `
                <img src="${emp.imageUrl||'https://via.placeholder.com/150'}" alt="avatar" />
                <span class="emp-detail-heading">${emp.firstName} ${emp.lastName}</span>
                <div><strong>Email:</strong> ${emp.email}</div>
                <div><strong>Dept:</strong> ${emp.department}</div>
                <div><strong>Salary:</strong> KSh ${emp.salary.toLocaleString()}</div>
                <div><strong>DOB:</strong> ${emp.dob}</div>
                <div class="emp-detail-actions">
                    <button class="edit-detail-btn" onclick="openEdit(${emp.id})">Edit</button>
                    <button class="delete-detail-btn" onclick="delEmp(${emp.id})">× Delete</button>
                </div>`;
        } else {
            infoEl.innerHTML = '<div class="empty-state">Select employee</div>';
        }
    }
    function updateInsights() {
        // simple placeholder logic
        const turnoverRisk = employees.length ? Math.round(Math.random()*100) + '%' : '-';
        const performanceAlerts = Math.floor(Math.random()*5);
        const contractExpiries = employees.filter(e=>Math.random()<0.1).length;
        const leaveTrend = Math.round(Math.random()*100) + '%';
        document.getElementById('insight-turnover').querySelector('span').textContent = turnoverRisk;
        document.getElementById('insight-performance').querySelector('span').textContent = performanceAlerts + ' alerts';
        document.getElementById('insight-contract').querySelector('span').textContent = contractExpiries + ' ending';
        document.getElementById('insight-leave').querySelector('span').textContent = leaveTrend;
    }

    function renderAll() {
        updateStats();
        computeCharts();
        renderDirectory();
        updateInsights();
    }

    /* modal handling */
    const addModal = document.getElementById('addModal');
    const editModal = document.getElementById('editModal');
    const addForm = document.getElementById('addForm');
    const editForm = document.getElementById('editForm');

    function openAdd() { addModal.style.display='flex'; }
    function closeAdd(){ addModal.style.display='none'; addForm.reset(); }
    function openEdit(id){ const e=employees.find(x=>x.id===id); if(!e) return;
        editForm.editId.value=e.id;
        editForm.editFirstName.value=e.firstName;
        editForm.editLastName.value=e.lastName;
        editForm.editEmail.value=e.email;
        editForm.editContactNumber.value=e.contactNumber;
        editForm.editSalary.value=e.salary;
        editForm.editAddress.value=e.address;
        editForm.editDob.value=e.dob;\n        editForm.editDepartment.value = e.department || ';\n        editForm.editGender.value = e.gender || ';
        editModal.style.display='flex';
    }
    function closeEdit(){ editModal.style.display='none'; editForm.reset(); }

    window.openEdit = openEdit;
    window.delEmp = function(id){
        if(!confirm('Delete this employee?')) return;
        employees = employees.filter(e=>e.id!==id);
        setStorage(employees);
        selectedId = employees[0]?.id || -1;
        renderAll();
        showToast('Deleted','warning');
        addActivity('Deleted employee '+id);
    };

    document.querySelector('#btn-add').addEventListener('click', openAdd);
    document.querySelector('#addModal .cancel-btn').addEventListener('click', closeAdd);
    addModal.addEventListener('click', e=>{ if(e.target===addModal) closeAdd(); });
    addForm.addEventListener('submit', e=>{
        e.preventDefault(); const f=new FormData(addForm);
        const dob=f.get('dob'); const year=+dob.split('-')[0];
        const emp={
            id:genId(),
            firstName:f.get('firstName'),
            lastName:f.get('lastName'),
            imageUrl:f.get('imageUrl')||'',
            email:f.get('email'),
            contactNumber:f.get('contactNumber'),
            salary:+f.get('salary'),
            address:f.get('address'),
            dob:dob,
            age:new Date().getFullYear()-year,
            department:f.get('department')||'General',
            gender:f.get('gender')||'Other',
            active:true
        };
        employees.push(emp); setStorage(employees);
        selectedId = emp.id;
        renderAll(); showToast(`${emp.firstName} added!`);
        addActivity('Added employee '+emp.firstName+' '+emp.lastName);
        closeAdd();
    });

    document.querySelector('#editModal .cancel-btn').addEventListener('click', closeEdit);
    editModal.addEventListener('click', e=>{ if(e.target===editModal) closeEdit(); });
    editForm.addEventListener('submit', e=>{
        e.preventDefault(); const f=new FormData(editForm); const id=+f.get('editId'); const idx=employees.findIndex(x=>x.id===id);
        const dob=f.get('editDob'); const year=+dob.split('-')[0];
        employees[idx]={
            ...employees[idx],
            firstName:f.get('editFirstName'),
            lastName:f.get('editLastName'),
            email:f.get('editEmail'),
            contactNumber:f.get('editContactNumber'),
            salary:+f.get('editSalary'),
            address:f.get('editAddress'),
            department: f.get('editDepartment') || employees[idx].department,
            gender: f.get('editGender') || employees[idx].gender,
            dob:dob,
            age:new Date().getFullYear()-year
        };
        setStorage(employees);
        renderAll(); showToast('Updated!','success'); addActivity('Updated employee '+employees[idx].firstName);
        closeEdit();
    });

    // quick actions stubs
    document.getElementById('btn-approve-leave').addEventListener('click',()=>showToast('Leave approved'));
    document.getElementById('btn-payroll').addEventListener('click',()=>showToast('Payroll generated'));
    document.getElementById('btn-export').addEventListener('click',()=>showToast('Report exported'));

    // directory interaction
    listEl.addEventListener('click', e=>{
        if(e.target.classList.contains('emp-delete')){ const id=+e.target.closest('.emp-item').dataset.id; delEmp(id); return; }
        if(e.target.classList.contains('emp-edit')){ const id=+e.target.closest('.emp-item').dataset.id; openEdit(id); return; }
        const item=e.target.closest('.emp-item');
        if(item){ selectedId=+item.dataset.id; renderDirectory(); }
    });
    searchEl.addEventListener('input',renderDirectory);
    sortEl.addEventListener('change',renderDirectory);

    // mobile sidebar toggle
    document.getElementById('mobile-toggle').addEventListener('click',()=>{
        document.querySelector('.sidebar').classList.toggle('collapsed');
    });

    // initialize
    renderAll();
})();
