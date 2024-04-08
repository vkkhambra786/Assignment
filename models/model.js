const mongoose = require("mongoose");

const AgentSchema = new mongoose.Schema({
  agentName: String,
});
const UserSchema = new mongoose.Schema({
  firstName: String,
  dob: String,
  address: String,
  phoneNumber: String,
  state: String,
  zipCode: String,
  email: String,
  gender: String,
  userType: String,
});
const UserAccountSchema = new mongoose.Schema({
  accountName: String,
});
const PolicyCategorySchema = new mongoose.Schema({
  categoryName: String,
});
const PolicyCarrierSchema = new mongoose.Schema({
  companyName: String,
});
const PolicyInfoSchema = new mongoose.Schema({
  policyNumber: String,
  policyStartDate: { type: Date, required: false },
  policyEndDate: { type: Date, required: false },
  policyCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PolicyCategory",
  },
  company: { type: mongoose.Schema.Types.ObjectId, ref: "PolicyCarrier" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

// Create Mongoose models for each schema
const Agent = mongoose.model("Agent", AgentSchema);
const User = mongoose.model("User", UserSchema);
const UserAccount = mongoose.model("UserAccount", UserAccountSchema);
const PolicyCategory = mongoose.model("PolicyCategory", PolicyCategorySchema);
const PolicyCarrier = mongoose.model("PolicyCarrier", PolicyCarrierSchema);
const PolicyInfo = mongoose.model("PolicyInfo", PolicyInfoSchema);

module.exports = {
  Agent,
  User,
  UserAccount,
  PolicyCategory,
  PolicyCarrier,
  PolicyInfo,
};
