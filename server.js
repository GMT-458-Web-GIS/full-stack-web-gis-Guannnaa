const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const auth = require("./auth");

const app = express();
app.use(cors());
app.use(express.json());

const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Road Report API",
      version: "1.0.0",
      description: "API for managing road reports and teams",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./server.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const JWT_SECRET = "SECRET_KEY";

/* ===================== REGISTER ===================== */

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, manager, worker]
 *     responses:
 *       200:
 *         description: User created
 *       400:
 *         description: Missing fields or User already exists
 */
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

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 role:
 *                   type: string
 *       401:
 *         description: User not found or Wrong password
 */
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

/**
 * @swagger
 * /reports:
 *   get:
 *     summary: Get all reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of reports
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   type:
 *                     type: string
 *                   description:
 *                     type: string
 *                   status:
 *                     type: string
 *                   assigned_team:
 *                     type: string
 *                   geom:
 *                     type: string
 */
app.get("/reports", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT id,type,description,status,assigned_team,ST_AsGeoJSON(geom) AS geom FROM reports"
  );
  res.json(result.rows);
});

// ADD REPORT (USER)
// ADD REPORT (USER)
/**
 * @swagger
 * /reports:
 *   post:
 *     summary: Create a new report (User only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - description
 *               - lat
 *               - lng
 *             properties:
 *               type:
 *                 type: string
 *               description:
 *                 type: string
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *     responses:
 *       200:
 *         description: Report added
 *       403:
 *         description: Forbidden
 */
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
// GET TEAMS (MANAGER)
/**
 * @swagger
 * /teams:
 *   get:
 *     summary: Get all teams (Manager only)
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of teams
 *       403:
 *         description: Forbidden
 */
app.get("/teams", auth, async (req, res) => {
  if (req.user.role !== "manager") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const result = await pool.query("SELECT * FROM teams ORDER BY id");
  res.json(result.rows);
});

// ASSIGN TEAM (MANAGER)
// ASSIGN TEAM (MANAGER)
/**
 * @swagger
 * /reports/{id}/assign:
 *   put:
 *     summary: Assign a team to a report (Manager only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - team
 *             properties:
 *               team:
 *                 type: string
 *     responses:
 *       200:
 *         description: Team assigned
 *       403:
 *         description: Forbidden
 */
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
// UPDATE STATUS (WORKER)
/**
 * @swagger
 * /reports/{id}/status:
 *   put:
 *     summary: Update report status (Worker only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 *       403:
 *         description: Forbidden
 */
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
/* ===================== DELETE (MANAGER) ===================== */
/**
 * @swagger
 * /reports/{id}:
 *   delete:
 *     summary: Delete a report (Manager only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted
 *       403:
 *         description: Forbidden
 */
app.delete("/reports/:id", auth, async (req, res) => {
  if (req.user.role !== "manager") {
    return res.status(403).json({ error: "Forbidden" });
  }

  await pool.query("DELETE FROM reports WHERE id=$1", [req.params.id]);
  res.json({ message: "Deleted" });
});

/* ===================== START ===================== */
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

