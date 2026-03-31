import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../db/db.js";

function parseForm(body) {
  const params = new URLSearchParams(body);
  const obj = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  return obj;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handleRequest(req, res) {

  const method = req.method;
  const cleanUrl = req.url.split("?")[0]; // ⭐ קריטי

  console.log("➡️", method, cleanUrl);

  // =========================
  // API: SIGNUP
  // =========================
  if (method === "POST" && cleanUrl === "/api/signup") {
    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        //const { fullName, age, email, password, phone, city } = JSON.parse(body);

        const { fullName, age, email, password, phone, city } = parseForm(body);


        // ---- ולידציות צד שרת ----
        if (!fullName || !email || !password) {
          //res.writeHead(400, { "Content-Type": "application/json" });
          //res.end(JSON.stringify({ error: "Missing required fields" }));
          res.writeHead(302, { Location: "/signup.html?error=1" }); //if signup fails, goes back to retry
          res.end();

          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          // res.writeHead(400, { "Content-Type": "application/json" });
          // res.end(JSON.stringify({ error: "Invalid email format" }));
          // return;
          res.writeHead(302, { Location: "/signup.html?error=invalidEmail" });
          res.end();
          return;
        }

        // בדיקה אם האימייל כבר קיים
        const [existingUsers] = await db.query(
          "SELECT id FROM users WHERE email = ?",
          [email]
        );

        if (existingUsers.length > 0) {
          // res.writeHead(409, { "Content-Type": "application/json" });
          // res.end(JSON.stringify({ error: "Email already exists" }));
          // return;
          res.writeHead(302, { Location: "/signup.html?error=exists" });
          res.end();
          return;
        }

        await db.query(
          "INSERT INTO users (full_name, age, email, password, phone, city) VALUES (?, ?, ?, ?, ?, ?)",
          [fullName, age, email, password, phone, city]
        );

        // res.writeHead(201, { "Content-Type": "application/json" });
        // res.end(JSON.stringify({ message: "User created successfully" }));
        res.writeHead(302, { Location: "/login.html?success=1" });
        res.end();

      } catch (err) {
        console.error("❌ SIGNUP ERROR:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Signup failed" }));
      }
    });

    return;
  }

  // =========================
  // API: LOGIN
  // =========================
  if (method === "POST" && cleanUrl === "/api/login") {
    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const { email, password } = JSON.parse(body);

        // ולידציה בסיסית
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !password) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing email or password" }));

          return;
        }

        const [rows] = await db.query(
          "SELECT id, full_name, email FROM users WHERE email = ? AND password = ?",
          [email, password]
        );

        if (rows.length === 0) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid email or password" }));
          return;
        }

        // התחברות הצליחה
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          message: "Login successful",
          user: rows[0] }));

       
      } catch (err) {
        console.error("❌ LOGIN ERROR:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Login failed" }));
      }
    });

    return;
  }

  // =========================
  // API: GET ALL USERS
  // =========================
  if (method === "GET" && cleanUrl === "/api/users") {
    try {
      const [rows] = await db.query(
        "SELECT id, full_name, email, phone, city FROM users"
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
    } catch (err) {
      console.error("❌ GET USERS ERROR:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to fetch users" }));
    }

    return;
  }

  // =========================
  // API: GET CURRENT USER (MY ACCOUNT)
  // =========================
  if (method === "GET" && cleanUrl === "/api/me") {
    try {
      const email = new URL(req.url, `http://${req.headers.host}`)
        .searchParams.get("email");

      if (!email) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Email is required" }));
        return;
      }

      const [rows] = await db.query(
        "SELECT full_name, email, phone, city FROM users WHERE email = ?",
        [email]
      );

      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "User not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
    } catch (err) {
      console.error("❌ ME ERROR:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to fetch user data" }));
    }

    return;
  }

  // =========================
  // =========================
// API: CREATE BOOKING (שלב התאמה בלבד – בלי יצירת הזמנה)
// =========================
if (method === "POST" && cleanUrl === "/api/bookings") {
  let body = "";

  req.on("data", chunk => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const {
        eventType,
        eventDate,
        eventLocation,
        eventStyle,
        ageRange,
        interests,
        notes,
        userEmail
      } = JSON.parse(body);

      // ---- ולידציות חובה ----
      if (!eventType || !eventDate || !eventLocation || !eventStyle || !ageRange || !userEmail) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing required booking fields" }));
        return;
      }

      // ---- ולידציית תאריך ----
      const bookingDate = new Date(eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = new Date("2050-12-31");

      if (isNaN(bookingDate.getTime())) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid event date format" }));
        return;
      }

      if (bookingDate < today) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Event date must be in the future" }));
        return;
      }

      if (bookingDate > maxDate) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Event date cannot be later than year 2050" }));
        return;
      }

      // ---- חישוב גיל ----
      const age = parseInt(ageRange, 10);
      if (isNaN(age)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid age range" }));
        return;
      }

      const minAge = age - 5;
      const maxAge = age + 5;

      // ---- שליפת 2 עובדים מתאימים ----
      const [employees] = await db.query(
        `SELECT id, full_name, age,city,style
         FROM employees
         WHERE age BETWEEN ? AND ?
         AND is_active = TRUE
         LIMIT 2`,
        [minAge, maxAge]
      );

      // ❗❗❗ כאן השינוי החשוב ❗❗❗
      // אין INSERT להזמנה
      // אין UPDATE ל-past
      // רק החזרת 2 אופציות

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        matches: employees
      }));

    } catch (err) {
      console.error("❌ BOOKING ERROR:", err);
        console.error("❌ BODY RECEIVED:", body);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to process booking" }));
    
    }
    
    
  });

  return;
}
// =========================
// API: CONFIRM BOOKING (אחרי בחירת עובד)
// =========================
if (method === "POST" && cleanUrl === "/api/bookings/confirm") {
  let body = "";

  req.on("data", chunk => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const {
        eventType,
        eventDate,
        eventLocation,
        eventStyle,
        ageRange,
        interests,
        notes,
        userEmail,
        employeeId
      } = JSON.parse(body);

      // ---- ולידציה ----
      // ---- ולידציה ----
if (!userEmail || !employeeId) {
  res.writeHead(400, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Missing booking confirmation data" }));
  return;
}

// ---- בדיקת עובד לפני כל שינוי ----
const [emp] = await db.query(
  "SELECT id FROM employees WHERE id = ? AND is_active = TRUE",
  [employeeId]
);

if (emp.length === 0) {
  res.writeHead(400, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Invalid employee" }));
  return;
}

      // ---- יצירת הזמנה חדשה ----
      await db.query(
        `INSERT INTO bookings
         (event_type, event_date, event_location, event_style, age_range, interests, notes, user_email, employee_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          eventType,
          eventDate,
          eventLocation,
          eventStyle,
          ageRange,
          interests || null,
          notes || null,
          userEmail,
          employeeId
        ]
      );

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Booking confirmed successfully" }));

    } catch (err) {
      console.error("❌ CONFIRM BOOKING ERROR:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to confirm booking" }));
    }
  });

  return;
}


  // API: GET USER BOOKINGS
  // =========================
  if (method === "GET" && cleanUrl === "/api/my-bookings") {
    try {
      const email = new URL(req.url, `http://${req.headers.host}`)
        .searchParams.get("email");

      if (!email) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Email is required" }));
        return;
      }

      // Make past bookings status 'past'
       await db.query(
      `UPDATE bookings
       SET status = 'past'
       WHERE user_email = ?
       AND event_date < CURDATE()`,
      [email]
    );

    const [rows] = await db.query(
      `SELECT *
       FROM bookings
       WHERE user_email = ?
       ORDER BY event_date ASC`,
      [email]
    );

    // bookings response
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
    } catch (err) {
      console.error("❌ MY BOOKINGS ERROR:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to fetch user bookings" }));
    }

    return;
  }

  // =========================
  // API: DELETE BOOKING BY ID
  // =========================
  if (method === "DELETE" && cleanUrl.startsWith("/api/bookings/")) {
    try {
      const bookingId = cleanUrl.split("/")[3]; // /api/bookings/:id

      if (!bookingId || isNaN(bookingId)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid booking id" }));
        return;
      }

      const [result] = await db.query(
        "DELETE FROM bookings WHERE id = ?",
        [bookingId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Booking not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Booking deleted successfully" }));
    } catch (err) {
      console.error("❌ DELETE BOOKING ERROR:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to delete booking" }));
    }

    return;
  }
// =========================
// API: CONTACT FORM
// =========================
if (method === "POST" && cleanUrl === "/api/contact") {
  let body = "";

  req.on("data", chunk => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      //const { fullName, email, subject, message } = JSON.parse(body);
      const { fullName, email, subject, message } = parseForm(body);

      // ---- ולידציות ----
      if (!fullName || !email || !subject || !message) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "All fields are required" }));
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid email format" }));
        return;
      }

      // ---- שמירה למסד ----
      await db.query(
        `INSERT INTO contact_messages (full_name, email, subject, message)
         VALUES (?, ?, ?, ?)`,
        [fullName, email, subject, message]
      );

      //res.writeHead(201, { "Content-Type": "application/json" });
      //res.end(JSON.stringify({ message: "Message sent successfully" }));
      res.writeHead(302, { Location: "/contact.html?sent=1" });
      res.end();

    } catch (err) {
      console.error("❌ CONTACT ERROR:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to send message" }));
    }
  });

  return;
}

  // =========================
  // HOME → index.html
  // =========================
  if (method === "GET" && cleanUrl === "/") {
    const filePath = path.join(__dirname, "..", "public", "index.html");

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end("Error loading index.html");
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(data);
    });

    return;
  }

  // =========================
  // STATIC FILES
  // =========================
  const filePath = path.join(__dirname, "..", "public", cleanUrl.slice(1));

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    let contentType = "text/plain";
    if (cleanUrl.endsWith(".html")) contentType = "text/html";
    else if (cleanUrl.endsWith(".css")) contentType = "text/css";
    else if (cleanUrl.endsWith(".js")) contentType = "application/javascript";
    else if (cleanUrl.endsWith(".png")) contentType = "image/png";
    else if (cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg")) contentType = "image/jpeg";
    else if (cleanUrl.endsWith(".woff2")) contentType = "font/woff2";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}
