// App state configuration
let currentStep = 1;
let selectedSport = null;
let selectedRate = 0;
let selectedDate = '';
let selectedSlot = '';
let selectedFacility = '';
let currentBookingInProgress = null;

// Mock facilities data
const facilitiesData = {
  "Badminton": ["Court A (Premium Synthetics)", "Court B (Standard Synthetics)", "Court C (Practice Wood)"],
  "Basketball": ["Main Court Arena A", "Practice Court Arena B"],
  "Table Tennis": ["Table 1 (Championship Table)", "Table 2 (Standard)", "Table 3 (Standard)", "Table 4 (Practice)"],
  "Tennis": ["Hardcourt 1 (Outdoor Lights)", "Hardcourt 2 (Outdoor)"],
  "Squash": ["Glass-Back Court 1", "Glass-Back Court 2"]
};

// Available time slots configuration (2-hour blocks)
const timeSlots = [
  "08:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 02:00 PM",
  "02:00 PM - 04:00 PM",
  "04:00 PM - 06:00 PM",
  "06:00 PM - 08:00 PM",
  "08:00 PM - 10:00 PM"
];

// Initialize local storage database tables if empty
function initializeDB() {
  if (!localStorage.getItem('u_sports_hall_bookings')) {
    // Generate pre-populated dummy bookings to demonstrate overlap prevention and admin stats
    const todayStr = getOffsetDateString(0);
    const tomorrowStr = getOffsetDateString(1);

    const initialBookings = [
      {
        id: "BK-10001",
        name: "David Miller",
        email: "david.miller@example.com",
        phone: "+1 555-0143",
        sport: "Badminton",
        facility: "Court A (Premium Synthetics)",
        date: todayStr,
        slot: "10:00 AM - 12:00 PM",
        fee_paid: 30.00,
        status: "Approved",
        cancellation_charge: 0.00,
        refund_amount: 0.00,
        created_at: new Date(Date.now() - 3600000 * 24).toISOString() // 1 day ago
      },
      {
        id: "BK-10002",
        name: "Sarah Jenkins",
        email: "sarah.j@example.com",
        phone: "+1 555-0182",
        sport: "Basketball",
        facility: "Main Court Arena A",
        date: todayStr,
        slot: "04:00 PM - 06:00 PM",
        fee_paid: 50.00,
        status: "Pending",
        cancellation_charge: 0.00,
        refund_amount: 0.00,
        created_at: new Date(Date.now() - 3600000 * 4).toISOString() // 4 hours ago
      },
      {
        id: "BK-10003",
        name: "Michael Chen",
        email: "m.chen@example.com",
        phone: "+1 555-0199",
        sport: "Table Tennis",
        facility: "Table 1 (Championship Table)",
        date: tomorrowStr,
        slot: "02:00 PM - 04:00 PM",
        fee_paid: 20.00,
        status: "Approved",
        cancellation_charge: 0.00,
        refund_amount: 0.00,
        created_at: new Date(Date.now() - 3600000 * 12).toISOString() // 12 hours ago
      }
    ];
    localStorage.setItem('u_sports_hall_bookings', JSON.stringify(initialBookings));
  }

  if (!localStorage.getItem('sys_emails')) {
    const initialEmails = [
      {
        id: "EM-20001",
        subject: "Sports Zone Booking Received: #BK-10002",
        from: "sportszone.notifications@service-now.com",
        to: "sarah.j@example.com",
        event_fired: "sports.hall.confirmation",
        time: new Date(Date.now() - 3600000 * 4).toLocaleString(),
        body: generateConfirmationEmailHTML({
          id: "BK-10002",
          name: "Sarah Jenkins",
          sport: "Basketball",
          facility: "Main Court Arena A",
          date: getOffsetDateString(0),
          slot: "04:00 PM - 06:00 PM",
          fee_paid: 50.00,
          status: "Pending"
        }),
        read: false
      }
    ];
    localStorage.setItem('sys_emails', JSON.stringify(initialEmails));
  }
}

// Helper: Get formatted date string offset from today
function getOffsetDateString(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  const yyyy = date.getFullYear();
  let mm = date.getMonth() + 1;
  let dd = date.getDate();
  if (mm < 10) mm = '0' + mm;
  if (dd < 10) dd = '0' + dd;
  return `${yyyy}-${mm}-${dd}`;
}

// Retrieve records from Storage
function getBookings() {
  return JSON.parse(localStorage.getItem('u_sports_hall_bookings') || '[]');
}

function saveBookings(bookings) {
  localStorage.setItem('u_sports_hall_bookings', JSON.stringify(bookings));
}

function getEmails() {
  return JSON.parse(localStorage.getItem('sys_emails') || '[]');
}

function saveEmails(emails) {
  localStorage.setItem('sys_emails', JSON.stringify(emails));
}

// Toast Notifications System
function showToast(title, message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'warning') iconName = 'alert-triangle';
  if (type === 'danger') iconName = 'x-circle';

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">&times;</button>
  `;
  
  container.appendChild(toast);
  lucide.createIcons();

  // Close event listener
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  });

  // Auto remove toast
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  initializeDB();
  setupNavigation();
  setupSportSelection();
  setupFormControls();
  setupPaymentForm();
  renderAdminPanel();
  renderMailbox();
  lucide.createIcons();
  
  // Set default booking date limits
  const dateInput = document.getElementById('booking-date');
  dateInput.min = getOffsetDateString(0);
  dateInput.max = getOffsetDateString(14); // Limit bookings to 14 days in advance
});

// Sidebar View Navigation
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.content-view');
  const secTitle = document.getElementById('section-title');
  const secSubtitle = document.getElementById('section-subtitle');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');

      // Update button visual active state
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show matching section view
      views.forEach(view => {
        if (view.id === target) {
          view.classList.add('active');
        } else {
          view.classList.remove('active');
        }
      });

      // Update Section Header Titles based on active view
      if (target === 'booking-section') {
        secTitle.textContent = 'Facility Reservations';
        secSubtitle.textContent = 'Real-time booking and facility scheduling';
      } else if (target === 'admin-section') {
        secTitle.textContent = 'Sports Hall Management';
        secSubtitle.textContent = 'Review bookings, approve requests, and manage cancellations';
        renderAdminPanel();
      } else if (target === 'mailbox-section') {
        secTitle.textContent = 'Notification Client Simulator';
        secSubtitle.textContent = 'Verify emails sent by ServiceNow triggers and events';
        renderMailbox();
      }
    });
  });

  // Action button to view dashboard from success screen
  document.getElementById('go-to-admin-btn').addEventListener('click', () => {
    document.querySelector('[data-target="admin-section"]').click();
  });
}

// View Switching inside Booking Section
function setBookingStep(step) {
  currentStep = step;
  
  // Update step indicators
  const s1 = document.getElementById('step-1-indicator');
  const s2 = document.getElementById('step-2-indicator');
  const s3 = document.getElementById('step-3-indicator');

  s1.className = 'step';
  s2.className = 'step';
  s3.className = 'step';

  if (step >= 1) s1.classList.add('active');
  if (step >= 2) {
    s1.classList.add('completed');
    s2.classList.add('active');
  }
  if (step >= 3) {
    s2.classList.add('completed');
    s3.classList.add('active');
  }

  // Update visible pane
  const panes = document.querySelectorAll('.flow-pane');
  panes.forEach((pane, index) => {
    if (index === step - 1) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });
}

// Sport card click handling
function setupSportSelection() {
  const cards = document.querySelectorAll('.sport-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      selectedSport = card.getAttribute('data-sport');
      selectedRate = parseInt(card.getAttribute('data-rate'));

      // Render the sub-facilities (courts) drop down
      const facilitySelect = document.getElementById('facility-court');
      facilitySelect.innerHTML = '';
      facilitiesData[selectedSport].forEach(facility => {
        const option = document.createElement('option');
        option.value = facility;
        option.textContent = facility;
        facilitySelect.appendChild(option);
      });
      selectedFacility = facilitySelect.value;

      // Update rate calculation text
      document.getElementById('calc-rate').textContent = `$${selectedRate}.00 / hr`;
      
      // Navigate to Step 2
      setBookingStep(2);
      
      // Trigger slot reloading on current parameters
      selectedDate = document.getElementById('booking-date').value;
      if (selectedDate) {
        checkAndRenderSlots();
      }
      
      showToast('Sport Selected', `Fitted rates and courts for ${selectedSport}.`, 'info');
    });
  });
}

// Booking Details Page Actions & Validation
function setupFormControls() {
  const dateInput = document.getElementById('booking-date');
  const facilitySelect = document.getElementById('facility-court');
  
  // Date change handler
  dateInput.addEventListener('change', (e) => {
    selectedDate = e.target.value;
    checkAndRenderSlots();
  });

  // Facility change handler
  facilitySelect.addEventListener('change', (e) => {
    selectedFacility = e.target.value;
    checkAndRenderSlots();
  });

  // Back button back to sports
  document.getElementById('back-to-sports-btn').addEventListener('click', () => {
    setBookingStep(1);
    selectedSport = null;
    selectedRate = 0;
    selectedSlot = '';
    selectedFacility = '';
    document.getElementById('calc-total').textContent = '$0.00';
  });

  // Forward button to Payment
  document.getElementById('proceed-to-payment-btn').addEventListener('click', () => {
    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();
    
    // Validations
    if (!selectedSport) {
      showToast('Validation Error', 'Please select a sport first.', 'danger');
      setBookingStep(1);
      return;
    }
    if (!name || !email || !phone) {
      showToast('Validation Error', 'Please complete all contact detail fields.', 'danger');
      return;
    }
    if (!selectedDate) {
      showToast('Validation Error', 'Please select a booking date.', 'danger');
      return;
    }
    if (!selectedSlot) {
      showToast('Validation Error', 'Please choose an available time slot.', 'danger');
      return;
    }

    // Populate Payment summary data
    document.getElementById('summary-sport').textContent = selectedSport;
    document.getElementById('summary-facility').textContent = selectedFacility;
    document.getElementById('summary-date').textContent = selectedDate;
    document.getElementById('summary-slot').textContent = selectedSlot;
    document.getElementById('summary-name').textContent = name;
    document.getElementById('summary-email').textContent = email;
    
    const totalCost = selectedRate * 2; // Fixed 2 hours slots
    document.getElementById('summary-total').textContent = `$${totalCost.toFixed(2)}`;

    // Set temp progress record
    currentBookingInProgress = {
      name,
      email,
      phone,
      sport: selectedSport,
      facility: selectedFacility,
      date: selectedDate,
      slot: selectedSlot,
      fee_paid: totalCost
    };

    setBookingStep(3);
  });
}

// Reload Time Slots and check conflicts in LocalStorage
function checkAndRenderSlots() {
  if (!selectedSport || !selectedDate || !selectedFacility) return;

  const slotsGrid = document.getElementById('slots-grid');
  slotsGrid.innerHTML = '';

  const bookings = getBookings();
  
  // Find already booked slots for this facility/court on this specific date
  const bookedSlots = bookings
    .filter(b => b.date === selectedDate && b.facility === selectedFacility && b.status !== 'Rejected' && b.status !== 'Cancelled')
    .map(b => b.slot);

  timeSlots.forEach(slot => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot-btn';
    btn.textContent = slot;

    // Check conflict
    const isBooked = bookedSlots.includes(slot);
    if (isBooked) {
      btn.disabled = true;
      btn.title = "This court is already reserved for this slot";
    }

    // Retain selected slot visual
    if (selectedSlot === slot) {
      btn.classList.add('selected');
    }

    btn.addEventListener('click', () => {
      // Toggle selected
      document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedSlot = slot;

      // Update total price (Always 2 hours blocks)
      const total = selectedRate * 2;
      document.getElementById('calc-total').textContent = `$${total.toFixed(2)}`;
    });

    slotsGrid.appendChild(btn);
  });
}

// Payment Checkout Validation & Submission
function setupPaymentForm() {
  const form = document.getElementById('payment-form');
  
  // Format Card Number (space separation)
  const cardNum = document.getElementById('card-number');
  cardNum.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let matches = val.match(/\d{4,16}/g);
    let match = (matches && matches[0]) || '';
    let parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      e.target.value = parts.join(' ');
    } else {
      e.target.value = val;
    }
    
    // Sync Card Visual
    document.querySelector('.card-number-display').textContent = e.target.value || '•••• •••• •••• ••••';
  });

  // Sync Holder Visual
  document.getElementById('card-name').addEventListener('input', (e) => {
    document.querySelector('.card-holder-display').textContent = e.target.value.toUpperCase() || 'CARDHOLDER NAME';
  });

  // Sync Expiry Visual
  document.getElementById('card-expiry').addEventListener('input', (e) => {
    let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (val.length >= 2) {
      e.target.value = val.substring(0, 2) + '/' + val.substring(2, 4);
    } else {
      e.target.value = val;
    }
    document.querySelector('.card-expiry-display').textContent = e.target.value || 'MM/YY';
  });

  // Back button back to details
  document.getElementById('back-to-details-btn').addEventListener('click', () => {
    setBookingStep(2);
  });

  // Pay and Submit Booking Form
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!currentBookingInProgress) {
      showToast('System Error', 'No active booking payload found. Restarting flow.', 'danger');
      setBookingStep(1);
      return;
    }

    // Submit payment simulation (always successful)
    const bookings = getBookings();
    
    // Generate Booking ID (ServiceNow auto-increment style u_sports_hall_bookings)
    const nextNum = 10001 + bookings.length;
    const bookingId = `BK-${nextNum}`;

    const newBooking = {
      id: bookingId,
      name: currentBookingInProgress.name,
      email: currentBookingInProgress.email,
      phone: currentBookingInProgress.phone,
      sport: currentBookingInProgress.sport,
      facility: currentBookingInProgress.facility,
      date: currentBookingInProgress.date,
      slot: currentBookingInProgress.slot,
      fee_paid: currentBookingInProgress.fee_paid,
      status: "Pending", // Default workflow state
      cancellation_charge: 0.00,
      refund_amount: 0.00,
      created_at: new Date().toISOString()
    };

    // Save record to DB
    bookings.push(newBooking);
    saveBookings(bookings);

    // Trigger ServiceNow notification Event: sports.hall.confirmation
    triggerSNEvent("sports.hall.confirmation", newBooking);

    // Update Confirmation UI Screen
    document.getElementById('receipt-booking-id').textContent = `#${bookingId}`;
    document.getElementById('receipt-sport-hall').textContent = `${newBooking.sport} - ${newBooking.facility}`;
    document.getElementById('receipt-date-time').textContent = `${newBooking.date} @ ${newBooking.slot}`;
    document.getElementById('receipt-workflow-status').textContent = 'Pending Approval';
    document.getElementById('receipt-workflow-status').className = 'badge badge-pending';

    // Show Success Step
    setBookingStep(4);
    showToast('Payment Captured', `Paid $${newBooking.fee_paid.toFixed(2)} securely via gateway.`, 'success');
    showToast('ServiceNow Event Fired', 'Triggered confirmation email event.', 'info');

    // Reset fields
    form.reset();
    document.querySelector('.card-number-display').textContent = '•••• •••• •••• ••••';
    document.querySelector('.card-holder-display').textContent = 'CARDHOLDER NAME';
    document.querySelector('.card-expiry-display').textContent = 'MM/YY';
  });

  // Book Another Button Handler
  document.getElementById('book-another-btn').addEventListener('click', () => {
    // Reset state variables
    selectedSport = null;
    selectedRate = 0;
    selectedDate = '';
    selectedSlot = '';
    selectedFacility = '';
    currentBookingInProgress = null;

    document.getElementById('contact-name').value = '';
    document.getElementById('contact-email').value = '';
    document.getElementById('contact-phone').value = '';
    document.getElementById('booking-date').value = '';
    document.getElementById('calc-total').textContent = '$0.00';

    setBookingStep(1);
  });
}

// Trigger Simulated ServiceNow Events & Email Deliveries
function triggerSNEvent(eventName, booking) {
  const emails = getEmails();
  const nextNum = 20001 + emails.length;
  const emailId = `EM-${nextNum}`;

  let subject = "";
  let body = "";

  if (eventName === 'sports.hall.confirmation') {
    subject = `Sports Zone Booking Received: #[${booking.id}]`;
    body = generateConfirmationEmailHTML(booking);
  } else if (eventName === 'sports.hall.approval_status') {
    subject = `Sports Zone Reservation Alert: #${booking.id} has been ${booking.status}`;
    body = generateApprovalStatusEmailHTML(booking);
  } else if (eventName === 'sports.hall.reminder') {
    subject = `Upcoming Reservation Reminder: #${booking.id}`;
    body = generateReminderEmailHTML(booking);
  } else if (eventName === 'sports.hall.cancellation_receipt') {
    subject = `Booking Cancellation Receipt: #${booking.id}`;
    body = generateCancellationEmailHTML(booking);
  }

  const newEmail = {
    id: emailId,
    subject: subject,
    from: "sportszone.notifications@service-now.com",
    to: booking.email,
    event_fired: eventName,
    time: new Date().toLocaleString(),
    body: body,
    read: false
  };

  emails.unshift(newEmail); // Add to top of inbox
  saveEmails(emails);

  renderMailbox();
}

// Render Admin/Manager Dashboard Panel
function renderAdminPanel() {
  const bookings = getBookings();
  const tbody = document.querySelector('#bookings-table tbody');
  tbody.innerHTML = '';

  // Stats Counters
  let totalBookings = bookings.length;
  let totalRevenue = 0;
  let pendingApprovals = 0;
  let cancellationFees = 0;

  bookings.forEach(booking => {
    // Revenue calculations: count fee paid unless reservation was rejected, but subtract refunds if cancelled
    if (booking.status === 'Approved' || booking.status === 'Pending') {
      totalRevenue += booking.fee_paid;
    } else if (booking.status === 'Cancelled') {
      // Net kept revenue is just the cancellation fee deduction
      totalRevenue += booking.cancellation_charge;
      cancellationFees += booking.cancellation_charge;
    }

    if (booking.status === 'Pending') {
      pendingApprovals++;
    }
  });

  // Write Stats UI
  document.getElementById('stat-total-bookings').textContent = totalBookings;
  document.getElementById('stat-total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
  document.getElementById('stat-pending-approvals').textContent = pendingApprovals;
  document.getElementById('stat-cancellation-fees').textContent = `$${cancellationFees.toFixed(2)}`;

  if (bookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px; color: var(--color-text-muted);">
          No reservation records found. Book a facility to generate records.
        </td>
      </tr>
    `;
    return;
  }

  // Populate Table Rows
  bookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).forEach(b => {
    const tr = document.createElement('tr');

    let statusBadgeClass = 'badge-pending';
    if (b.status === 'Approved') statusBadgeClass = 'badge-success';
    if (b.status === 'Rejected' || b.status === 'Cancelled') statusBadgeClass = 'badge-danger';

    // Show actions based on status
    let actionButtonsHTML = '';
    if (b.status === 'Pending') {
      actionButtonsHTML = `
        <button class="action-btn approve" onclick="processApproval('${b.id}', 'Approved')" title="Approve Request">
          <i data-lucide="check"></i>
        </button>
        <button class="action-btn reject" onclick="processApproval('${b.id}', 'Rejected')" title="Reject Request">
          <i data-lucide="x"></i>
        </button>
      `;
    } else if (b.status === 'Approved') {
      actionButtonsHTML = `
        <button class="action-btn cancel" onclick="openCancellationModal('${b.id}')" title="Cancel Booking">
          <i data-lucide="x-circle"></i>
        </button>
      `;
    } else {
      actionButtonsHTML = `<span style="color: var(--color-text-muted); font-size: 0.75rem;">Archived</span>`;
    }

    tr.innerHTML = `
      <td><strong>#${b.id}</strong></td>
      <td>
        <div class="user-cell">
          <strong>${escapeHTML(b.name)}</strong>
          <span>${escapeHTML(b.email)}</span>
        </div>
      </td>
      <td>
        <div class="user-cell">
          <strong>${b.sport}</strong>
          <span>${b.facility}</span>
        </div>
      </td>
      <td>
        <div class="user-cell">
          <strong>${b.date}</strong>
          <span>${b.slot}</span>
        </div>
      </td>
      <td>$${b.fee_paid.toFixed(2)}</td>
      <td><span class="badge ${statusBadgeClass}">${b.status}</span></td>
      <td>${b.cancellation_charge > 0 ? `$${b.cancellation_charge.toFixed(2)}` : '-'}</td>
      <td>${b.refund_amount > 0 ? `$${b.refund_amount.toFixed(2)}` : '-'}</td>
      <td>
        <div class="actions-cell">
          ${actionButtonsHTML}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  lucide.createIcons();
}

// Escapes values for HTML injection
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Approve / Reject Reservation Handler
window.processApproval = function(bookingId, newStatus) {
  const bookings = getBookings();
  const bIndex = bookings.findIndex(b => b.id === bookingId);
  
  if (bIndex === -1) return;
  
  bookings[bIndex].status = newStatus;
  saveBookings(bookings);

  // Trigger SN Event update
  triggerSNEvent("sports.hall.approval_status", bookings[bIndex]);
  
  renderAdminPanel();
  showToast('Booking Updated', `Booking #${bookingId} has been ${newStatus.toLowerCase()}.`, 'success');
};

// Cancellation Business Rule Engine simulation
let activeBookingToCancel = null;

window.openCancellationModal = function(bookingId) {
  const bookings = getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  activeBookingToCancel = booking;

  // Implements the Business Rules logics (Activity 2.3): store the 10% cancellation charges and calculate the refund
  const feePaid = booking.fee_paid;
  const cancelCharge = feePaid * 0.10; // 10% deduction fee
  const refundAmount = feePaid - cancelCharge; // Revert the balance amount

  document.getElementById('modal-fee-paid').textContent = `$${feePaid.toFixed(2)}`;
  document.getElementById('modal-cancellation-charge').textContent = `$${cancelCharge.toFixed(2)}`;
  document.getElementById('modal-refund-amount').textContent = `$${refundAmount.toFixed(2)}`;

  document.getElementById('cancel-modal').classList.add('active');
};

// Close cancellation modal
document.getElementById('close-cancel-modal-btn').addEventListener('click', () => {
  document.getElementById('cancel-modal').classList.remove('active');
  activeBookingToCancel = null;
});

// Confirm Cancellation click handler
document.getElementById('confirm-cancellation-btn').addEventListener('click', () => {
  if (!activeBookingToCancel) return;

  const bookings = getBookings();
  const bIndex = bookings.findIndex(b => b.id === activeBookingToCancel.id);

  if (bIndex !== -1) {
    const originalFee = bookings[bIndex].fee_paid;
    const cancelCharge = originalFee * 0.10;
    const refundAmt = originalFee - cancelCharge;

    // Apply the custom Business Rule modifications to the record
    bookings[bIndex].status = 'Cancelled';
    bookings[bIndex].cancellation_charge = cancelCharge;
    bookings[bIndex].refund_amount = refundAmt;

    saveBookings(bookings);

    // Fire Email Notification: sports.hall.cancellation_receipt
    triggerSNEvent("sports.hall.cancellation_receipt", bookings[bIndex]);

    showToast('Booking Cancelled', `Charged 10% ($${cancelCharge.toFixed(2)}) fee. Refunded $${refundAmt.toFixed(2)}.`, 'warning');
    showToast('Business Rule Executed', 'Applied 10% cancellation fee structure to u_sports_hall_bookings.', 'info');
  }

  document.getElementById('cancel-modal').classList.remove('active');
  activeBookingToCancel = null;
  renderAdminPanel();
});

// Scheduled Job Script Simulation (Activity 4.1 / 2.2)
// Event registry name: sports.hall.reminder. Fired by Scheduled Jobs.
document.getElementById('trigger-scheduled-job-btn').addEventListener('click', () => {
  const bookings = getBookings();
  
  // Filter for approved bookings where date matches tomorrow's date
  const tomorrowStr = getOffsetDateString(1);
  const targetBookings = bookings.filter(b => b.date === tomorrowStr && b.status === 'Approved');

  if (targetBookings.length === 0) {
    showToast('Scheduled Job Status', 'No Approved bookings found scheduled for tomorrow. Check date filter.', 'info');
    return;
  }

  let firedCount = 0;
  targetBookings.forEach(booking => {
    // Fires event: sports.hall.reminder
    triggerSNEvent("sports.hall.reminder", booking);
    firedCount++;
  });

  showToast('Scheduled Job Completed', `Fired ${firedCount} 'sports.hall.reminder' event alerts.`, 'success');
});

// Reset Database for testing convenience
document.getElementById('clear-db-btn').addEventListener('click', () => {
  if (confirm("Are you sure you want to reset the database and restore default records?")) {
    localStorage.removeItem('u_sports_hall_bookings');
    localStorage.removeItem('sys_emails');
    initializeDB();
    renderAdminPanel();
    renderMailbox();
    showToast('Database Reset', 'Default datasets restored.', 'warning');
  }
});

// Render Mailbox view list and unread badges
function renderMailbox() {
  const emails = getEmails();
  const listContainer = document.getElementById('inbox-list');
  const unreadCount = emails.filter(e => !e.read).length;
  
  // Update sidebar unread badge
  const badge = document.getElementById('mail-badge');
  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }

  listContainer.innerHTML = '';
  
  if (emails.length === 0) {
    listContainer.innerHTML = `
      <div class="inbox-empty">
        <i data-lucide="mail-open"></i>
        <p>No emails in simulator inbox yet.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  emails.forEach(email => {
    const item = document.createElement('div');
    item.className = `inbox-item ${!email.read ? 'unread' : ''}`;
    item.setAttribute('data-id', email.id);
    
    // Truncate subject
    const subjectTrunc = email.subject.length > 35 ? email.subject.substring(0, 35) + '...' : email.subject;

    item.innerHTML = `
      <div class="inbox-item-header">
        <span class="inbox-subject">${escapeHTML(subjectTrunc)}</span>
        ${!email.read ? '<span class="inbox-dot"></span>' : ''}
      </div>
      <div class="inbox-item-preview">
        To: ${escapeHTML(email.to)} - Fired by event action. Check body details.
      </div>
      <div class="inbox-item-footer">
        <span>${email.time}</span>
        <span class="inbox-event-tag">${email.event_fired}</span>
      </div>
    `;

    item.addEventListener('click', () => {
      // Toggle active visual
      document.querySelectorAll('.inbox-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      // Mark as read
      email.read = true;
      
      // Update email cache in storage
      const allEmails = getEmails();
      const matchIdx = allEmails.findIndex(e => e.id === email.id);
      if (matchIdx !== -1) {
        allEmails[matchIdx].read = true;
        saveEmails(allEmails);
      }
      
      // Display email contents
      displayEmailPreview(email);
      
      // Rerender mailbox to clear unread dots
      renderMailbox();
    });

    listContainer.appendChild(item);
  });
}

// Display selected email preview in detail column
function displayEmailPreview(email) {
  document.getElementById('email-preview-panel').querySelector('.preview-empty-state').style.display = 'none';
  
  const details = document.getElementById('email-details');
  details.style.display = 'flex';

  document.getElementById('email-subject').textContent = email.subject;
  document.getElementById('email-to').textContent = email.to;
  document.getElementById('email-event-fired').textContent = email.event_fired;
  document.getElementById('email-time').textContent = email.time;
  
  // Inject HTML body
  const bodyBox = document.getElementById('email-body');
  bodyBox.innerHTML = email.body;
}

// Email templates HTML generators
function generateConfirmationEmailHTML(b) {
  return `
    <div class="email-container">
      <div class="email-header">
        <h2 style="margin: 0; font-size: 20px;">Reservation Confirmation</h2>
        <p style="margin: 4px 0 0; font-size: 13px;">Sports Zone Portal Confirmation (sz)</p>
      </div>
      <div class="email-body">
        <p>Dear <strong>${escapeHTML(b.name)}</strong>,</p>
        <p>Your sports hall reservation has been registered in the system. The booking is currently awaiting Sports Hall Manager review and approval.</p>
        
        <table class="email-data-table">
          <thead>
            <tr>
              <th colspan="2">Reservation Details</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Booking Reference</strong></td><td>#${b.id}</td></tr>
            <tr><td><strong>Sport</strong></td><td>${b.sport}</td></tr>
            <tr><td><strong>Facility / Court</strong></td><td>${b.facility}</td></tr>
            <tr><td><strong>Booking Date</strong></td><td>${b.date}</td></tr>
            <tr><td><strong>Time Slot</strong></td><td>${b.slot}</td></tr>
            <tr><td><strong>Payment Status</strong></td><td><span style="color:#10b981; font-weight:bold;">Paid ($${b.fee_paid.toFixed(2)})</span></td></tr>
            <tr><td><strong>Workflow Status</strong></td><td><span style="color:#f59e0b; font-weight:bold;">Pending Approval</span></td></tr>
          </tbody>
        </table>

        <p style="font-size:12px; color:#64748b; border-left: 3px solid #f59e0b; padding-left: 8px;">
          Note: Cancellations made after approval will incur a 10% deduction charge automatically.
        </p>

        <p>We will email you as soon as the status of your reservation changes.</p>
      </div>
      <div class="email-footer">
        <p>&copy; 2026 Sports Zone. Powered by ServiceNow Service Portal.</p>
      </div>
    </div>
  `;
}

function generateApprovalStatusEmailHTML(b) {
  const statusColor = b.status === 'Approved' ? '#10b981' : '#ef4444';
  const statusMsg = b.status === 'Approved' 
    ? "Great news! Your booking has been approved by the Sports Hall Manager. Enjoy your game!" 
    : "We regret to inform you that your booking could not be approved due to capacity or scheduling overlaps. A 100% refund has been processed back to your card.";

  return `
    <div class="email-container">
      <div class="email-header" style="background:${statusColor};">
        <h2 style="margin: 0; font-size: 20px;">Reservation ${b.status}</h2>
        <p style="margin: 4px 0 0; font-size: 13px;">Sports Zone Portal Notification</p>
      </div>
      <div class="email-body">
        <p>Dear <strong>${escapeHTML(b.name)}</strong>,</p>
        <p>${statusMsg}</p>
        
        <table class="email-data-table">
          <thead>
            <tr>
              <th colspan="2">Reservation Status Update</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Booking Reference</strong></td><td>#${b.id}</td></tr>
            <tr><td><strong>Sport & Facility</strong></td><td>${b.sport} - ${b.facility}</td></tr>
            <tr><td><strong>Date & Time</strong></td><td>${b.date} @ ${b.slot}</td></tr>
            <tr><td><strong>Workflow Status</strong></td><td><span style="color:${statusColor}; font-weight:bold;">${b.status}</span></td></tr>
          </tbody>
        </table>

        ${b.status === 'Approved' ? `
          <div style="text-align: center; margin-top: 20px;">
            <a href="#" class="email-button" style="background-color:${statusColor};">Access Digital Pass</a>
          </div>
        ` : ''}
      </div>
      <div class="email-footer">
        <p>&copy; 2026 Sports Zone. Powered by ServiceNow Service Portal.</p>
      </div>
    </div>
  `;
}

function generateReminderEmailHTML(b) {
  return `
    <div class="email-container">
      <div class="email-header" style="background:#0284c7;">
        <h2 style="margin: 0; font-size: 20px;">Upcoming Booking Reminder</h2>
        <p style="margin: 4px 0 0; font-size: 13px;">Triggered by ServiceNow Scheduled Job (Event: sports.hall.reminder)</p>
      </div>
      <div class="email-body">
        <p>Dear <strong>${escapeHTML(b.name)}</strong>,</p>
        <p>This is a friendly automated reminder that you have an upcoming sports hall reservation tomorrow.</p>
        
        <table class="email-data-table">
          <thead>
            <tr>
              <th colspan="2">Venue & Schedule Details</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Booking Reference</strong></td><td>#${b.id}</td></tr>
            <tr><td><strong>Facility / Court</strong></td><td>${b.sport} - ${b.facility}</td></tr>
            <tr><td><strong>Date & Time</strong></td><td>${b.date} @ ${b.slot}</td></tr>
            <tr><td><strong>Status</strong></td><td><span style="color:#10b981; font-weight:bold;">Approved</span></td></tr>
          </tbody>
        </table>

        <p>Please make sure to arrive at least 10 minutes prior to your booking. Bring your digital check-in pass. If you need to make changes, please visit the portal immediately.</p>
      </div>
      <div class="email-footer">
        <p>&copy; 2026 Sports Zone. Powered by ServiceNow Service Portal.</p>
      </div>
    </div>
  `;
}

function generateCancellationEmailHTML(b) {
  return `
    <div class="email-container">
      <div class="email-header" style="background:#f59e0b;">
        <h2 style="margin: 0; font-size: 20px;">Booking Cancelled & Refunded</h2>
        <p style="margin: 4px 0 0; font-size: 13px;">ServiceNow Business Rule Receipt (10% Charge Deducted)</p>
      </div>
      <div class="email-body">
        <p>Dear <strong>${escapeHTML(b.name)}</strong>,</p>
        <p>Your sports hall booking has been cancelled. As per our cancellation rules, since this booking was already approved, a <strong>10% cancellation charge</strong> has been applied to the refund amount.</p>
        
        <table class="email-data-table">
          <thead>
            <tr>
              <th colspan="2">Refund Details</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Booking Reference</strong></td><td>#${b.id}</td></tr>
            <tr><td><strong>Facility / Court</strong></td><td>${b.sport} - ${b.facility}</td></tr>
            <tr><td><strong>Original Fee Paid</strong></td><td>$${b.fee_paid.toFixed(2)}</td></tr>
            <tr><td><strong>Cancellation Fee (10%)</strong></td><td><span style="color:#ef4444;">$${b.cancellation_charge.toFixed(2)}</span></td></tr>
            <tr><td><strong>Refunded Balance (90%)</strong></td><td><strong style="color:#10b981;">$${b.refund_amount.toFixed(2)}</strong></td></tr>
            <tr><td><strong>Refund Status</strong></td><td><span style="color:#10b981; font-weight:bold;">Processed</span></td></tr>
          </tbody>
        </table>

        <p>Refunds usually take 3-5 business days to clear on your bank account depending on cardholder bank.</p>
      </div>
      <div class="email-footer">
        <p>&copy; 2026 Sports Zone. Powered by ServiceNow Service Portal.</p>
      </div>
    </div>
  `;
}
