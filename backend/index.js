const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const speedTest = require("speedtest-net");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app, {
  cors: {
    origin: "*",
  },
});
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

mongoose.connect(
  "mongodb+srv://alencolins:sanket@speedometer.wcz3yw2.mongodb.net/?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const speedSchema = new mongoose.Schema(
  {
    value: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Speed = mongoose.model("Speed", speedSchema);

io.on("connection", (socket) => {
  console.log("Client connected");

  const performSpeedTest = () => {
    speedTest()
      .then((data) => {
        const internetSpeed = data.speeds.download;
        Speed.create({ value: internetSpeed }).then((speedData) => {
          io.emit("speedUpdate", speedData.value);
        });
      })
      .catch((error) => {
        console.error("Speed test error:", error.message);

        // If speed test fails, emit a random number for demonstration
        const randomSpeed = Math.random() * 100;
        io.emit("speedUpdate", randomSpeed);
      });
  };

  // Perform speed test or emit random speed every 5 seconds
  const speedTestInterval = setInterval(performSpeedTest, 5000);

  // Stop the interval when the client disconnects
  socket.on("disconnect", () => {
    console.log("Client disconnected");
    clearInterval(speedTestInterval);
  });
});

app.get("/api/speed", async (req, res) => {
  try {
    const latestSpeed = await Speed.findOne().sort({ createdAt: -1 });
    res.json({ speed: latestSpeed ? latestSpeed.value : null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
