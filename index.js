const express = require("express");
const multer = require("multer");
const csvParser = require("csv-parser");
const mongoose = require("mongoose");
const fs = require("fs");
const moment = require("moment");
const { isNull } = require("util");
const app = express();
const port = 3000;
const { MongoNetworkTimeoutError } = require("mongodb");
let insertionComplete = false;
const {
  Agent,
  User,
  UserAccount,
  PolicyCategory,
  PolicyCarrier,
  PolicyInfo,
} = require("./models/model");
const uri =
  "mongodb+srv://vkkhambra786:gmsAhQMAZXLAMv11@cluster0.umaontj.mongodb.net/insurance_database?retryWrites=true&w=majority";

async function connectToDatabase() {
  try {
    await mongoose.connect(uri, {
      //bufferCommands: false,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 45000,

      //bufferTimeoutMS: 30000,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

async function main() {
  await connectToDatabase();
  // await performDatabaseOperations();
}

main();

const csvFilePath = "./uploads/data-sheet.csv";
fs.createReadStream(csvFilePath)
  .pipe(csvParser())
  .on("data", async (row) => {
    let parsedDate;

    if (!insertionComplete) {
      const parseDate = (dateString) => {
        if (!dateString || dateString.trim() === "") {
          return null;
        }

        const parsedDate = new Date(dateString);
        if (isNaN(parsedDate.getTime())) {
          console.log("Invalid date string:", dateString);
          return null;
        }

        const formattedDate = parsedDate.toISOString().split("T")[0];

        return formattedDate;
      };

      parsedDate = parseDate(row["dob"]);

      try {
        const agent = new Agent({ agentName: row["Agent Name"] });

        const dob = parseDate(row["dob"]); // Parse the date and store it in a variable

        const user = new User({
          firstName: row["first name"],
          dob: parsedDate, // dob, // moment(dob).format("YYYY-MM-DD"), //dob, // parseDate(row["DOB"]), // row["dob"] ? new Date(row["dob"]) : null,
          address: row["address"],
          phoneNumber: row["phone number"],
          state: row["state"],
          zipCode: row["zip code"],
          email: row["email"],
          gender: row["gender"],
          userType: row["userType"],
        });
        // console.log("User data:", user);
        const userAccount = new UserAccount({
          accountName: row["Account Name"],
        });
        const policyCategory = new PolicyCategory({
          categoryName: row["category_name"],
        });
        const policyCarrier = new PolicyCarrier({
          companyName: row["company_name"],
        });

        const policyStartDate = parseDate(row["policy_start_date"]); // Parse the date and store it in a variable
        // console.log("policyStartDate:", policyStartDate);
        const policyEndDate = parseDate(row["policy_end_date"]); // Parse the date and store it in a variable
        // console.log("policyEndDate:", policyEndDate);
        const policyInfo = new PolicyInfo({
          policyNumber: row["policy number"],
          policyStartDate: policyStartDate, // parseDate(row["policy start date"]),
          policyEndDate: policyEndDate, // parseDate(row["policy end date"]),
          policyCategory: policyCategory._id,
          company: policyCarrier._id,
          user: user._id,
        });

        // Save documents to MongoDB
        try {
          // Save documents to MongoDB
          await Promise.all([
            agent.save(),
            user.save(),
            userAccount.save(),
            policyCategory.save(),
            policyCarrier.save(),
            policyInfo.save(),
          ]);
        } catch (error) {
          console.error("Error saving documents:", error);
        }
      } catch (error) {
        console.error("Error saving documents:", error);
      }
    }
  })
  .on("error", (error) => {
    console.error("Error parsing CSV:", error);
  })
  .on("end", async (row) => {
    if (!insertionComplete) {
      console.log("CSV parsing completed");
      console.log("Row data:", row);
      insertionComplete = true; // Set flag to true once all rows are processed
      console.log("CSV file successfully processed");
    }
  });

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error);
});
const cache = {};

app.get("/search/:email", async (req, res) => {
  const email = req.params.email.trim();

  const cachedUser = cache[email];
  if (cachedUser) {
    return res.json({ message: "User found in cache", data: cachedUser });
  }

  try {
    const user = await User.findOne({ email: email }).lean().exec();
    if (!user) {
      console.log("User not found for email:", email);
      return res.status(404).json({ message: "User not found" });
    }
    cache[email] = user;
    const policyInfo = await PolicyInfo.findOne({ user: user._id })
      .populate({ path: "policyCategory", select: "categoryName" })
      .populate({ path: "company", select: "companyName" })
      .lean()
      .exec();

    if (!policyInfo) {
      console.log("Policy info not found for user:", user);
      return res.status(404).json({ message: "Policy info not found" });
    }

    // Return user data and policy info
    res.json({
      message: "Policy info found successfully",
      data: {
        user: user,
        policyInfo: policyInfo,
      },
    });
  } catch (error) {
    console.error("Error searching for user:", error);
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  }
});

app.get("/aggregated-policy", async (req, res) => {
  try {
    // Define aggregation pipeline
    const pipeline = [
      {
        $lookup: {
          from: "policyinfos",
          localField: "_id",
          foreignField: "user",
          as: "policies",
        },
      },
      {
        $lookup: {
          from: "policycategories",
          localField: "policies.policyCategory",
          foreignField: "_id",
          as: "policyCategories",
        },
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          email: 1,
          policyCount: { $size: "$policies" },
          totalPremium: { $sum: "$policies.premiumAmount" },
          policyCategories: "$policyCategories.categoryName",
          // Add more fields as needed for aggregation
        },
      },
      { $limit: 100 },
    ];

    const options = { maxTimeMS: 10000 };

    const aggregatedPolicyData = await User.aggregate(pipeline).option(options);

    // Return aggregated policy data
    res.json({ success: true, data: aggregatedPolicyData });
  } catch (error) {
    console.error("Error aggregating policy data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

app.listen(3000, "localhost", () => {
  console.log("server is runing at port 3000");
});
