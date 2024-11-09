const express = require("express");
const app = express();
const mongoose = require("mongoose");
const router = require("./routes/book_route");
const cors = require("cors");
const promClient = require('prom-client');
require('dotenv').config();
//  Rkh60h9mUYo9NWEx password.

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
    percentiles: [0.5, 0.9, 0.99], // Define your percentiles here
});



// Gauge metric
const gauge = new promClient.Gauge({
    name: 'node_gauge_example',
    help: 'Example of a gauge tracking async task duration',
    labelNames: ['method', 'status']
});

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000; // Duration in seconds
        const { method, url } = req;
        const statusCode = res.statusCode; // Get the actual HTTP status code
        httpRequestCounter.labels({ method, path: url, status_code: statusCode }).inc();
        requestDurationHistogram.labels({ method, path: url, status_code: statusCode }).observe(duration);
        requestDurationSummary.labels({ method, path: url, status_code: statusCode }).observe(duration);
    });
    next();
});

// middleware section
// Now we dont need because i create router.
// app.use("/", (req, resp, next) => {
//   resp.send("This is Starting Application");
// });
app.use(express.json()); // it convert all the data to the json very !IMPORTANT and it intialize at the top (rule)
app.use(cors());
app.use("/api/books", router); // localhost:5000/books all the things handle in our (router). now to check run on postman localhost:5000/books.

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
});

mongoose
  .connect(
    process.env.MONGO_URL )
  .then(() => console.log("connected DataBase"))
  .then(() => {
    app.listen(5000);
  })
  .catch((err) => console.log(err));

// 54:00 now Backend is complete
// you have to also install cors to block the security
