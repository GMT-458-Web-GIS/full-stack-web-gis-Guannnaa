const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const auth = require("./auth");

const app = express();
app.use(cors());
app.use(express.json());

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
  } catch (err) {
    res.status(400).json({ error: "User already exists" });
  }
});

/* ===================== LOGIN ===================== */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const user = await pool.query(
    "SELECT * FROM users WHERE username=$1",
    [username]
  );

  if (user.rows.length === 0) {
    return res.status(401).json({ error: "User not found" });
  }

  const match = await bcrypt.compare(password, user.rows[0].password);
  if (!match) {
    return res.status(401).json({ error: "Wrong password" });
  }

  const token = jwt.sign(
    { id: user.rows[0].id, role: user.rows[0].role },
    "SECRET_KEY"
  );

  res.json({
    token: token,
    role: user.rows[0].role
  });
});

/* ===================== GET REPORTS ===================== */
app.get("/reports", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT id,type,description,status,ST_AsGeoJSON(geom) AS geom FROM reports"
  );
  res.json(result.rows);
});

/* ===================== ADD REPORT ===================== */
app.post("/reports", auth, async (req, res) => {
  const { type, description, lat, lng } = req.body;

  await pool.query(
    `INSERT INTO reports(type,description,geom)
     VALUES ($1,$2,ST_SetSRID(ST_Point($3,$4),4326))`,
    [type, description, lng, lat]
  );

  res.json({ message: "Report added" });
});

/* ===================== UPDATE STATUS ===================== */
app.put("/reports/:id", auth, async (req, res) => {
  if (req.user.role !== "worker" && req.user.role !== "manager") {
    return res.status(403).json({ error: "Forbidden" });
  }

  await pool.query(
    "UPDATE reports SET status=$1 WHERE id=$2",
    [req.body.status, req.params.id]
  );

  res.json({ message: "Status updated" });
});

/* ===================== DELETE REPORT ===================== */
app.delete("/reports/:id", auth, async (req, res) => {
  if (req.user.role !== "manager") {
    return res.status(403).json({ error: "Forbidden" });
  }

  await pool.query(
    "DELETE FROM reports WHERE id=$1",
    [req.params.id]
  );

  res.json({ message: "Deleted" });
});

/* ===================== START SERVER ===================== */
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
// Belediye çalışanı: tamir edildi / edilecek
app.put("/reports/:id/status", auth, async (req, res) => {
  if (req.user.role !== "worker" && req.user.role !== "manager") {
    return res.status(403).json({ error: "Forbidden" });
  }

  await pool.query(
    "UPDATE reports SET status=$1 WHERE id=$2",
    [req.body.status, req.params.id]
  );

  res.json({ message: "Status updated" });
});
app.put("/reports/:id/assign", auth, async (req, res) => {
  if (req.user.role !== "manager") {
    return res.status(403).json({ error: "Only manager can assign teams" });
  }

  await pool.query(
    "UPDATE reports SET assigned_team=$1 WHERE id=$2",
    [req.body.team, req.params.id]
  );

  res.json({ message: "Team assigned" });
});

