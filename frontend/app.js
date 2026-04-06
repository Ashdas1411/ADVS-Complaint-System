/* ─── THEME TOGGLE ───────────────────────────────── */
(function () {
  var saved = localStorage.getItem('hostel_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();

const API = 'https://advs-complaint-system.onrender.com';

function togglePw(inputId, btn) {
  var input = document.getElementById(inputId);
  var eyeShow = btn.querySelector('.eye-show');
  var eyeHide = btn.querySelector('.eye-hide');
  if (input.type === 'password') {
    input.type = 'text';
    eyeShow.style.display = 'none';
    eyeHide.style.display = 'block';
  } else {
    input.type = 'password';
    eyeShow.style.display = 'block';
    eyeHide.style.display = 'none';
  }
}

var MH_BLOCKS_LIST = ['A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','T'];
var WH_BLOCKS_LIST = ['A','B','C','D','E','F','G','H','J','S'];

function updateBlockOptions(selectId, zone) {
  var sel = document.getElementById(selectId);
  if (!sel) return;
  var blocks = zone === 'WH' ? WH_BLOCKS_LIST : MH_BLOCKS_LIST;
  sel.innerHTML = blocks.map(function(b) {
    return '<option value="' + b + '">Block ' + b + '</option>';
  }).join('');
}

let currentEmail = '';
let currentRole = '';
let currentStaffData = null;
let allComplaints = [];
let categoryChart = null;
let urgencyChart = null;

/* PARTICLES */
(function () {
  var container = document.getElementById('particles');
  for (var i = 0; i < 18; i++) {
    var p = document.createElement('div');
    p.className = 'particle';
    var size = Math.random() * 3 + 1;
    p.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (Math.random()*100) + '%;animation-duration:' + (8+Math.random()*14) + 's;animation-delay:' + (Math.random()*12) + 's';
    container.appendChild(p);
  }
})();

function applyRoleUI(role) {
  document.querySelectorAll('.role-student').forEach(function (el) {
    el.style.display = role === 'student' ? '' : 'none';
  });
  document.querySelectorAll('.role-staff').forEach(function (el) {
    el.style.display = role === 'staff' ? '' : 'none';
  });

  document.querySelectorAll('.nav-item').forEach(function (b) { b.classList.remove('active'); });
  document.querySelectorAll('.tab-content').forEach(function (tc) { tc.classList.remove('active'); });

  // ── Staff lands on Dashboard, Student lands on New Complaint ──
  var defaultTab = role === 'staff' ? 'dashboard' : 'submit';
  var defaultBtn     = document.querySelector('[data-tab="' + defaultTab + '"]');
  var defaultContent = document.getElementById('tab-' + defaultTab);
  if (defaultBtn)     defaultBtn.classList.add('active');
  if (defaultContent) defaultContent.classList.add('active');
  document.getElementById('tabTitle').textContent = tabTitles[defaultTab] || '';

  if (role === 'student') {
    loadComplaints();
    loadResolvedStudent();
    setTimeout(function () { wizRender(); }, 0);
  }

  // Load dashboard data immediately on staff login
  if (role === 'staff') {
    loadDashboard();
  }
}

/* UTILS */
function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + (type || 'info') + ' show';
  setTimeout(function () { t.className = 'toast'; }, 3500);
}

function show(id) { document.getElementById(id).style.display = 'flex'; }
function hide(id) { document.getElementById(id).style.display = 'none'; }
function showBlock(id) { document.getElementById(id).style.display = 'block'; }

function setLoading(btn, on) {
  var txt = btn.querySelector('.btn-text');
  var ldr = btn.querySelector('.btn-loader');
  if (on) {
    if (txt) txt.style.opacity = '0.5';
    if (ldr) ldr.style.display = 'inline-block';
    btn.disabled = true;
  } else {
    if (txt) txt.style.opacity = '1';
    if (ldr) ldr.style.display = 'none';
    btn.disabled = false;
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  } catch (e) { return '—'; }
}

function getBadgeClass(u) {
  if (!u) return 'badge-pending';
  u = u.toLowerCase();
  if (u === 'high' || u === 'critical') return 'badge-high';
  if (u === 'medium') return 'badge-medium';
  if (u === 'low') return 'badge-low';
  return 'badge-pending';
}

function escapeHtml(str) {
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

/* OTP DIGIT INPUTS */
var otpDigits = document.querySelectorAll('.otp-digit');
otpDigits.forEach(function (inp, i) {
  inp.addEventListener('input', function () {
    inp.value = inp.value.replace(/\D/g, '');
    if (inp.value && i < otpDigits.length - 1) otpDigits[i + 1].focus();
  });
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Backspace' && !inp.value && i > 0) otpDigits[i - 1].focus();
  });
  inp.addEventListener('paste', function (e) {
    var txt = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
    if (txt.length === 6) {
      otpDigits.forEach(function (d, j) { d.value = txt[j] || ''; });
      otpDigits[5].focus();
      e.preventDefault();
    }
  });
});

function getOTP() {
  return Array.from(otpDigits).map(function (d) { return d.value; }).join('');
}

function showStep(id) {
  var steps = ['step-role','step-email','step-otp','step-staff-login','step-staff-register'];
  steps.forEach(function(s) {
    var el = document.getElementById(s);
    if (el) el.style.display = 'none';
  });
  var target = document.getElementById(id);
  if (target) {
    target.style.display = 'flex';
    target.style.flexDirection = 'column';
    target.style.gap = '14px';
  }
}

function goToRoleStep() {
  showStep('step-role');
}

function goToOtpStep(email) {
  showStep('step-otp');
  document.getElementById('otpEmailDisplay').textContent = email;
  otpDigits[0].focus();
}

function goToEmailStep() {
  showStep('step-email');
}

/* ROLE SELECTION */
document.getElementById('roleStudentBtn').addEventListener('click', function () {
  currentRole = 'student';
  showStep('step-email');
});

document.getElementById('roleStaffBtn').addEventListener('click', function () {
  currentRole = 'staff';
  showStep('step-staff-login');
});

document.getElementById('backToRoleFromEmail').addEventListener('click', function () {
  goToRoleStep();
});

document.getElementById('backToRoleFromStaff').addEventListener('click', function () {
  goToRoleStep();
});

document.getElementById('backToStaffLogin').addEventListener('click', function () {
  showStep('step-staff-login');
});

document.getElementById('goToStaffRegisterBtn').addEventListener('click', function () {
  showStep('step-staff-register');
  showRegSubStep(1);
});

/* STAFF LOGIN */
document.getElementById('staffLoginBtn').addEventListener('click', function () {
  var staffId  = document.getElementById('staffIdInput').value.trim();
  var password = document.getElementById('staffPasswordInput').value;
  if (!staffId)  { showToast('Enter your Staff ID', 'error'); return; }
  if (!password) { showToast('Enter your password', 'error'); return; }
  var btn = this;
  setLoading(btn, true);
  fetch(API + '/staff/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staff_id: staffId, password: password })
  })
  .then(function (res) {
    return res.json().then(function (data) { return { ok: res.ok, data: data }; });
  })
  .then(function (r) {
    if (!r.ok) throw new Error(r.data.detail || 'Login failed');
    currentStaffData = r.data;
    sessionStorage.setItem('hostel_staff', JSON.stringify(r.data));
    staffLoginSuccess(r.data);
    showToast('Welcome, ' + r.data.name + '!', 'success');
  })
  .catch(function (e) { showToast(e.message, 'error'); })
  .finally(function () { setLoading(btn, false); });
});

/* ═══════════════════════════════════════════
   MULTI-STEP STAFF REGISTRATION
═══════════════════════════════════════════ */
var regData = {};
var regOtpDigits = document.querySelectorAll('.reg-otp-digit');

regOtpDigits.forEach(function (inp, i) {
  inp.addEventListener('input', function () {
    inp.value = inp.value.replace(/\D/g, '');
    if (inp.value && i < regOtpDigits.length - 1) regOtpDigits[i + 1].focus();
  });
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Backspace' && !inp.value && i > 0) regOtpDigits[i - 1].focus();
  });
  inp.addEventListener('paste', function (e) {
    var txt = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
    if (txt.length === 6) {
      regOtpDigits.forEach(function (d, j) { d.value = txt[j] || ''; });
      regOtpDigits[5].focus();
      e.preventDefault();
    }
  });
});

function showRegSubStep(n) {
  for (var i = 1; i <= 4; i++) {
    var el = document.getElementById('reg-step-' + i);
    if (el) {
      el.style.display = i === n ? 'flex' : 'none';
      if (i === n) el.style.flexDirection = 'column';
    }
    var dot = document.getElementById('regDot' + i);
    if (dot) dot.classList.toggle('active', i <= n);
    var line = document.getElementById('regLine' + i);
    if (line) line.classList.toggle('active', i < n);
  }
}

document.getElementById('regStep1NextBtn').addEventListener('click', function () {
  var name    = document.getElementById('staffRegNameInput').value.trim();
  var staffId = document.getElementById('staffRegIdInput').value.trim();
  if (!name)    { showToast('Enter your full name', 'error'); return; }
  if (!staffId) { showToast('Enter a Staff ID', 'error'); return; }
  regData.name    = name;
  regData.staffId = staffId;
  showRegSubStep(2);
  updateBlockOptions('staffRegBlockSelect', document.getElementById('staffRegZoneSelect').value);
});

document.getElementById('regBackTo1').addEventListener('click', function () {
  showRegSubStep(1);
});

document.getElementById('regStep2NextBtn').addEventListener('click', function () {
  regData.zone  = document.getElementById('staffRegZoneSelect').value;
  regData.block = document.getElementById('staffRegBlockSelect').value;
  showRegSubStep(3);
});

document.getElementById('regBackTo2').addEventListener('click', function () {
  showRegSubStep(2);
});

document.getElementById('regSendOtpBtn').addEventListener('click', function () {
  var email   = document.getElementById('staffRegEmailInput').value.trim();
  var pw      = document.getElementById('staffRegPasswordInput').value;
  var confirm = document.getElementById('staffRegConfirmInput').value;
  if (!email || email.indexOf('@') === -1) { showToast('Enter a valid email', 'error'); return; }
  if (!pw || pw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
  if (pw !== confirm)       { showToast('Passwords do not match', 'error'); return; }
  regData.email    = email;
  regData.password = pw;
  var btn = this;
  setLoading(btn, true);
  fetch(API + '/generate-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email })
  })
  .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
  .then(function (r) {
    if (!r.ok) throw new Error(r.data.detail || 'Failed to send OTP');
    document.getElementById('regOtpEmailDisplay').textContent = email;
    showRegSubStep(4);
    showToast('OTP sent to ' + email, 'success');
    regOtpDigits[0].focus();
  })
  .catch(function (e) { showToast(e.message, 'error'); })
  .finally(function () { setLoading(btn, false); });
});

document.getElementById('regBackTo3').addEventListener('click', function () {
  regOtpDigits.forEach(function (d) { d.value = ''; });
  showRegSubStep(3);
});

document.getElementById('regCreateAccountBtn').addEventListener('click', function () {
  var otp = Array.from(regOtpDigits).map(function (d) { return d.value; }).join('');
  if (otp.length !== 6) { showToast('Enter all 6 digits', 'error'); return; }
  var btn = this;
  setLoading(btn, true);
  fetch(API + '/staff/register-with-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      staff_id:    regData.staffId,
      name:        regData.name,
      password:    regData.password,
      hostel_zone: regData.zone,
      block:       regData.block,
      email:       regData.email,
      otp:         otp
    })
  })
  .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
  .then(function (r) {
    if (!r.ok) throw new Error(r.data.detail || 'Registration failed');
    showToast('Account created successfully! Please log in.', 'success');
    var prefillId = regData.staffId;
    regData = {};
    regOtpDigits.forEach(function (d) { d.value = ''; });
    document.getElementById('staffIdInput').value = prefillId || '';
    showStep('step-staff-login');
  })
  .catch(function (e) { showToast(e.message, 'error'); })
  .finally(function () { setLoading(btn, false); });
});

/* SEND OTP */
document.getElementById('sendOtpBtn').addEventListener('click', function () {
  var email = document.getElementById('emailInput').value.trim();
  if (!email || email.indexOf('@') === -1) { showToast('Enter a valid email', 'error'); return; }
  var btn = this;
  setLoading(btn, true);
  fetch(API + '/generate-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email })
  })
  .then(function (res) {
    return res.json().then(function (data) { return { ok: res.ok, data: data }; });
  })
  .then(function (r) {
    if (!r.ok) throw new Error(r.data.detail || 'Failed to send OTP');
    currentEmail = email;
    goToOtpStep(email);
    showToast('OTP sent!', 'success');
  })
  .catch(function (e) { showToast(e.message, 'error'); })
  .finally(function () { setLoading(btn, false); });
});

/* BACK */
document.getElementById('backBtn').addEventListener('click', function () {
  showStep('step-email');
  otpDigits.forEach(function (d) { d.value = ''; });
});

/* VERIFY OTP */
document.getElementById('verifyOtpBtn').addEventListener('click', function () {
  var otp = getOTP();
  if (otp.length !== 6) { showToast('Enter all 6 digits', 'error'); return; }
  var btn = this;
  setLoading(btn, true);
  fetch(API + '/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: currentEmail, otp: otp })
  })
  .then(function (res) {
    return res.json().then(function (data) { return { ok: res.ok, data: data }; });
  })
  .then(function (r) {
    if (!r.ok) throw new Error(r.data.detail || 'Invalid OTP');
    loginSuccess(currentEmail);
    showToast('Welcome!', 'success');
  })
  .catch(function (e) { showToast(e.message, 'error'); })
  .finally(function () { setLoading(btn, false); });
});

/* LOGIN SUCCESS */
function loginSuccess(email) {
  sessionStorage.setItem('hostel_email', email);
  currentRole  = 'student';
  currentEmail = email;
  document.getElementById('lastResultCard').style.display = 'none';
  document.getElementById('lastResultBody').innerHTML = '';
  wizState = { step: 0, location: null, hostel: null, block: null, floor: null, cluster: null, washroom: null, caterer: null, tier: null, room: '', description: '' };
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('userEmailDisplay').textContent = email;
  document.getElementById('userAvatar').textContent = email.charAt(0).toUpperCase();
  applyRoleUI('student');
}

function staffLoginSuccess(staffData) {
  sessionStorage.setItem('hostel_role', 'staff');
  sessionStorage.setItem('hostel_staff', JSON.stringify(staffData));
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('userEmailDisplay').textContent = staffData.staff_id;
  document.getElementById('userAvatar').textContent = staffData.name.charAt(0).toUpperCase();
  document.querySelector('.user-role').textContent = (staffData.hostel_zone || '') + (staffData.block ? ' · Block ' + staffData.block : '') + ' Staff';
  currentRole      = 'staff';
  currentStaffData = staffData;
  var zoneSelect = document.getElementById('routeStaffType');
  if (zoneSelect) zoneSelect.value = staffData.hostel_zone;
  applyRoleUI('staff');
  loadDashboard();
}

/* AUTO LOGIN */
var savedEmail = sessionStorage.getItem('hostel_email');
var savedStaff = sessionStorage.getItem('hostel_staff');
if (savedEmail) {
  currentEmail = savedEmail;
  currentRole  = 'student';
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('userEmailDisplay').textContent = savedEmail;
  document.getElementById('userAvatar').textContent = savedEmail.charAt(0).toUpperCase();
  applyRoleUI('student');
  loadComplaints();
} else if (savedStaff) {
  var parsedStaff = JSON.parse(savedStaff);
  staffLoginSuccess(parsedStaff);
}

/* LOGOUT */
document.getElementById('logoutBtn').addEventListener('click', function () {
  sessionStorage.removeItem('hostel_email');
  sessionStorage.removeItem('hostel_staff');
  sessionStorage.removeItem('hostel_role');
  currentEmail     = '';
  currentRole      = '';
  currentStaffData = null;
  allComplaints    = [];
  document.getElementById('lastResultCard').style.display = 'none';
  document.getElementById('lastResultBody').innerHTML = '';
  wizState = { step: 0, location: null, hostel: null, block: null, floor: null, cluster: null, washroom: null, caterer: null, tier: null, room: '', description: '' };
  document.getElementById('complaintGrid').innerHTML = '';
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('emailInput').value = '';
  otpDigits.forEach(function (d) { d.value = ''; });
  document.querySelector('.user-role').textContent = 'Student';
  goToRoleStep();
});

/* TABS */
var tabTitles = {
  submit:            'New Complaint',
  complaints:        'My Complaints',
  'resolved-student':'Resolved Complaints',
  analytics:         'Analytics',
  routing:           'Route Planner',
  resolved:          'Resolved Complaints',
  'all-complaints':  'Complaints',
  dashboard:         'Dashboard',
  settings:          'Settings'
};

document.querySelectorAll('.nav-item').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var tab = btn.dataset.tab;
    document.querySelectorAll('.nav-item').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(function (tc) { tc.classList.remove('active'); });
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('tabTitle').textContent = tabTitles[tab];
    if (tab === 'submit')         setTimeout(function () { wizRender(); }, 0);
    if (tab === 'analytics')      loadAnalytics();
    if (tab === 'complaints')     loadComplaints();
    if (tab === 'routing')        initRoutingTab();
    if (tab === 'resolved')       loadResolvedComplaints();
    if (tab === 'all-complaints') loadAllComplaintsForStaff();
    if (tab === 'dashboard')      loadDashboard();
    if (tab === 'settings')       loadSettings();
    if (tab === 'resolved-student') loadResolvedStudent();
  });
});

/* ─── HELP FLOAT BUTTON ─────────────────────────── */
var helpFloatBtn = document.getElementById('helpFloatBtn');
var helpPanel    = document.getElementById('helpPanel');
var helpOpen     = false;

if (helpFloatBtn && helpPanel) {
  helpFloatBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    helpOpen = !helpOpen;
    helpPanel.classList.toggle('show', helpOpen);
    helpFloatBtn.classList.toggle('active', helpOpen);
  });
  document.addEventListener('click', function (e) {
    if (helpOpen && !helpPanel.contains(e.target) && e.target !== helpFloatBtn) {
      helpOpen = false;
      helpPanel.classList.remove('show');
      helpFloatBtn.classList.remove('active');
    }
  });
}

/* ═══════════════════════════════════════════
   MULTI-STEP COMPLAINT WIZARD
═══════════════════════════════════════════ */

var MH_CATERERS = {
  'Darling (DR)':   ['Non-Veg', 'Special'],
  'Zenith':         ['Veg', 'Non-Veg', 'Special', 'Paid (Foodcy)'],
  'SRRC (RRC)':     ['Veg', 'Non-Veg', 'Special', 'Paid (Food Mall)'],
  'PR (Premier)':   ['Veg', 'Special'],
  'CRC':            ['Veg', 'Non-Veg', 'Special', 'Paid (Food Park)'],
  'PRD':            ['Veg', 'Paid (Buddies & Bites)'],
  'Grace':          ['Veg', 'Non-Veg'],
  'FFPL (Fusion)':  ['Non-Veg', 'Special'],
  'SKC':            ['Non-Veg', 'Special'],
  'RSM':            ['Veg', 'Special'],
  'MHPL':           ['Veg', 'Special'],
  'AAC':            ['Non-Veg', 'Special']
};

var WH_CATERERS = {
  'Ques':        ['Veg', 'Non-Veg', 'Special'],
  'PRD':         ['Veg', 'Non-Veg', 'Special', 'Paid'],
  'CRCL (CRC)': ['Veg', 'Non-Veg', 'Special', 'Paid'],
  'Zenith':      ['Veg', 'Non-Veg', 'Special']
};

var MH_BLOCKS_WIZ = ['A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','T'];
var WH_BLOCKS_WIZ = ['A','B','C','D','E','F','G','H','J','S'];

var wizState = {
  step: 0,
  location: null,
  hostel: null,
  block: null,
  floor: null,
  cluster: null,
  washroom: null,
  caterer: null,
  tier: null,
  room: '',
  description: ''
};

function wizGetStepCount() {
  if (!wizState.location) return 2;
  if (wizState.location === 'room') return 3;
  if (wizState.location === 'hallway') return 2;
  if (wizState.location === 'mess') return 4;
  if (wizState.location === 'washroom') {
    var n = 3;
    if (wizState.hostel && wizState.block) {
      if (wizState.block === 'R' && wizState.hostel === 'Men') n++;
      if ((wizState.block === 'T' && wizState.hostel === 'Men') ||
          (wizState.block === 'S' && wizState.hostel === 'Women')) n++;
    }
    return n + 1;
  }
  return 2;
}

function wizRenderBar() {
  var bar = document.getElementById('wizardStepBar');
  if (!bar) return;
  var total = wizGetStepCount();
  bar.innerHTML = '';
  for (var i = 0; i < total; i++) {
    var dot = document.createElement('div');
    dot.className = 'wiz-dot' +
      (i < wizState.step ? ' wiz-done' : i === wizState.step ? ' wiz-active' : '');
    dot.textContent = i < wizState.step ? '✓' : (i + 1);
    bar.appendChild(dot);
    if (i < total - 1) {
      var line = document.createElement('div');
      line.className = 'wiz-line' + (i < wizState.step ? ' wiz-done' : '');
      bar.appendChild(line);
    }
  }
}

function wizRender() {
  wizRenderBar();
  var c = document.getElementById('wizardContent');
  if (!c) return;
  c.innerHTML = '';
  var s = wizState.step;
  var loc = wizState.location;

  if (s > 0 && !loc) {
    wizState.step = 0;
    wizRender();
    return;
  }

  if (s === 0) { wizRenderLocation(c); return; }

  if (loc === 'room') {
    if (s === 1) { wizRenderRoomInput(c); return; }
    if (s === 2) { wizRenderDescription(c, 'Room ' + (wizState.room || '')); return; }
  }

  if (loc === 'hallway') {
    if (s === 1) { wizRenderDescription(c, 'Hallway'); return; }
  }

  if (loc === 'washroom') {
    if (s === 1) { wizRenderHostelSelect(c); return; }
    if (s === 2) { wizRenderBlockSelect(c); return; }
    if (s === 3) {
      if (wizState.floor === null || wizState.floor === undefined) {
        wizRenderFloorInput(c); return;
      }
      var needCluster = (wizState.block === 'R' && wizState.hostel === 'Men');
      var needWR = (wizState.block === 'T' && wizState.hostel === 'Men') ||
                  (wizState.block === 'S' && wizState.hostel === 'Women');
      if (needCluster && !wizState.cluster) { wizRenderClusterSelect(c); return; }
      if (needWR && !wizState.washroom)     { wizRenderWashroomSelect(c); return; }
      wizRenderDescription(c, wizBuildWashroomCtx()); return;
    }
    if (s === 4) { wizRenderDescription(c, wizBuildWashroomCtx()); return; }
  }

  if (loc === 'mess') {
    if (s === 1) { wizRenderHostelSelect(c); return; }
    if (s === 2) { wizRenderCatererSelect(c); return; }
    if (s === 3) { wizRenderTierSelect(c); return; }
    if (s === 4) { wizRenderDescription(c, wizState.caterer + ' · ' + wizState.tier); return; }
  }

  if (s > 0 && !loc) {
  wizState.step = 0;
  wizRender();
}
}

function wizBuildWashroomCtx() {
  var ctx = (wizState.hostel || '') + "'s Hostel · Block " + (wizState.block || '');
  if (wizState.floor !== null && wizState.floor !== undefined) ctx += ' · Floor ' + wizState.floor;
  if (wizState.cluster) ctx += ' · Cluster ' + wizState.cluster;
  if (wizState.washroom) ctx += ' · Washroom ' + wizState.washroom;
  return ctx;
}

function wizRenderLocation(c) {
  var heading = document.createElement('div');
  heading.innerHTML = '<p class="wiz-step-title">Where is the issue?</p><p class="wiz-step-sub">Select the location so we can route your complaint correctly.</p>';
  c.appendChild(heading);

  var grid = document.createElement('div');
  grid.className = 'wiz-location-grid';
  var opts = [
    { key: 'room',     icon: '🚪', label: 'Room' },
    { key: 'washroom', icon: '🚿', label: 'Washroom' },
    { key: 'hallway',  icon: '🏛️', label: 'Hallway' },
    { key: 'mess',     icon: '🍽️', label: 'Mess' }
  ];
  opts.forEach(function(o) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wiz-option-btn';
    btn.innerHTML = '<span class="wiz-option-icon">' + o.icon + '</span><span>' + o.label + '</span>';
    btn.addEventListener('click', function() {
      wizState.location = o.key;
      wizState.step = 1;
      wizState.hostel = null; wizState.block = null; wizState.floor = null;
      wizState.cluster = null; wizState.washroom = null;
      wizState.caterer = null; wizState.tier = null; wizState.room = '';
      wizRender();
    });
    grid.appendChild(btn);
  });
  c.appendChild(grid);
}

function wizRenderRoomInput(c) {
  c.innerHTML = '';
  var heading = document.createElement('div');
  heading.innerHTML = '<p class="wiz-step-title">What\'s your room number?</p><p class="wiz-step-sub">Enter your room number so we can track and route this complaint correctly.</p>';
  c.appendChild(heading);

  var fg = document.createElement('div'); fg.className = 'wiz-field-group';
  var lbl = document.createElement('label'); lbl.className = 'wiz-field-label'; lbl.textContent = 'Room Number';
  var inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'wiz-input';
  inp.id = 'wizRoomInp';
  inp.placeholder = 'e.g. Q-415';
  inp.maxLength = 10;
  inp.style.width = '160px';
  inp.style.textTransform = 'uppercase';
  inp.style.letterSpacing = '0.08em';
  inp.value = wizState.room || '';

  var fb = document.createElement('div'); fb.className = 'wiz-feedback'; fb.id = 'wizRoomFb';

  inp.addEventListener('input', function () {
    this.value = this.value.toUpperCase();
    var m = this.value.match(/^([A-Z])-?(\d{1,2})(\d{2})$/);
    if (m) {
      inp.className = 'wiz-input wiz-valid';
      fb.className = 'wiz-feedback ok';
      fb.textContent = '✓ Block ' + m[1] + ', Floor ' + m[2] + ', Room ' + m[3];
    } else if (this.value.length > 2) {
      inp.className = 'wiz-input wiz-invalid';
      fb.className = 'wiz-feedback err';
      fb.textContent = '✗ Use format: Q-415 or A-101';
    } else {
      inp.className = 'wiz-input';
      fb.className = 'wiz-feedback';
      fb.textContent = '';
    }
  });

  fg.appendChild(lbl);
  fg.appendChild(inp);
  fg.appendChild(fb);
  c.appendChild(fg);

  wizAppendBtnRow(c,
    function () { wizState.step = 0; wizState.room = ''; wizRender(); },
    function () {
      var val = document.getElementById('wizRoomInp').value.trim().toUpperCase();
      var m = val.match(/^([A-Z])-?(\d{1,2})(\d{2})$/);
      if (!m) {
        var fbEl = document.getElementById('wizRoomFb');
        if (fbEl) { fbEl.className = 'wiz-feedback err'; fbEl.textContent = '✗ Please enter a valid room number like Q-415'; }
        return;
      }
      // Normalise to canonical form
      wizState.room = m[1] + '-' + m[2] + m[3];
      wizState.step = 2;
      wizRender();
    }
  );
}

function wizRenderHostelSelect(c) {
  c.innerHTML = '<p class="wiz-step-title">Which hostel?</p><p class="wiz-step-sub">Select the hostel where the issue occurred.</p>';
  var grid = document.createElement('div');
  grid.className = 'wiz-location-grid';
  ['Men', 'Women'].forEach(function(h) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wiz-option-btn' + (wizState.hostel === h ? ' wiz-selected' : '');
    btn.innerHTML = '<span class="wiz-option-icon">' + (h === 'Men' ? '♂' : '♀') + '</span><span>' + h + "'s Hostel</span>";
    btn.addEventListener('click', function() {
      wizState.hostel = h;
      wizState.block = null; wizState.caterer = null; wizState.tier = null;
      document.querySelectorAll('#wizardContent .wiz-option-btn').forEach(function(b) { b.classList.remove('wiz-selected'); });
      btn.classList.add('wiz-selected');
    });
    grid.appendChild(btn);
  });
  c.appendChild(grid);
  wizAppendBtnRow(c,
    function() { wizState.step = 0; wizState.hostel = null; wizRender(); },
    function() { if (!wizState.hostel) return; wizState.step = 2; wizRender(); }
  );
}

function wizRenderBlockSelect(c) {
  var blocks = wizState.hostel === 'Men' ? MH_BLOCKS_WIZ : WH_BLOCKS_WIZ;
  c.innerHTML = '<p class="wiz-step-title">Which block?</p>';
  var fg = document.createElement('div'); fg.className = 'wiz-field-group';
  var lbl = document.createElement('label'); lbl.className = 'wiz-field-label'; lbl.textContent = 'Block';
  var sel = document.createElement('select'); sel.className = 'wiz-select'; sel.id = 'wizBlockSel';
  sel.innerHTML = '<option value="">Select block</option>' +
    blocks.map(function(b) { return '<option value="' + b + '"' + (wizState.block === b ? ' selected' : '') + '>' + b + '</option>'; }).join('');
  fg.appendChild(lbl); fg.appendChild(sel); c.appendChild(fg);
  wizAppendBtnRow(c,
    function() { wizState.step = 1; wizState.block = null; wizRender(); },
    function() {
      var v = document.getElementById('wizBlockSel').value;
      if (!v) return;
      wizState.block = v; wizState.floor = null; wizState.cluster = null; wizState.washroom = null;
      wizState.step = 3; wizRender();
    }
  );
}

function wizRenderFloorInput(c) {
  c.innerHTML = '<p class="wiz-step-title">Which floor?</p>';
  var fg = document.createElement('div'); fg.className = 'wiz-field-group';
  var lbl = document.createElement('label'); lbl.className = 'wiz-field-label'; lbl.textContent = 'Floor number (0–20)';
  var inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'wiz-input'; inp.id = 'wizFloorInp';
  inp.placeholder = 'e.g. 4'; inp.style.width = '140px';
  inp.value = (wizState.floor !== null && wizState.floor !== undefined) ? wizState.floor : '';
  var fb = document.createElement('div'); fb.className = 'wiz-feedback'; fb.id = 'wizFloorFb';
  fg.appendChild(lbl); fg.appendChild(inp); fg.appendChild(fb); c.appendChild(fg);
  wizAppendBtnRow(c,
    function() { wizState.step = 2; wizState.floor = null; wizRender(); },
    function() {
      var raw = document.getElementById('wizFloorInp').value.trim();
      var fb2 = document.getElementById('wizFloorFb');
      if (raw === '' || !/^\d+$/.test(raw) || Number(raw) < 0 || Number(raw) > 20) {
        fb2.className = 'wiz-feedback err';
        fb2.textContent = '✗ Please enter a floor between 0 and 20.';
        return;
      }
      wizState.floor = Number(raw);
      var needCluster = (wizState.block === 'R' && wizState.hostel === 'Men');
      var needWR = (wizState.block === 'T' && wizState.hostel === 'Men') ||
                  (wizState.block === 'S' && wizState.hostel === 'Women');
      if (!needCluster && !needWR) { wizState.step = 4; wizState.cluster = null; wizState.washroom = null; }
      wizRender();
    }
  );
}

function wizRenderClusterSelect(c) {
  c.innerHTML = '<p class="wiz-step-title">Which cluster?</p>';
  var grid = document.createElement('div'); grid.className = 'wiz-cluster-grid';
  ['A','B','C','D','E'].forEach(function(cl) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wiz-option-btn' + (wizState.cluster === cl ? ' wiz-selected' : '');
    btn.innerHTML = '<span style="font-size:16px;font-weight:500">' + cl + '</span><span style="font-size:11px">Cluster ' + cl + '</span>';
    btn.addEventListener('click', function() {
      wizState.cluster = cl;
      document.querySelectorAll('#wizardContent .wiz-option-btn').forEach(function(b) { b.classList.remove('wiz-selected'); });
      btn.classList.add('wiz-selected');
    });
    grid.appendChild(btn);
  });
  c.appendChild(grid);
  wizAppendBtnRow(c,
    function() { wizState.floor = null; wizState.cluster = null; wizRender(); },
    function() { if (!wizState.cluster) return; wizState.step = 4; wizRender(); }
  );
}

function wizRenderWashroomSelect(c) {
  c.innerHTML = '<p class="wiz-step-title">Which washroom?</p><p class="wiz-step-sub">Block ' + wizState.block + ' has two washrooms on each floor.</p>';
  var grid = document.createElement('div'); grid.className = 'wiz-location-grid';
  ['1','2'].forEach(function(n) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wiz-option-btn' + (wizState.washroom === n ? ' wiz-selected' : '');
    btn.innerHTML = '<span style="font-size:18px;font-weight:500">' + n + '</span><span style="font-size:12px">Washroom ' + n + '</span>';
    btn.addEventListener('click', function() {
      wizState.washroom = n;
      document.querySelectorAll('#wizardContent .wiz-option-btn').forEach(function(b) { b.classList.remove('wiz-selected'); });
      btn.classList.add('wiz-selected');
    });
    grid.appendChild(btn);
  });
  c.appendChild(grid);
  wizAppendBtnRow(c,
    function() { wizState.floor = null; wizState.washroom = null; wizRender(); },
    function() { if (!wizState.washroom) return; wizState.step = 4; wizRender(); }
  );
}

function wizRenderCatererSelect(c) {
  var caterers = wizState.hostel === 'Men' ? Object.keys(MH_CATERERS) : Object.keys(WH_CATERERS);
  c.innerHTML = '<p class="wiz-step-title">Select your caterer</p>';
  var chip = document.createElement('div');
  chip.className = 'wiz-context-chip';
  chip.textContent = '🏛 ' + wizState.hostel + "'s Hostel Mess";
  c.appendChild(chip);
  var fg = document.createElement('div'); fg.className = 'wiz-field-group';
  var lbl = document.createElement('label'); lbl.className = 'wiz-field-label'; lbl.textContent = 'Caterer';
  var sel = document.createElement('select'); sel.className = 'wiz-select'; sel.id = 'wizCatSel';
  sel.innerHTML = '<option value="">Choose caterer</option>' +
    caterers.map(function(ct) { return '<option value="' + ct + '"' + (wizState.caterer === ct ? ' selected' : '') + '>' + ct + '</option>'; }).join('');
  fg.appendChild(lbl); fg.appendChild(sel); c.appendChild(fg);
  wizAppendBtnRow(c,
    function() { wizState.step = 1; wizState.caterer = null; wizState.tier = null; wizRender(); },
    function() {
      var v = document.getElementById('wizCatSel').value;
      if (!v) return;
      wizState.caterer = v; wizState.tier = null; wizState.step = 3; wizRender();
    }
  );
}

function wizRenderTierSelect(c) {
  var map = wizState.hostel === 'Men' ? MH_CATERERS : WH_CATERERS;
  var tiers = map[wizState.caterer] || [];
  c.innerHTML = '<p class="wiz-step-title">Dining tier</p>';
  var chip = document.createElement('div');
  chip.className = 'wiz-context-chip';
  chip.textContent = '🍽 ' + wizState.caterer;
  c.appendChild(chip);
  var lbl = document.createElement('label'); lbl.className = 'wiz-field-label'; lbl.textContent = 'Select your dining tier';
  c.appendChild(lbl);
  var grid = document.createElement('div'); grid.className = 'wiz-tier-grid';
  tiers.forEach(function(t) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wiz-tier-btn' + (wizState.tier === t ? ' wiz-selected' : '');
    btn.textContent = t;
    btn.addEventListener('click', function() {
      wizState.tier = t;
      document.querySelectorAll('#wizardContent .wiz-tier-btn').forEach(function(b) { b.classList.remove('wiz-selected'); });
      btn.classList.add('wiz-selected');
    });
    grid.appendChild(btn);
  });
  c.appendChild(grid);
  wizAppendBtnRow(c,
    function() { wizState.step = 2; wizState.tier = null; wizRender(); },
    function() { if (!wizState.tier) return; wizState.step = 4; wizRender(); }
  );
}

function wizRenderDescription(c, contextLabel) {
  c.innerHTML = '';
  var heading = document.createElement('div');
  heading.innerHTML = '<p class="wiz-step-title">Describe your issue</p><p class="wiz-step-sub">Be specific — our AI will classify and route it automatically.</p>';
  c.appendChild(heading);

  var chip = document.createElement('div');
  chip.className = 'wiz-context-chip';
  chip.textContent = '📍 ' + contextLabel;
  c.appendChild(chip);

  var wrap = document.createElement('div'); wrap.className = 'textarea-wrap';
  var ta = document.createElement('textarea');
  ta.id = 'wizDescTA';
  ta.placeholder = 'e.g. The tap has been leaking since yesterday and water is flooding the floor...';
  ta.maxLength = 500;
  ta.rows = 6;
  ta.value = wizState.description || '';
  ta.style.cssText = 'width:100%;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:var(--font-body);font-size:14px;padding:14px;resize:vertical;outline:none;transition:border-color 0.2s;line-height:1.7';
  ta.addEventListener('input', function() {
    this.value = this.value.slice(0, 500);
    document.getElementById('wizCharCount').textContent = this.value.length;
    this.style.borderColor = '';
    this.style.boxShadow = '';
  });
  ta.addEventListener('focus', function() {
    this.style.borderColor = 'var(--blue)';
    this.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)';
  });
  ta.addEventListener('blur', function() { this.style.boxShadow = ''; });
  wrap.appendChild(ta);
  c.appendChild(wrap);

  var charDiv = document.createElement('div');
  charDiv.className = 'char-count';
  charDiv.innerHTML = '<span id="wizCharCount">' + (wizState.description || '').length + '</span> / 500';
  c.appendChild(charDiv);

  var row = document.createElement('div'); row.className = 'wiz-btn-row';

  var backBtn = document.createElement('button');
  backBtn.type = 'button'; backBtn.className = 'wiz-btn-back'; backBtn.textContent = '← Back';
  backBtn.addEventListener('click', function() {
    wizState.description = document.getElementById('wizDescTA').value;
    wizState.step = Math.max(0, wizState.step - 1);
    wizRender();
  });
  row.appendChild(backBtn);

  var subBtn = document.createElement('button');
  subBtn.type = 'button'; subBtn.className = 'wiz-btn-submit'; subBtn.id = 'wizSubmitBtn';
  subBtn.innerHTML = '<span id="wizSubmitText">Submit Complaint →</span><span class="wiz-btn-loader" id="wizSubmitLoader"></span>';
  subBtn.addEventListener('click', function() {
    var desc = document.getElementById('wizDescTA').value.trim();
    if (desc.length < 10) {
      document.getElementById('wizDescTA').style.borderColor = 'var(--red)';
      document.getElementById('wizDescTA').style.boxShadow = '0 0 0 3px rgba(239,68,68,0.1)';
      showToast('Please describe your issue in more detail', 'error');
      return;
    }
    wizState.description = desc;

    var fullDesc = contextLabel + ' — ' + desc;
    var payload = { email: currentEmail, description: fullDesc };
    if (wizState.location === 'room' && wizState.room) payload.room_number = wizState.room;

    subBtn.disabled = true;
    document.getElementById('wizSubmitText').style.opacity = '0.5';
    document.getElementById('wizSubmitLoader').style.display = 'inline-block';

    fetch(API + '/submit-complaint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(res) { return res.json().then(function(d) { return { ok: res.ok, data: d }; }); })
    .then(function(r) {
      if (!r.ok) throw new Error(r.data.detail || 'Submission failed');
      showToast('Complaint submitted!', 'success');
      showLastResult(r.data);
      loadComplaints();
      wizState = { step: 0, location: null, hostel: null, block: null, floor: null, cluster: null, washroom: null, caterer: null, tier: null, room: '', description: '' };
      wizRender();
    })
    .catch(function(e) {
      showToast(e.message, 'error');
      subBtn.disabled = false;
      document.getElementById('wizSubmitText').style.opacity = '1';
      document.getElementById('wizSubmitLoader').style.display = 'none';
    });
  });
  row.appendChild(subBtn);
  c.appendChild(row);
  setTimeout(function() { var t = document.getElementById('wizDescTA'); if (t) t.focus(); }, 0);
}

function wizAppendBtnRow(c, backFn, nextFn) {
  var row = document.createElement('div'); row.className = 'wiz-btn-row';
  if (wizState.step > 0) {
    var bb = document.createElement('button');
    bb.type = 'button'; bb.className = 'wiz-btn-back'; bb.textContent = '← Back';
    bb.addEventListener('click', backFn);
    row.appendChild(bb);
  }
  var nb = document.createElement('button');
  nb.type = 'button'; nb.className = 'wiz-btn-next'; nb.textContent = 'Continue →';
  nb.addEventListener('click', nextFn);
  row.appendChild(nb);
  c.appendChild(row);
}

function showLastResult(data) {
  var body = document.getElementById('lastResultBody');
  body.innerHTML =
    '<div class="result-row"><span class="result-key">category</span><span class="result-val">' + (data.category || '—') + '</span></div>' +
    '<div class="result-row"><span class="result-key">urgency</span><span class="result-val"><span class="badge ' + getBadgeClass(data.urgency) + '">' + (data.urgency || '—') + '</span></span></div>' +
    '<div class="result-row"><span class="result-key">status</span><span class="result-val" style="color:var(--green)">submitted ✓</span></div>';

  var card = document.getElementById('lastResultCard');
  card.style.display = 'block';
  card.style.opacity = '1';
  card.style.transition = '';
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Fade out after 6 seconds
  setTimeout(function () {
    card.style.transition = 'opacity 1.2s ease';
    card.style.opacity = '0';
    setTimeout(function () {
      card.style.display = 'none';
      card.style.transition = '';
    }, 1200);
  }, 6000);
}

/* Initialise wizard on page load */
wizRender();

/* REFRESH */
document.getElementById('refreshBtn').addEventListener('click', function () {
  var active = document.querySelector('.nav-item.active');
  if (active) {
    var tab = active.dataset.tab;
    if (tab === 'complaints')     loadComplaints();
    if (tab === 'analytics')      loadAnalytics();
    if (tab === 'resolved')       loadResolvedComplaints();
    if (tab === 'all-complaints') loadAllComplaintsForStaff();
  }
  showToast('Refreshed', 'info');
});

/* FILTER BUTTONS */
document.querySelectorAll('.filter-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    renderComplaints(btn.dataset.filter);
  });
});

/* LOAD COMPLAINTS */
function loadComplaints() {
  var url = API + '/complaints';
  if (currentRole === 'student' && currentEmail) {
    url += '?email=' + encodeURIComponent(currentEmail);
  }
  fetch(url)
  .then(function (res) { return res.json(); })
  .then(function (data) {
    allComplaints = data;
    renderComplaints('all');
    var badge = document.getElementById('complaintBadge');
    var pendingCount = data.filter(function(c) { return (c.status || '').toLowerCase() !== 'completed'; }).length;
    badge.textContent = pendingCount;
    badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  })
  .catch(function () { showToast('Could not load complaints', 'error'); });
}

function renderComplaints(filter) {
  var grid = document.getElementById('complaintGrid');
  var empty = document.getElementById('emptyState');
  var filtered = allComplaints;

  if (filter !== 'all') {
    filtered = allComplaints.filter(function (c) {
      var u = (c.urgency || '').toLowerCase();
      var s = (c.status || '').toLowerCase();
      if (filter === 'pending')   return s === 'pending';
      if (filter === 'completed') return s === 'completed';
      return u === filter;
    });
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = filtered.map(function (c, i) {
    var isCompleted = (c.status || '').toLowerCase() === 'completed';
    if (isCompleted) {
      return renderStudentCompletedFlipCard(c, i);
    }
    return (
      '<div class="complaint-card" style="animation-delay:' + (i * 40) + 'ms">' +
        '<div class="card-meta">' +
          '<span class="badge ' + getBadgeClass(c.urgency) + '">' + (c.urgency || 'unknown') + '</span>' +
          '<span class="badge badge-pending">' + (c.status || 'pending') + '</span>' +
        '</div>' +
        '<div class="card-description">' + escapeHtml(c.description || '') + '</div>' +
        '<div class="card-footer">' +
          '<span class="card-dept">' + (c.department || 'unassigned') + '</span>' +
          '<span class="card-date">' + formatDate(c.created_at) + '</span>' +
        '</div>' +
        (c.blockchain_hash ? '<div class="hash-chip" title="' + c.blockchain_hash + '">&#9935; ' + c.blockchain_hash.slice(0, 20) + '…</div>' : '') +
      '</div>'
    );
  }).join('');
}

function renderStudentCompletedFlipCard(c, i) {
  var alreadyReviewed = c.review_stars != null;
  var starsHtml = '';
  for (var s = 1; s <= 5; s++) {
    starsHtml += '<button type="button" class="star-btn" data-star="' + s + '" onclick="studentStarClick(event,' + c.id + ',' + s + ')">' +
      (alreadyReviewed && s <= c.review_stars ? '★' : '☆') +
    '</button>';
  }

  var backContent = '';
  if (alreadyReviewed) {
    backContent =
      '<div class="star-rating-label">Your Rating</div>' +
      '<div class="star-rating-row">' + starsHtml + '</div>' +
      '<div class="star-already-chip">✓ Feedback submitted</div>';
  } else {
    backContent =
      '<div class="star-rating-label">Rate this resolution</div>' +
      '<div class="star-rating-row" id="stars-' + c.id + '">' + starsHtml + '</div>' +
      '<button class="star-submit-btn" id="star-submit-' + c.id + '" disabled onclick="submitStudentReview(' + c.id + ')">Submit Rating</button>';
  }

  return (
    '<div class="student-flip-card" id="sfc-' + c.id + '" data-id="' + c.id + '" style="animation-delay:' + (i * 40) + 'ms" onclick="handleStudentFlipClick(event, this)">' +
      '<div class="student-flip-card-inner">' +
        '<div class="student-flip-front">' +
          '<div class="card-meta">' +
            '<span class="badge ' + getBadgeClass(c.urgency) + '">' + (c.urgency || 'unknown') + '</span>' +
            '<span class="badge badge-completed">completed</span>' +
          '</div>' +
          '<div class="card-description">' + escapeHtml(c.description || '') + '</div>' +
          '<div class="card-footer">' +
            '<span class="card-dept">' + (c.department || 'unassigned') + '</span>' +
            '<span class="card-date">' + formatDate(c.created_at) + '</span>' +
          '</div>' +
          '<div class="s-flip-hint">' + (alreadyReviewed ? '★'.repeat(c.review_stars) + '☆'.repeat(5 - c.review_stars) : 'CLICK TO RATE') + '</div>' +
        '</div>' +
        '<div class="student-flip-back">' + backContent + '</div>' +
      '</div>' +
    '</div>'
  );
}

function handleStudentFlipClick(e, cardEl) {
  if (e.target.closest('button')) return;
  cardEl.classList.toggle('s-flipped');
}

var _pendingReviewId  = null;
var _pendingReviewStars = null;

function studentStarClick(e, complaintId, star) {
  e.stopPropagation();
  var row = document.getElementById('stars-' + complaintId);
  if (!row) return;
  row.querySelectorAll('.star-btn').forEach(function (btn, idx) {
    btn.classList.toggle('star-lit', idx < star);
    btn.textContent = idx < star ? '★' : '☆';
  });
  var submitBtn = document.getElementById('star-submit-' + complaintId);
  if (submitBtn) submitBtn.disabled = false;
  submitBtn.setAttribute('data-selected', star);
}

function submitStudentReview(complaintId) {
  var submitBtn = document.getElementById('star-submit-' + complaintId);
  var stars = parseInt(submitBtn.getAttribute('data-selected') || '0');
  if (!stars) return;
  if (stars <= 3) {
    _pendingReviewId    = complaintId;
    _pendingReviewStars = stars;
    document.getElementById('reviewReasonInput').value = '';
    document.getElementById('reviewReasonModal').style.display = 'flex';
  } else {
    doSubmitReview(complaintId, stars, null);
  }
}

function doSubmitReview(complaintId, stars, text) {
  fetch(API + '/complaints/' + complaintId + '/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stars: stars, text: text || null })
  })
  .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
  .then(function (r) {
    if (!r.ok) throw new Error(r.data.detail || 'Could not submit review');
    showToast('Thanks for your feedback!', 'success');
    loadComplaints();
  })
  .catch(function (e) { showToast(e.message, 'error'); });
}

/* ANALYTICS */
function loadAnalytics() {
  if (currentRole === 'staff') {
    loadStaffAnalytics();
  } else {
    loadStudentAnalytics();
  }
}

function loadStudentAnalytics() {
  fetch(API + '/analytics/student?email=' + encodeURIComponent(currentEmail))
  .then(function (res) { return res.json(); })
  .then(function (data) { renderStudentAnalytics(data); })
  .catch(function () { showToast('Could not load analytics', 'error'); });
}

function loadStaffAnalytics() {
  var url = API + '/analytics/staff';
  if (currentStaffData && currentStaffData.staff_id) {
    url += '?staff_id=' + encodeURIComponent(currentStaffData.staff_id);
  }
  fetch(url)
  .then(function (res) { return res.json(); })
  .then(function (data) { renderStaffAnalytics(data); })
  .catch(function () { showToast('Could not load analytics', 'error'); });
}

function renderStudentAnalytics(data) {
  var total    = data.total    || 0;
  var resolved = data.resolved || 0;
  var pending  = data.pending  || 0;
  var rate     = total > 0 ? Math.round((resolved / total) * 100) : 0;

  document.getElementById('statsRow').innerHTML =
    '<div class="stat-card"><div class="stat-label">Total Lodged</div><div class="stat-value">'                                   + total    + '</div><div class="stat-sub">all time</div></div>' +
    '<div class="stat-card"><div class="stat-label">Resolved</div><div class="stat-value" style="color:var(--green)">'            + resolved + '</div><div class="stat-sub">completed</div></div>' +
    '<div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value" style="color:var(--orange)">'            + pending  + '</div><div class="stat-sub">in progress</div></div>' +
    '<div class="stat-card"><div class="stat-label">Resolution Rate</div><div class="stat-value">'                                + rate     + '%</div><div class="stat-sub">of your complaints</div></div>';

  var legendCfg = { labels: { color: '#94a3b8', font: { family: "'DM Mono',monospace", size: 11 }, boxWidth: 10, padding: 16 } };
  var catData = data.category_distribution || {};

  var catCtx = document.getElementById('categoryChart').getContext('2d');
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(catCtx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(catData),
      datasets: [{ data: Object.values(catData), backgroundColor: ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899'], borderColor: '#0c1424', borderWidth: 2, hoverOffset: 6 }]
    },
    options: { cutout: '68%', responsive: true, maintainAspectRatio: false, plugins: { legend: legendCfg } }
  });

  var urgCtx = document.getElementById('urgencyChart').getContext('2d');
  if (urgencyChart) urgencyChart.destroy();
  urgencyChart = new Chart(urgCtx, {
    type: 'doughnut',
    data: {
      labels: ['Resolved', 'Pending'],
      datasets: [{ data: [resolved, pending], backgroundColor: ['rgba(34,197,94,0.25)', 'rgba(249,115,22,0.25)'], borderColor: ['#22c55e', '#f97316'], borderWidth: 2, hoverOffset: 6 }]
    },
    options: { cutout: '68%', responsive: true, maintainAspectRatio: false, plugins: { legend: legendCfg } }
  });

  document.querySelectorAll('.chart-card-title')[0].textContent = 'By Category';
  document.querySelectorAll('.chart-card-title')[1].textContent = 'By Status';
  document.getElementById('spikeBanner').style.display = 'none';
}

function renderStaffAnalytics(data) {
  document.getElementById('statsRow').innerHTML =
    '<div class="stat-card"><div class="stat-label">Total Resolved</div><div class="stat-value" style="color:var(--green)">'      + (data.total_resolved        || 0) + '</div><div class="stat-sub">all time</div></div>' +
    '<div class="stat-card"><div class="stat-label">Resolved This Week</div><div class="stat-value">'                             + (data.resolved_this_week    || 0) + '</div><div class="stat-sub">last 7 days</div></div>' +
    '<div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value" style="color:var(--orange)">'            + (data.total_pending         || 0) + '</div><div class="stat-sub">awaiting action</div></div>' +
    '<div class="stat-card"><div class="stat-label">High Priority</div><div class="stat-value" style="color:var(--red)">'         + (data.high_priority_pending || 0) + '</div><div class="stat-sub">urgent pending</div></div>';

  var legendCfg = { labels: { color: '#94a3b8', font: { family: "'DM Mono',monospace", size: 11 }, boxWidth: 10, padding: 16 } };
  var deptData = data.department_distribution || {};
  var urgData  = data.urgency_pending_distribution || {};

  var catCtx = document.getElementById('categoryChart').getContext('2d');
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(catCtx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(deptData),
      datasets: [{ data: Object.values(deptData), backgroundColor: ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899'], borderColor: '#0c1424', borderWidth: 2, hoverOffset: 6 }]
    },
    options: { cutout: '68%', responsive: true, maintainAspectRatio: false, plugins: { legend: legendCfg } }
  });

  var urgColors = { 'High': '#ef4444', 'Critical': '#dc2626', 'Medium': '#f97316', 'Low': '#22c55e' };
  var urgLabels = Object.keys(urgData);
  var urgBg = urgLabels.map(function (k) { return urgColors[k] || '#60a5fa'; });

  var urgCtx = document.getElementById('urgencyChart').getContext('2d');
  if (urgencyChart) urgencyChart.destroy();
  urgencyChart = new Chart(urgCtx, {
    type: 'bar',
    data: {
      labels: urgLabels,
      datasets: [{ data: Object.values(urgData), backgroundColor: urgBg.map(function (c) { return c + '33'; }), borderColor: urgBg, borderWidth: 1.5, borderRadius: 6, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(96,165,250,0.06)' }, ticks: { color: '#94a3b8', font: { family: "'DM Mono',monospace", size: 11 } } },
        y: { grid: { color: 'rgba(96,165,250,0.06)' }, ticks: { color: '#94a3b8', font: { family: "'DM Mono',monospace", size: 11 }, stepSize: 1 }, beginAtZero: true }
      }
    }
  });

  document.querySelectorAll('.chart-card-title')[0].textContent = 'Pending by Department';
  document.querySelectorAll('.chart-card-title')[1].textContent = 'Pending by Urgency';
  document.getElementById('spikeBanner').style.display = 'none';
}

/* RESOLVED COMPLAINTS (staff) */
var allResolved = [];

function loadResolvedComplaints() {
  var url = API + '/complaints/resolved';
  if (currentStaffData && currentStaffData.staff_id) {
    url += '?staff_id=' + encodeURIComponent(currentStaffData.staff_id);
  }
  fetch(url)
  .then(function (res) { return res.json(); })
  .then(function (data) {
    allResolved = data;
    renderResolvedComplaints('all');
    var badge = document.getElementById('resolvedBadge');
    if (badge) {
      badge.textContent = data.length;
      badge.style.display = data.length > 0 ? 'inline-block' : 'none';
    }
  })
  .catch(function () { showToast('Could not load resolved complaints', 'error'); });
}

function renderResolvedComplaints(filter) {
  var grid  = document.getElementById('resolvedGrid');
  var empty = document.getElementById('resolvedEmptyState');
  var header = document.getElementById('resolvedStatsHeader');
  var filtered = allResolved;

  if (filter !== 'all') {
    filtered = allResolved.filter(function (c) {
      return (c.urgency || '').toLowerCase() === filter;
    });
  }

  if (header) {
    var highCount = allResolved.filter(function(c) {
      var u = (c.urgency||'').toLowerCase();
      return u === 'high' || u === 'critical';
    }).length;
    var medCount = allResolved.filter(function(c) {
      return (c.urgency||'').toLowerCase() === 'medium';
    }).length;
    header.innerHTML =
      '<div class="resolved-header-stat"><div class="resolved-header-val">' + allResolved.length + '</div><div class="resolved-header-label">Total Resolved</div></div>' +
      '<div class="resolved-header-stat"><div class="resolved-header-val" style="color:var(--red)">' + highCount + '</div><div class="resolved-header-label">High Priority</div></div>' +
      '<div class="resolved-header-stat"><div class="resolved-header-val" style="color:var(--orange)">' + medCount + '</div><div class="resolved-header-label">Medium</div></div>';
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = filtered.map(function (c, i) {
    var room = c.room_number ? escapeHtml(c.room_number) : null;
    return (
      '<div class="resolved-card" style="animation-delay:' + (i * 40) + 'ms">' +
        '<div class="resolved-card-top">' +
          (room ? '<span class="resolved-card-room">' + room + '</span>' : '') +
          '<span class="badge ' + getBadgeClass(c.urgency) + '">' + (c.urgency || 'unknown') + '</span>' +
          '<span class="card-dept">' + escapeHtml(c.department || 'unassigned') + '</span>' +
        '</div>' +
        '<div class="resolved-card-desc">' + escapeHtml(c.description || '') + '</div>' +
        '<div class="resolved-card-footer">' +
          '<div class="resolved-done-chip">' +
            '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            ' Resolved' +
          '</div>' +
          '<span class="resolved-card-date">' + formatDate(c.created_at) + '</span>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

/* ALL COMPLAINTS — FLIP CARDS */
var allStaffComplaints = [];
var currentFcFilter   = 'all';

function loadAllComplaintsForStaff() {
  fetch(API + '/complaints')
  .then(function (res) { return res.json(); })
  .then(function (data) {
    allStaffComplaints = data;
    renderFlipComplaints(currentFcFilter);
    var badge = document.getElementById('allComplaintsBadge');
    if (badge) {
      badge.textContent = allStaffComplaints.length;
      badge.style.display = allStaffComplaints.length > 0 ? 'inline-block' : 'none';
    }
  })
  .catch(function () { showToast('Could not load complaints', 'error'); });
}

function renderFlipComplaints(filter) {
  currentFcFilter = filter;
  var grid  = document.getElementById('allComplaintsGrid');
  var empty = document.getElementById('allComplaintsEmpty');
  var count = document.getElementById('allComplaintsCount');
  var staffZone = (currentStaffData && currentStaffData.hostel_zone) ? currentStaffData.hostel_zone : 'MH';

  if (filter === 'completed') {
    var completedList = allStaffComplaints.filter(function (c) { return c.status === 'completed'; });
    if (count) count.textContent = completedList.length + ' completed complaint' + (completedList.length !== 1 ? 's' : '');
    if (completedList.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'flex';
      empty.querySelector('p').textContent = 'No completed complaints yet';
      return;
    }
    empty.style.display = 'none';
    grid.innerHTML = completedList.map(function (c, i) {
      var room = c.room_number ? escapeHtml(c.room_number) : null;
      return (
        '<div class="resolved-card" style="animation-delay:' + (i * 40) + 'ms">' +
          '<div class="resolved-card-top">' +
            (room ? '<span class="resolved-card-room">' + room + '</span>' : '') +
            '<span class="badge ' + getBadgeClass(c.urgency) + '">' + (c.urgency || 'unknown') + '</span>' +
            '<span class="card-dept">' + escapeHtml(c.department || 'unassigned') + '</span>' +
          '</div>' +
          '<div class="resolved-card-desc">' + escapeHtml(c.description || '') + '</div>' +
          '<div class="resolved-card-footer">' +
            '<div class="resolved-done-chip">' +
              '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              ' Completed' +
            '</div>' +
            '<span class="resolved-card-date">' + formatDate(c.created_at) + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join('');
    return;
  }

  var filtered = allStaffComplaints.filter(function (c) { return c.status !== 'completed'; });
  if (filter !== 'all') {
    filtered = filtered.filter(function (c) {
      var u = (c.urgency || '').toLowerCase();
      if (filter === 'high') return u === 'high' || u === 'critical';
      return u === filter;
    });
  }

  if (count) count.textContent = filtered.length + ' pending complaint' + (filtered.length !== 1 ? 's' : '');

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    empty.querySelector('p').textContent = 'No pending complaints';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = filtered.map(function (c, i) {
    var urgency   = (c.urgency || 'low').toLowerCase();
    var prioClass = (urgency === 'high' || urgency === 'critical') ? 'fc-high' : urgency === 'medium' ? 'fc-medium' : 'fc-low';
    var room      = c.room_number || '—';
    var dept      = escapeHtml(c.department || 'unassigned');
    var shortDesc = escapeHtml((c.description || '').slice(0, 110)) + ((c.description || '').length > 110 ? '…' : '');
    var fullDesc  = escapeHtml(c.description || '—');
    var id        = c.id;

    return (
      '<div class="flip-card" id="fc-' + id + '" data-id="' + id + '" style="animation-delay:' + (i * 40) + 'ms" onclick="handleFlipCardClick(event, this)">' +
        '<div class="flip-card-inner">' +
          '<div class="flip-card-front ' + prioClass + '">' +
            '<div class="fc-top">' +
              '<span class="badge ' + getBadgeClass(c.urgency) + '">' + (c.urgency || 'unknown') + '</span>' +
              '<span class="card-dept">' + dept + '</span>' +
            '</div>' +
            '<div class="fc-desc">' + shortDesc + '</div>' +
            '<div class="fc-footer">' +
              '<span class="fc-room">' + escapeHtml(room) + '</span>' +
              '<span class="fc-date">' + formatDate(c.created_at) + '</span>' +
            '</div>' +
            '<div class="fc-flip-hint">CLICK TO VIEW &amp; TAKE TASK</div>' +
          '</div>' +
          '<div class="flip-card-back">' +
            '<div class="fc-back-header">' +
              '<span class="fc-back-title">' + escapeHtml(room) + ' · ' + dept + '</span>' +
              '<button class="fc-close-btn" data-id="' + id + '" onclick="closeFlipCard(event, this)">✕ close</button>' +
            '</div>' +
            '<div class="fc-back-desc">' + fullDesc + '</div>' +
            '<button class="fc-take-btn" data-room="' + escapeHtml(room) + '" data-zone="' + staffZone + '" onclick="takeTask(event, this)">' +
              '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              ' Take This Task' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

function handleFlipCardClick(e, cardEl) {
  if (e.target.closest('button')) return;
  cardEl.classList.toggle('flipped');
}

function closeFlipCard(e, btn) {
  e.stopPropagation();
  var id   = btn.getAttribute('data-id');
  var card = document.getElementById('fc-' + id);
  if (card) card.classList.remove('flipped');
}

function takeTask(e, btn) {
  e.stopPropagation();
  var room = btn.getAttribute('data-room');
  var zone = btn.getAttribute('data-zone');
  var routeBtn = document.querySelector('[data-tab="routing"]');
  if (routeBtn) routeBtn.click();
  setTimeout(function () {
    var roomInput  = document.getElementById('routeRoom');
    var zoneSelect = document.getElementById('routeStaffType');
    if (roomInput && room && room !== '—') {
      roomInput.value = room;
      roomInput.dispatchEvent(new Event('input'));
    }
    if (zoneSelect && zone) zoneSelect.value = zone;
  }, 120);
  showToast(room !== '—' ? 'Room ' + room + ' pre-filled in Route Planner' : 'Switched to Route Planner', 'info');
}

/* Wire up flip-card filter buttons */
document.querySelectorAll('[data-filter-fc]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('[data-filter-fc]').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    renderFlipComplaints(btn.dataset.filterFc);
  });
});

/* Wire up resolved filter buttons */
document.querySelectorAll('[data-filter-resolved]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('[data-filter-resolved]').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    renderResolvedComplaints(btn.dataset.filterResolved);
  });
});

/* ═══════════════════════════════════════════
   DASHBOARD TAB
═══════════════════════════════════════════ */
function loadDashboard() {
  if (!currentStaffData) return;
  var d = currentStaffData;
  document.getElementById('dashStaffName').textContent = d.name || '—';
  document.getElementById('dashStaffId').textContent   = d.staff_id || '—';
  document.getElementById('dashZone').textContent      = d.hostel_zone === 'MH' ? "Men's Hostel" : d.hostel_zone === 'WH' ? "Women's Hostel" : (d.hostel_zone || '—');
  document.getElementById('dashBlock').textContent     = d.block ? 'Block ' + d.block : '—';
  document.getElementById('dashAvatar').textContent    = (d.name || '?').charAt(0).toUpperCase();

  // Fetch avg rating
  var url = API + '/analytics/staff';
  if (d.staff_id) url += '?staff_id=' + encodeURIComponent(d.staff_id);
  fetch(url)
  .then(function (res) { return res.json(); })
  .then(function (data) {
    var ratingCard = document.getElementById('dashRatingCard');
    var avgRating  = data.avg_rating;
    var totalRev   = data.total_reviews || 0;
    if (avgRating == null || totalRev === 0) {
      ratingCard.style.display = 'none';
      return;
    }
    ratingCard.style.display = '';
    document.getElementById('dashRatingCount').textContent =
      totalRev + ' review' + (totalRev !== 1 ? 's' : '');

    // Render star icons
    var starsEl = document.getElementById('dashRatingStars');
    starsEl.innerHTML = '';
    for (var i = 1; i <= 5; i++) {
      var sp = document.createElement('span');
      sp.className = 'dash-star';
      sp.textContent = i <= Math.round(avgRating) ? '★' : '☆';
      starsEl.appendChild(sp);
    }

    // Animate number count-up
    var valEl = document.getElementById('dashRatingVal');
    valEl.textContent = '0.0';
    var start = 0;
    var end   = avgRating;
    var duration = 900;
    var startTime = null;
    function animateRating(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      valEl.textContent = (start + (end - start) * eased).toFixed(1);
      if (progress < 1) requestAnimationFrame(animateRating);
      else valEl.textContent = end.toFixed(1);
    }
    requestAnimationFrame(animateRating);

    // Animate stars lighting up
    var starEls = starsEl.querySelectorAll('.dash-star');
    starEls.forEach(function (el, idx) {
      if (idx < Math.round(avgRating)) {
        el.style.color = 'var(--border)';
        setTimeout(function () { el.style.color = '#f59e0b'; }, 150 * idx);
      }
    });
  })
  .catch(function () {});
}

/* ═══════════════════════════════════════════
   SETTINGS TAB
═══════════════════════════════════════════ */
function loadSettings() {
  if (!currentStaffData) return;
  var d = currentStaffData;
  document.getElementById('settingsNameInput').value = d.name || '';
  var zoneEl = document.getElementById('settingsZoneSelect');
  zoneEl.value = d.hostel_zone || 'MH';
  updateBlockOptions('settingsBlockSelect', zoneEl.value);
  var blockEl = document.getElementById('settingsBlockSelect');
  if (d.block) blockEl.value = d.block;
}

document.getElementById('saveNameBtn').addEventListener('click', function () {
  var name = document.getElementById('settingsNameInput').value.trim();
  if (!name) { showToast('Enter a name', 'error'); return; }
  staffSettingsSave({ name: name });
});

document.getElementById('savePasswordBtn').addEventListener('click', function () {
  var pw = document.getElementById('settingsPasswordInput').value;
  if (!pw || pw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
  staffSettingsSave({ password: pw });
});

document.getElementById('saveAssignmentBtn').addEventListener('click', function () {
  var zone  = document.getElementById('settingsZoneSelect').value;
  var block = document.getElementById('settingsBlockSelect').value;
  staffSettingsSave({ hostel_zone: zone, block: block });
});

function staffSettingsSave(fields) {
  if (!currentStaffData) return;
  var payload = Object.assign({ staff_id: currentStaffData.staff_id }, fields);
  fetch(API + '/staff/update', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(function(res) { return res.json().then(function(d) { return { ok: res.ok, data: d }; }); })
  .then(function(r) {
    if (!r.ok) throw new Error(r.data.detail || 'Update failed');
    currentStaffData = Object.assign(currentStaffData, r.data);
    sessionStorage.setItem('hostel_staff', JSON.stringify(currentStaffData));
    document.getElementById('userEmailDisplay').textContent = currentStaffData.staff_id;
    document.getElementById('userAvatar').textContent = currentStaffData.name.charAt(0).toUpperCase();
    document.querySelector('.user-role').textContent = (currentStaffData.hostel_zone || '') + (currentStaffData.block ? ' · Block ' + currentStaffData.block : '') + ' Staff';
    if (fields.password) document.getElementById('settingsPasswordInput').value = '';
    showToast('Saved successfully', 'success');
  })
  .catch(function(e) { showToast(e.message, 'error'); });
}

document.getElementById('deleteAccountBtn').addEventListener('click', function () {
  document.getElementById('deleteModal').style.display = 'flex';
});

document.getElementById('modalCancelBtn').addEventListener('click', function () {
  document.getElementById('deleteModal').style.display = 'none';
});

document.getElementById('modalConfirmBtn').addEventListener('click', function () {
  if (!currentStaffData) return;
  fetch(API + '/staff/delete?staff_id=' + encodeURIComponent(currentStaffData.staff_id), {
    method: 'DELETE'
  })
  .then(function(res) { return res.json().then(function(d) { return { ok: res.ok, data: d }; }); })
  .then(function(r) {
    if (!r.ok) throw new Error(r.data.detail || 'Delete failed');
    document.getElementById('deleteModal').style.display = 'none';
    document.getElementById('logoutBtn').click();
    showToast('Account deleted', 'info');
  })
  .catch(function(e) { showToast(e.message, 'error'); });
});

/* REVIEW REASON MODAL */
document.getElementById('reviewReasonSkipBtn').addEventListener('click', function () {
  document.getElementById('reviewReasonModal').style.display = 'none';
  if (_pendingReviewId && _pendingReviewStars) {
    doSubmitReview(_pendingReviewId, _pendingReviewStars, null);
    _pendingReviewId = null; _pendingReviewStars = null;
  }
});

document.getElementById('reviewReasonSubmitBtn').addEventListener('click', function () {
  var text = document.getElementById('reviewReasonInput').value.trim();
  document.getElementById('reviewReasonModal').style.display = 'none';
  if (_pendingReviewId && _pendingReviewStars) {
    var activeTab = document.querySelector('.nav-item.active');
    if (activeTab && activeTab.dataset.tab === 'resolved-student') {
      rsDoSubmitReview(_pendingReviewId, _pendingReviewStars, text || null);
    } else {
      doSubmitReview(_pendingReviewId, _pendingReviewStars, text || null);
    }
    _pendingReviewId = null; _pendingReviewStars = null;
  }
});

/* ═══════════════════════════════════════════
   ROUTE PLANNER TAB
═══════════════════════════════════════════ */

document.getElementById('routeRoom').addEventListener('input', function () {
  var raw = this.value.trim().toUpperCase();
  this.value = raw;
  var fb = document.getElementById('routeRoomFeedback');
  if (raw.length === 0) {
    this.className = 'routing-room-input';
    fb.style.display = 'none';
    return;
  }
  var m = raw.match(/^([A-Z])-?(\d{1,2})(\d{2})$/);
  if (m) {
    this.className = 'routing-room-input valid';
    fb.className = 'routing-room-feedback ok';
    fb.textContent = '✓ Block ' + m[1] + ', Floor ' + m[2] + ', Room ' + m[3];
    fb.style.display = 'block';
  } else {
    this.className = 'routing-room-input invalid';
    fb.className = 'routing-room-feedback err';
    fb.textContent = '✗ Use format: Q-415 or R-1513';
    fb.style.display = 'block';
  }
});

function initRoutingTab() {
  var saved = localStorage.getItem('route_staff_type');
  if (saved) document.getElementById('routeStaffType').value = saved;
}

document.getElementById('getRouteBtn').addEventListener('click', function () {
  var room      = document.getElementById('routeRoom').value.trim().toUpperCase();
  var staffType = document.getElementById('routeStaffType').value;
  if (!room) { showToast('Enter your current room', 'error'); return; }
  var m = room.match(/^([A-Z])-?(\d{1,2})(\d{2})$/);
  if (!m) { showToast('Invalid room format — use e.g. Q-415', 'error'); return; }
  var normalised = m[1] + '-' + m[2] + m[3];
  localStorage.setItem('route_staff_type', staffType);
  var btn = this;
  setLoading(btn, true);
  fetch(API + '/maintenance/next-task?current_room=' + encodeURIComponent(normalised) +
        '&staff_type=' + staffType + '&limit=5')
  .then(function (res) {
    return res.json().then(function (data) { return { ok: res.ok, data: data }; });
  })
  .then(function (r) {
    if (!r.ok) throw new Error(r.data.detail || 'Could not fetch route');
    renderRoute(r.data, normalised, staffType);
  })
  .catch(function (e) { showToast(e.message, 'error'); })
  .finally(function () { setLoading(btn, false); });
});

function renderRoute(data, currentRoom, staffType) {
  var resultsEl = document.getElementById('routingResults');
  var emptyEl   = document.getElementById('routingEmpty');

  if (data.status === 'no_tasks' || !data.full_route || data.full_route.length === 0) {
    resultsEl.style.display = 'none';
    emptyEl.style.display   = 'flex';
    emptyEl.querySelector('p').textContent = '✅ No pending tasks in ' + staffType + ' zone right now.';
    return;
  }

  emptyEl.style.display        = 'none';
  resultsEl.style.display      = 'flex';
  resultsEl.style.flexDirection = 'column';
  resultsEl.style.gap           = '16px';

  var tasks     = data.full_route;
  var totalDist = tasks.reduce(function (sum, t) { return sum + (t.estimated_distance || 0); }, 0);
  var highCount = tasks.filter(function (t) {
    var u = (t.urgency || '').toLowerCase();
    return u === 'high' || u === 'critical';
  }).length;

  document.getElementById('routeSummaryMeta').textContent =
    'From ' + currentRoom + ' · ' + staffType + ' zone';

  document.getElementById('routeSummaryStats').innerHTML =
    '<div class="route-stat"><div class="route-stat-val">' + tasks.length + '</div><div class="route-stat-label">Tasks</div></div>' +
    '<div class="route-stat"><div class="route-stat-val">' + Math.round(totalDist) + '</div><div class="route-stat-label">Total dist (m)</div></div>' +
    '<div class="route-stat"><div class="route-stat-val" style="color:var(--red)">' + highCount + '</div><div class="route-stat-label">High priority</div></div>' +
    '<div class="route-stat"><div class="route-stat-val">' + (data.next_task ? (data.next_task.parsed_room || '—') : '—') + '</div><div class="route-stat-label">First stop</div></div>';

  document.getElementById('routeTaskList').innerHTML = tasks.map(function (task, i) {
    var urgency   = (task.urgency || 'low').toLowerCase();
    var prioClass = (urgency === 'high' || urgency === 'critical') ? 'priority-high'
                  : urgency === 'medium' ? 'priority-medium' : 'priority-low';
    var dist = task.estimated_distance != null ? Math.round(task.estimated_distance) + ' m' : '—';
    var room = task.parsed_room || task.room_number || '—';
    var desc = escapeHtml((task.description || '').slice(0, 120));
    var note = escapeHtml(task.route_note || '');
    var dept = escapeHtml(task.department || 'unassigned');
    var id   = task.id;

    return (
      '<div class="route-task-card ' + prioClass + '" id="rtask-' + id + '" data-complaint-id="' + id + '" style="animation-delay:' + (i * 60) + 'ms">' +
        '<div class="route-step-num">' + (i + 1) + '</div>' +
        '<div class="route-task-body">' +
          '<div class="route-task-top">' +
            '<span class="route-task-room">' + room + '</span>' +
            '<span class="badge ' + getBadgeClass(task.urgency) + '">' + (task.urgency || 'unknown') + '</span>' +
            '<span class="card-dept">' + dept + '</span>' +
          '</div>' +
          '<div class="route-task-desc">' + desc + '</div>' +
          '<div class="route-task-note">' + note + '</div>' +
          '<button ' +
            'class="route-task-complete-btn" ' +
            'data-id="' + id + '" ' +
            'onclick="markTaskComplete(' + id + ', this)" ' +
            'type="button" ' +
            'title="Mark this task as completed">' +
            '<svg width="11" height="11" viewBox="0 0 11 11" fill="none">' +
              '<path d="M1.5 5.5l3 3 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>' +
            ' Mark Complete' +
          '</button>' +
        '</div>' +
        '<div class="route-task-dist">~' + dist + '</div>' +
      '</div>'
    );
  }).join('');
}

function markTaskComplete(complaintId, btn) {
  btn.disabled = true;
  btn.innerHTML = '<span class="complete-btn-spinner"></span> Saving…';

  var staffId = (currentStaffData && currentStaffData.staff_id) ? currentStaffData.staff_id : '';
  fetch(API + '/complaints/' + complaintId + '/complete?staff_id=' + encodeURIComponent(staffId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  })
  .then(function (res) {
    return res.json().then(function (data) { return { ok: res.ok, data: data }; });
  })
  .then(function (r) {
    if (!r.ok) throw new Error(r.data.detail || 'Could not mark complete');

    var card = document.getElementById('rtask-' + complaintId);
    if (!card) return;

    var chip = document.createElement('div');
    chip.className = 'complete-done-chip';
    chip.innerHTML =
      '<svg width="11" height="11" viewBox="0 0 11 11" fill="none">' +
        '<path d="M1.5 5.5l3 3 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg> Done ✓';
    btn.replaceWith(chip);

    card.classList.add('task-done');

    setTimeout(function () {
      card.classList.add('sliding-out');
      card.addEventListener('animationend', function () {
        card.remove();
        updateRouteSummaryAfterComplete();
      }, { once: true });
    }, 900);

    showToast('Task marked complete ✓', 'success');
  })
  .catch(function (e) {
    btn.disabled = false;
    btn.innerHTML =
      '<svg width="11" height="11" viewBox="0 0 11 11" fill="none">' +
        '<path d="M1.5 5.5l3 3 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg> Mark Complete';
    showToast(e.message || 'Failed to update task', 'error');
  });
}

function updateRouteSummaryAfterComplete() {
  var remaining = document.querySelectorAll('#routeTaskList .route-task-card');

  var taskValEl = document.querySelector('#routeSummaryStats .route-stat-val');
  if (taskValEl) taskValEl.textContent = remaining.length;

  if (remaining.length === 0) {
    setTimeout(function () {
      var resultsEl = document.getElementById('routingResults');
      var emptyEl   = document.getElementById('routingEmpty');
      if (resultsEl) resultsEl.style.display = 'none';
      if (emptyEl) {
        emptyEl.style.display = 'flex';
        var p = emptyEl.querySelector('p');
        if (p) p.textContent = '✅ All tasks in this zone are completed. Great work!';
      }
    }, 300);
  }
}

/* ═══════════════════════════════════════════
   STUDENT RESOLVED TAB
═══════════════════════════════════════════ */
var allResolvedStudent = [];

function loadResolvedStudent() {
  if (!currentEmail) return;
  fetch(API + '/complaints?email=' + encodeURIComponent(currentEmail))
  .then(function(res) { return res.json(); })
  .then(function(data) {
    allResolvedStudent = data.filter(function(c) {
      return (c.status || '').toLowerCase() === 'completed';
    });
    renderResolvedStudent('all');
    var badge = document.getElementById('resolvedStudentBadge');
    if (badge) {
      badge.textContent = allResolvedStudent.length;
      badge.style.display = allResolvedStudent.length > 0 ? 'inline-block' : 'none';
    }
  })
  .catch(function() { showToast('Could not load resolved complaints', 'error'); });
}

function renderResolvedStudent(filter) {
  var grid  = document.getElementById('resolvedStudentGrid');
  var empty = document.getElementById('resolvedStudentEmpty');
  if (!grid || !empty) return;

  var filtered = allResolvedStudent;
  if (filter !== 'all') {
    filtered = allResolvedStudent.filter(function(c) {
      var u = (c.urgency || '').toLowerCase();
      if (filter === 'high') return u === 'high' || u === 'critical';
      return u === filter;
    });
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    grid.style.display = 'none';
    empty.style.display = 'flex';
    empty.style.flexDirection = 'column';
    empty.style.alignItems = 'center';
    empty.style.gap = '12px';
    empty.style.padding = '80px 0';
    empty.style.color = 'var(--text3)';
    empty.style.fontSize = '14px';
    var msg = empty.querySelector('p');
    if (msg) {
      msg.textContent = allResolvedStudent.length === 0
        ? 'None of your complaints have been resolved yet'
        : 'No resolved complaints match this filter';
    }
    return;
  }

  empty.style.display = 'none';
  grid.style.display = 'grid';
  grid.innerHTML = filtered.map(function(c, i) {
    var alreadyReviewed = c.review_stars != null;
    var starsHtml = '';
    for (var s = 1; s <= 5; s++) {
      starsHtml += '<button type="button" class="star-btn' +
        (alreadyReviewed && s <= c.review_stars ? ' star-lit' : '') +
        '" onclick="rsStarClick(event,' + c.id + ',' + s + ')">' +
        (alreadyReviewed && s <= c.review_stars ? '★' : '☆') +
      '</button>';
    }

    var ratingSection = alreadyReviewed
      ? '<div class="rs-rating-done">' +
          '<div class="star-rating-label">Your Rating</div>' +
          '<div class="star-rating-row">' + starsHtml + '</div>' +
          '<div class="star-already-chip">✓ Feedback submitted</div>' +
        '</div>'
      : '<div class="rs-rating-prompt">' +
          '<div class="star-rating-label">Rate this resolution</div>' +
          '<div class="star-rating-row" id="rs-stars-' + c.id + '">' + starsHtml + '</div>' +
          '<button class="star-submit-btn" id="rs-submit-' + c.id + '" disabled ' +
            'onclick="rsSubmitReview(' + c.id + ')">Submit Rating</button>' +
        '</div>';

    return (
      '<div class="complaint-card rs-card" style="animation-delay:' + (i * 40) + 'ms;border-left:3px solid var(--green)">' +
        '<div class="card-meta">' +
          '<span class="badge ' + getBadgeClass(c.urgency) + '">' + (c.urgency || 'unknown') + '</span>' +
          '<span class="badge badge-completed">completed</span>' +
        '</div>' +
        '<div class="card-description">' + escapeHtml(c.description || '') + '</div>' +
        '<div class="card-footer">' +
          '<span class="card-dept">' + (c.department || 'unassigned') + '</span>' +
          '<span class="card-date">' + formatDate(c.created_at) + '</span>' +
        '</div>' +
        '<div class="rs-divider"></div>' +
        ratingSection +
      '</div>'
    );
  }).join('');
}

function rsStarClick(e, complaintId, star) {
  e.stopPropagation();
  var row = document.getElementById('rs-stars-' + complaintId);
  if (!row) return;
  row.querySelectorAll('.star-btn').forEach(function(btn, idx) {
    btn.classList.toggle('star-lit', idx < star);
    btn.textContent = idx < star ? '★' : '☆';
  });
  var submitBtn = document.getElementById('rs-submit-' + complaintId);
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.setAttribute('data-selected', star);
  }
}

function rsSubmitReview(complaintId) {
  var submitBtn = document.getElementById('rs-submit-' + complaintId);
  var stars = parseInt(submitBtn.getAttribute('data-selected') || '0');
  if (!stars) return;
  if (stars <= 3) {
    _pendingReviewId    = complaintId;
    _pendingReviewStars = stars;
    document.getElementById('reviewReasonInput').value = '';
    document.getElementById('reviewReasonModal').style.display = 'flex';
  } else {
    rsDoSubmitReview(complaintId, stars, null);
  }
}

function rsDoSubmitReview(complaintId, stars, text) {
  fetch(API + '/complaints/' + complaintId + '/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stars: stars, text: text || null })
  })
  .then(function(res) { return res.json().then(function(d) { return { ok: res.ok, data: d }; }); })
  .then(function(r) {
    if (!r.ok) throw new Error(r.data.detail || 'Could not submit review');
    showToast('Thanks for your feedback!', 'success');
    loadResolvedStudent();
  })
  .catch(function(e) { showToast(e.message, 'error'); });
}

/* Wire up resolved-student filter buttons */
document.querySelectorAll('[data-filter-rs]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('[data-filter-rs]').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    renderResolvedStudent(btn.dataset.filterRs);
  });
});