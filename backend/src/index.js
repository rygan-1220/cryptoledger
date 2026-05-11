require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const redisClient = require("./config/redis");

const authRoutes      = require('./routes/auth.routes');
const departmentRoutes = require('./routes/departments.routes');
const expenseRoutes   = require('./routes/expenses.routes');
const sessionKeyRoutes = require('./routes/sessionKeys.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const integrityRoutes = require('./routes/integrity.routes');
const auditLogRoutes  = require('./routes/auditLogs.routes');

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));
app.use(morgan("dev"));

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET || "your_session_secret_here_min_32_chars",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 // 1 hour
    }
  })
);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use('/api/auth',         authRoutes);
app.use('/api/departments',  departmentRoutes);
app.use('/api/expenses',     expenseRoutes);
app.use('/api/session-keys', sessionKeyRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/integrity',    integrityRoutes);
app.use('/api/audit-logs',   auditLogRoutes);

app.listen(port, () => {
  console.log(`CryptoLedger API listening on ${port}`);
});
