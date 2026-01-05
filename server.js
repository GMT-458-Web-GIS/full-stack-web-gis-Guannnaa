const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const auth = require("./auth");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = "SECRET_KEY";

/* ===================== REGISTER ===================== */
app.post("/register", async (req, res) => {
const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      "INSERT INTO users(username,password,role) VALUES($1,$2,$3)",
      [username, hash, role]
    );
    res.json({ message: "User created" });
  } catch {
    res.status(400).json({ error: "User already exists" });
  }
});

/* ===================== LOGIN ===================== */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE username=$1",
    [username]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: "User not found" });
  }

  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    return res.status(401).json({ error: "Wrong password" });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET
  );

  res.json({ token, role: user.role });
});

/* ===================== REPORTS ===================== */

// GET ALL REPORTS
app.get("/reports", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT id,type,description,status,assigned_team,ST_AsGeoJSON(geom) AS geom FROM reports"
  );
  res.json(result.rows);
});

// ADD REPORT (USER)
app.post("/reports", auth, async (req, res) => {
  if (req.user.role !== "user") {
    return res.status(403).json({ error: "Only users can add reports" });
  }

  const { type, description, lat, lng } = req.body;

  await pool.query(
    `INSERT INTO reports(type,description,status,geom)
     VALUES ($1,$2,'bildirildi',ST_SetSRID(ST_Point($3,$4),4326))`,
    [type, description, lng, lat]
  );

  res.json({ message: "Report added" });
});

/* ===================== TEAMS ===================== */

// GET TEAMS (MANAGER)
app.get("/teams", auth, async (req, res) => {
  if (req.user.role !== "manager") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const result = await pool.query("SELECT * FROM teams ORDER BY id");
  res.json(result.rows);
});

// ASSIGN TEAM (MANAGER)
app.put("/reports/:id/assign", auth, async (req, res) => {
  if (req.user.role !== "manager") {
    return res.status(403).json({ error: "Only manager can assign teams" });
  }

  const { team } = req.body;
  const reportId = req.params.id;

  await pool.query(
    "UPDATE reports SET assigned_team=$1, status='tamir edilecek' WHERE id=$2",
    [team, reportId]
  );

  await pool.query(
    "UPDATE teams SET status='working' WHERE name=$1",
    [team]
  );

  res.json({ message: "Team assigned" });
});

/* ===================== WORKER ===================== */

// UPDATE STATUS (WORKER)
app.put("/reports/:id/status", auth, async (req, res) => {
  if (req.user.role !== "worker") {
    return res.status(403).json({ error: "Only workers can update status" });
  }

  const { status } = req.body;
  const reportId = req.params.id;

  const r = await pool.query(
    "SELECT assigned_team FROM reports WHERE id=$1",
    [reportId]
  );

  await pool.query(
    "UPDATE reports SET status=$1 WHERE id=$2",
    [status, reportId]
  );

  if (status === "tamir edildi") {
    await pool.query(
      "UPDATE teams SET status='available' WHERE name=$1",
      [r.rows[0].assigned_team]
    );
  }

  res.json({ message: "Status updated" });
});

/* ===================== DELETE (MANAGER) ===================== */
app.delete("/reports/:id", auth, async (req, res) => {
  if (req.user.role !== "manager") {
    return res.status(403).json({ error: "Forbidden" });
  }

  await pool.query("DELETE FROM reports WHERE id=$1", [req.params.id]);
  res.json({ message: "Deleted" });
});

/* ===================== START ===================== */
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");});

