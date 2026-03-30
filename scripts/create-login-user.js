const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { randomBytes, scryptSync } = require('crypto');

function parseEnvValue(rawValue) {
  let value = rawValue.trim();

  if (value.startsWith('\\"') && value.endsWith('\\"')) {
    value = value.slice(2, -2);
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return value;
}

function readEnvVar(key) {
  const envPath = path.join(process.cwd(), '.env');
  const envRaw = fs.readFileSync(envPath, 'utf8');

  for (const line of envRaw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    if (match[1] !== key) continue;
    return parseEnvValue(match[2]);
  }

  return null;
}

const AccountSchema = new mongoose.Schema(
  {
    name: String,
    tier: String,
    billingPlan: String,
    trialEndsAt: Date,
    subscriptionEndsAt: Date,
    setupComplete: Boolean,
    isActive: Boolean,
    onboardingNotes: String,
    subscriptionActivatedAt: Date,
    subscriptionActivatedByUserId: String,
    subscriptionExternalRef: String,
    subscriptionNotes: String,
    permissions: [String],
  },
  { timestamps: true },
);

const UserSchema = new mongoose.Schema(
  {
    phone: { type: String, unique: true, index: true },
    passwordHash: String,
    passwordSalt: String,
    role: String,
    accountTier: String,
    accountId: mongoose.Schema.Types.ObjectId,
    isActive: Boolean,
    name: String,
    lastLoginAt: Date,
    pushTokens: [
      {
        token: String,
        platform: String,
        deviceId: String,
        appVersion: String,
        isActive: Boolean,
        lastSeenAt: Date,
        createdAt: Date,
        updatedAt: Date,
      },
    ],
  },
  { timestamps: true },
);

const Account = mongoose.model('Account', AccountSchema, 'accounts');
const User = mongoose.model('User', UserSchema, 'users');

async function main() {
  const mongoUri = readEnvVar('MONGO_URI');
  if (!mongoUri) {
    throw new Error('MONGO_URI missing in .env');
  }

  const phone = '+573336083033';
  const password = 'abcd.1234';

  await mongoose.connect(mongoUri);

  const existing = await User.findOne({ phone }).lean().exec();
  if (existing) {
    console.log('USER_EXISTS', phone);
    await mongoose.disconnect();
    return;
  }

  const account = await Account.create({
    name: phone,
    tier: 'STARTER',
    billingPlan: 'FREE',
    setupComplete: false,
    isActive: true,
    permissions: [],
  });

  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = scryptSync(password, passwordSalt, 64).toString('hex');

  const user = await User.create({
    phone,
    passwordHash,
    passwordSalt,
    role: 'ADMIN',
    accountTier: 'STARTER',
    accountId: account._id,
    isActive: true,
    name: 'Admin',
  });

  console.log('USER_CREATED', phone, user._id.toString());
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
