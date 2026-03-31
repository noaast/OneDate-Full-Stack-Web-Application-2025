document.addEventListener("DOMContentLoaded", () => {

  // =========================
  // Helpers (UI validations only)
  // =========================

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function isValidPhone(phone) {
    return /^05\d{8}$/.test(phone);
  }

  // =========================
  // SIGNUP (ACTION)
  // =========================

  const signupForm = document.getElementById("signupForm");

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fullName = document.getElementById("signup-name").value.trim();
      const age = document.getElementById("signup-age").value.trim();
      const email = document.getElementById("signup-email").value.trim();
      const password = document.getElementById("signup-password").value;
      const phone = document.getElementById("signup-phone").value.trim();
      const city = document.getElementById("signup-city").value.trim();

      if (!fullName || !email || !password) {
        alert("Please fill all required fields.");
        return;
      }

      if (!isValidEmail(email)) {
        alert("Please enter a valid email address.");
        return;
      }

      if (!isValidPhone(phone)) {
        alert("Please enter a valid Israeli phone number (e.g. 05XXXXXXXX).");
        return;
      }

      if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
      }
     

      // submit via ACTION
      signupForm.submit();
    });
    
  }

// popup messages based on URL params (after server redirect)
const params = new URLSearchParams(window.location.search);
const err = params.get("error");
const success = params.get("success");

// Signup page errors
if (window.location.pathname.includes("signup.html")) {
  if (err === "exists") {
    alert("This email is already registered. Please log in or use a different email.");
  } else if (err === "invalidEmail") {
    alert("Please enter a valid email address.");
  } else if (err === "1") {
    alert("Please fill all required fields.");
  }
}

// Login page success message (after successful signup redirect)
if (window.location.pathname.includes("login.html")) {
  if (success === "1") {
    alert("Sign-Up successful 🎉");
    window.history.replaceState({}, document.title, "login.html");
  }
}
  
  // =========================
  // LOGIN ✅ FETCH (keep localStorage)
  // =========================

  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;

      if (!email || !password) {
        alert("Please enter email and password.");
        return;
      }

      if (!isValidEmail(email)) {
        alert("Invalid email format.");
        return;
      }

      try {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (!response.ok) {
          alert(result.error || "Login failed");
          return;
        }

        // keep localStorage
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("currentUserEmail", email);

        alert("Login successful 🎉");
        window.location.href = "myaccount.html";

      } catch (err) {
        console.error("Login request failed:", err);
        alert("Server error");
      }
    });
  }

  // =========================
// FORGOT PASSWORD (popup only)
// =========================

const forgotPasswordLink = document.getElementById("forgotPasswordLink");

if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", (e) => {
    e.preventDefault();

    alert(
      "Since we apparently skipped this part of the course, password reset is... not a thing.\n\n" +
      "So... your cat? aunt? first grade teacher? \n\n" + 
      "Come on, you know this!"
    );
  });
}

  // =========================
  // BOOKING ✅ FETCH (as requested)
  // =========================

  const bookingForm = document.getElementById("bookingForm");

  if (bookingForm) {
    bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const userEmail = localStorage.getItem("currentUserEmail");

      if (!userEmail) {
        alert("You must be logged in to create a booking");
        return;
      }

      const bookingData = {
        eventType: document.getElementById("eventType").value,
        eventDate: document.getElementById("eventDate").value,
        eventLocation: document.getElementById("eventLocation").value,
        eventStyle: document.getElementById("eventStyle").value,
        ageRange: document.getElementById("ageRange").value,
        interests: document.getElementById("interests").value,
        notes: document.getElementById("notes").value,
        userEmail
      };

      const eventDateValue = new Date(bookingData.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (eventDateValue < today) {
        alert("Event date must be in the future");
        return;
      }

      if (!bookingData.eventType || !bookingData.eventLocation || !bookingData.eventStyle) {
        alert("Please fill all required booking fields");
        return;
      }

      if (isNaN(parseInt(bookingData.ageRange)) || bookingData.ageRange < 18 || bookingData.ageRange > 120) {
        alert("Please enter a valid age range");
        return;
      }

      try {
        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingData)
        });

        const result = await response.json();

        if (!response.ok) {
          alert(result.error || "Booking failed");
          return;
        }

        console.log("matches from server:", result.matches);

        // 🆕 אם השרת מחזיר 2 אופציות – עוצרים כאן
        if (result.matches && result.matches.length === 2) {
          showEmployeeSelection(result.matches, bookingData);
          return;
        }

        // fallback – אם אין אופציות
        alert("Booking created successfully 🎉");
        window.location.href = "myaccount.html";

      } catch (err) {
        console.error("Booking request failed:", err);
        alert("Server error");
      }
    });
  }

  // =========================
  // MY ACCOUNT (unchanged logic)
  // =========================

  if (window.location.pathname.includes("myaccount.html")) {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const email = localStorage.getItem("currentUserEmail");

    if (!isLoggedIn || !email) {
      document.getElementById("not-logged-in").classList.remove("d-none");
      document.getElementById("account-content").classList.add("d-none");
      return;
    }

    document.getElementById("not-logged-in").classList.add("d-none");
    document.getElementById("account-content").classList.remove("d-none");

    fetch(`/api/me?email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(data => {
        document.getElementById("display-name").innerText = data.full_name;
        document.getElementById("display-email").innerText = data.email;
        document.getElementById("display-phone").innerText = data.phone || "—";
        document.getElementById("display-city").innerText = data.city || "—";
      });

    fetch(`/api/my-bookings?email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(bookings => {
        const tbody = document.getElementById("my-bookings");
        tbody.innerHTML = "";

        // Collect all active bookings (can be more than one)
        const activeBookings = bookings.filter(b => b.status === "active");

         if (activeBookings.length > 0) {
         const container = document.getElementById("active-booking-details");
       
          //Active booking section
           container.classList.remove("d-none");
           document.getElementById("no-active-booking").classList.add("d-none");
         
           container.innerHTML = "";

          // Render each active booking
           activeBookings.forEach(b => {
           const div = document.createElement("div");
           div.className = "mb-2";

             div.innerHTML = `
            <strong>${b.event_type}</strong> |
            ${String(b.event_date).slice(0, 10)} |
            ${b.event_location}
            `;

            container.appendChild(div);
            });

         } else {
         document.getElementById("active-booking-details").classList.add("d-none");
         document.getElementById("no-active-booking").classList.remove("d-none");
         }      

         // If there are active bookings, move the "new booking" button outside the dashed box and update its text.
         //If not, keep the button inside as before
           const bookingArea = document.getElementById("booking-status-area");
           const ctaBtn = document.getElementById("new-booking-btn");

            if (ctaBtn) {
            if (activeBookings.length > 0) {
               bookingArea.insertAdjacentElement("afterend", ctaBtn);
               ctaBtn.innerText = "Book another date →";
               ctaBtn.classList.add("mt-3");

             } else {
               bookingArea.appendChild(ctaBtn);
              ctaBtn.innerText = "Find Your Companion →";
              }
           }
        
        // Past bookings
        const pastBookings = bookings.filter(b => b.status === "past");

        if (pastBookings.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="5" class="text-center text-muted">
                No past bookings
              </td>
            </tr>
          `;
          return;
        }

        pastBookings.forEach(b => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${b.event_type}</td>
            <td>${b.event_location}</td>
            <td>${b.event_style}</td>
            <td>${renderStatusBadge(b.status)}</td>
            <td>
              <button class="btn btn-sm btn-outline-danger"
                      onclick="deleteBooking(${b.id})">
                Delete
              </button>
            </td>
          `;
          tbody.appendChild(row);
        });
      });
  }
});

// =========================
// CONTACT FORM (Action)
// =========================

const contactForm = document.getElementById("contactForm");

if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = document.getElementById("contact-name").value.trim();
    const email = document.getElementById("contact-email").value.trim();
    const subject = document.getElementById("contact-subject").value.trim();
    const message = document.getElementById("contact-message").value.trim();

    if (!fullName || !email || !subject || !message) {
      alert("Please fill all required fields.");
      return;
    }
    else{
        alert("Message sent 💌");
        window.location.href = "contact.html";
    }

    // ✅ submit via ACTION (no fetch)
    contactForm.submit();
  });
}

// ✅ click blocker (unchanged)
document.addEventListener("click", (e) => {
  const target = e.target.closest("a, button");
  if (!target) return;

  const goesToBooking =
    target.getAttribute("href") === "booking.html" ||
    target.onclick?.toString().includes("booking");

  if (!goesToBooking) return;

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  if (!isLoggedIn) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    alert("You must log in before making a booking.");
    return false;
  }
});

// =========================
// GLOBAL FUNCTIONS (unchanged)
// =========================

function renderStatusBadge(status) {
  if (status === "active") return `<span class="badge bg-success">Active</span>`;
  if (status === "past") return `<span class="badge bg-secondary">Past</span>`;
  return `<span class="badge bg-light text-dark">${status}</span>`;
}

function logout() {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("currentUserEmail");
  window.location.href = "index.html";
}

function deleteBooking(bookingId) {
  if (!confirm("Are you sure you want to delete this booking?")) return;

  fetch(`/api/bookings/${bookingId}`, { method: "DELETE" })
    .then(res => res.json())
    .then(() => {
      alert("Booking deleted successfully");
      window.location.reload();
    })
    .catch(() => {
      alert("Failed to delete booking");
    });
}

function showEmployeeSelection(employees, bookingData) {
  const modalEl = document.getElementById("companionModal");
  const optionsContainer = document.getElementById("companion-options");
  const confirmBtn = document.getElementById("confirmCompanionBtn");

  let selectedEmployeeId = null;
  optionsContainer.innerHTML = "";

  employees.forEach(emp => {
    const card = document.createElement("div");
    card.className = "surface p-3 employee-card d-flex align-items-center gap-3";
    card.style.cursor = "pointer";

    card.innerHTML = `
    <img
      src="https://i.pravatar.cc/80?u=${emp.id}"
      alt="${emp.full_name}"
      class="rounded-circle"
      style="width:64px;height:64px;object-fit:cover;"
    />
      <div class="flex-grow-1">
        <h5 class="fw-bold mb-1">${emp.full_name}</h5>
        <div class="text-muted small">Age ${emp.age}</div>

        <span class="badge rounded-pill px-3 py-2 mt-1"
              style="background:#f5f3ff;color:#7A5CFF;font-weight:500;">
          Available
        </span>
      </div>
    `;

    card.addEventListener("click", () => {
      document
        .querySelectorAll(".employee-card")
        .forEach(c => {
          c.classList.remove("border", "border-2", "border-primary");
          c.style.background = "";
        });

      card.classList.add("border", "border-2", "border-primary");
      card.style.background = "#f4f0ff";
      selectedEmployeeId = emp.id;
    });

    optionsContainer.appendChild(card);
  });

  confirmBtn.onclick = () => {
    if (!selectedEmployeeId) {
      alert("Please choose a companion");
      return;
    }

    confirmBooking(bookingData, selectedEmployeeId);
  };

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

async function confirmBooking(bookingData, employeeId) {
  try {
    const payload = {
      ...bookingData,
      employeeId
    };

    console.log("confirm payload:", payload);

    const response = await fetch("/api/bookings/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "Failed to confirm booking");
      return;
    }

    alert("Booking confirmed successfully 🎉");
    window.location.href = "myaccount.html";
  } catch (err) {
    console.error("Confirm booking failed:", err);
    alert("Server error while confirming booking");
  }
}
