const cors = require("cors");
const express = require("express");
const fs = require("fs");
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json()); // Parse JSON requests

// Serve HTML and CSS files from the "public" directory
app.use(express.static("ui"));

app.post("/", (req, res) => {
  console.log("POST REQ ACCEPTED");
  fs.writeFile(
    "./ui/IO/output.json",
    JSON.stringify(req.body, null, 2),
    "utf8",
    (err) => {
      if (err) {
        console.log("Error writing file", err);
        res.status(500).send("An error occurred on the server.");
      } else {
        console.log("Successfully wrote to output.json");
        res.status(200).send("Data successfully updated.");
      }
    }
  );
});

app.post("/lock", (req, res) => {
  console.log("LOCK REQ ACCEPTED");
  console.log("Received data:", req.body);

  try {
    // Read the existing lock data
    const existingLockData = fs.readFileSync("./ui/IO/lock.json", "utf8");

    // Parse the existing data
    let lockData = JSON.parse(existingLockData);

    // Update the lock data with the new values
    lockData = {
      ...lockData,
      ...req.body,
    };

    // Stringify the updated lock data
    const stringData = JSON.stringify(lockData, null, 2);

    // Write the updated data back to the file
    fs.writeFileSync("./ui/IO/lock.json", stringData);

    console.log("Successfully wrote to lock.json");
    res.status(200).send("Data successfully updated.");
  } catch (error) {
    console.error("Error writing file:", error.message);
    console.error("Error stack:", error.stack);
    res
      .status(500)
      .send("Internal Server Error: An error occurred on the server.");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
