const express = require("express");
const app = express();
const mongoose = require("mongoose");
const router = require("./routes/book_route");
const cors = require("cors");
const promClient = require('prom-client');
require('dotenv').config();
const morgan = require('morgan');

// Prometheus Metrics
const httpRequestCounter = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status_code'],
});

const requestDurationHistogram = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'path', 'status_code'],
    buckets: [0.1, 0.5, 1, 5, 10], // Buckets for the histogram in seconds
});

const requestDurationSummary = new promClient.Summary({
    name: 'http_request_duration_summary_seconds',
    help: 'Summary of the duration of HTTP requests in seconds',
    labelNames: ['method', 'path', 'status_code'],
    percentiles: [0.5, 0.9, 0.99],
});

const gauge = new promClient.Gauge({
    name: 'node_gauge_example',
    help: 'Example of a gauge tracking async task duration',
    labelNames: ['method', 'status']
});

// Middleware for Metrics Collection
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000; // Duration in seconds
        const { method, url } = req;
        const statusCode = res.statusCode;
        httpRequestCounter.labels({ method, path: url, status_code: statusCode }).inc();
        requestDurationHistogram.labels({ method, path: url, status_code: statusCode }).observe(duration);
        requestDurationSummary.labels({ method, path: url, status_code: statusCode }).observe(duration);
    });
    next();
});

// Middleware: JSON body parsing & CORS
app.use(express.json());
app.use(cors());
app.use(morgan('combined'));  // HTTP request logging

// Routes
app.use("/api/books", router);

// Prometheus Metrics Endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
});

// MongoDB Connection and Server Startup
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(5000, () => {
        console.log("Server is running on port 5000");
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1); // Exit the process if DB connection fails
  });

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    res.status(500).send('Something went wrong!');
});


// 54:00 now Backend is complete
// you have to also install cors to block the security
