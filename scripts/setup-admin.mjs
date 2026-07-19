/**
 * Setup Admin Script
 * 
 * 1. Enables Email/Password auth provider via Google Identity Toolkit API
 * 2. Creates a new Firebase Auth user
 * 3. Adds the user's email to the 'admins' Firestore collection
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';

// ============ CONFIGURATION ============
const PROJECT_ID = 'ffsstore-b04c0';
const NEW_ADMIN_EMAIL = 'shivambhatt@admin.com';
const NEW_ADMIN_PASSWORD = 'aman6969';
const NEW_ADMIN_DISPLAY_NAME = 'Shivam Bhatt (Admin)';
const API_KEY = 'AIzaSyAJRdTnP3jtgj2_mvSBcz1DgxIckr9ntbg';

// ============ HELPERS ============

function httpsRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken(refreshToken) {
  // Exchange refresh token for access token
  // Using Firebase's OAuth client ID (public)
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
  }).toString();

  const res = await httpsRequest({
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    }
  }, body);

  if (res.data.access_token) {
    return res.data.access_token;
  }
  throw new Error('Failed to get access token: ' + JSON.stringify(res.data));
}

// Step 1: Enable Email/Password auth
async function enableEmailPasswordAuth(accessToken) {
  console.log('\n🔧 Step 1: Enabling Email/Password Auth Provider...');
  
  // First get current config
  const getRes = await httpsRequest({
    hostname: 'identitytoolkit.googleapis.com',
    path: `/admin/v2/projects/${PROJECT_ID}/config`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  });

  if (getRes.status !== 200) {
    console.log('⚠️  Could not fetch current config, trying to set directly...');
  }

  // Now enable email/password
  const patchBody = JSON.stringify({
    signIn: {
      email: {
        enabled: true,
        passwordRequired: true,
      }
    }
  });

  const patchRes = await httpsRequest({
    hostname: 'identitytoolkit.googleapis.com',
    path: `/admin/v2/projects/${PROJECT_ID}/config?updateMask=signIn.email`,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(patchBody),
    }
  }, patchBody);

  if (patchRes.status === 200) {
    console.log('✅ Email/Password Auth Provider enabled successfully!');
    return true;
  } else {
    console.log('⚠️  Status:', patchRes.status);
    console.log('Response:', JSON.stringify(patchRes.data, null, 2));
    
    // Try alternative API
    console.log('\n🔄 Trying alternative Identity Toolkit v1 API...');
    
    const altBody = JSON.stringify({
      allowPasswordSignup: true,
      enableEmailLinkSignin: false,
    });

    const altRes = await httpsRequest({
      hostname: 'www.googleapis.com',
      path: `/identitytoolkit/v2/projects/${PROJECT_ID}/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(altBody),
      }
    }, altBody);

    if (altRes.status === 200) {
      console.log('✅ Email/Password Auth Provider enabled via alternative API!');
      return true;
    }
    
    console.log('❌ Could not enable via API. Status:', altRes.status);
    console.log('You may need to enable it manually in Firebase Console.');
    console.log('URL: https://console.firebase.google.com/project/ffsstore-b04c0/authentication/providers');
    return false;
  }
}

// Step 2: Create Firebase Auth user  
async function createAuthUser(accessToken) {
  console.log('\n👤 Step 2: Creating Firebase Auth User...');
  console.log(`   Email: ${NEW_ADMIN_EMAIL}`);
  console.log(`   Display Name: ${NEW_ADMIN_DISPLAY_NAME}`);

  const body = JSON.stringify({
    email: NEW_ADMIN_EMAIL,
    password: NEW_ADMIN_PASSWORD,
    displayName: NEW_ADMIN_DISPLAY_NAME,
    emailVerified: true,
  });

  const res = await httpsRequest({
    hostname: 'identitytoolkit.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/accounts`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }
  }, body);

  if (res.status === 200 && res.data.localId) {
    console.log('✅ User created successfully! UID:', res.data.localId);
    return res.data.localId;
  } else if (res.data?.error?.message === 'EMAIL_EXISTS') {
    console.log('⚠️  User already exists. Getting their UID...');
    
    // Look up the user
    const lookupBody = JSON.stringify({
      email: [NEW_ADMIN_EMAIL]
    });
    const lookupRes = await httpsRequest({
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/accounts:lookup`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(lookupBody),
      }
    }, lookupBody);

    if (lookupRes.data?.users?.[0]?.localId) {
      console.log('✅ Found existing user UID:', lookupRes.data.users[0].localId);
      return lookupRes.data.users[0].localId;
    }
    
    console.log('Could not find user. Response:', JSON.stringify(lookupRes.data));
    return null;
  } else {
    console.log('❌ Failed to create user. Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));
    return null;
  }
}

// Step 3: Add to admins collection in Firestore
async function addToAdminsCollection(accessToken) {
  console.log('\n📋 Step 3: Adding to Firestore admins collection...');
  
  const cleanEmail = NEW_ADMIN_EMAIL.trim().toLowerCase();
  const docId = cleanEmail;
  
  const body = JSON.stringify({
    fields: {
      email: { stringValue: cleanEmail },
      role: { stringValue: 'admin' },
      addedAt: { timestampValue: new Date().toISOString() },
      addedBy: { stringValue: 'setup-script' },
    }
  });

  const res = await httpsRequest({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/admins/${docId}`,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }
  }, body);

  if (res.status === 200) {
    console.log(`✅ Added "${cleanEmail}" to admins collection!`);
    return true;
  } else {
    console.log('❌ Failed to add to admins. Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));
    return false;
  }
}

// ============ MAIN ============
async function main() {
  console.log('🚀 Firebase Admin Setup Script');
  console.log('================================');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`New Admin: ${NEW_ADMIN_EMAIL}`);
  console.log('================================\n');

  // Read Firebase CLI refresh token
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(configPath)) {
    console.error('❌ Firebase CLI config not found. Please run: firebase login');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const refreshToken = config.tokens?.refresh_token;
  
  if (!refreshToken) {
    console.error('❌ No refresh token found. Please run: firebase login');
    process.exit(1);
  }

  console.log('🔑 Getting access token from Firebase CLI credentials...');
  const accessToken = await getAccessToken(refreshToken);
  console.log('✅ Access token obtained!\n');

  // Step 1: Enable Email/Password Auth
  await enableEmailPasswordAuth(accessToken);

  // Step 2: Create Auth User
  const uid = await createAuthUser(accessToken);

  // Step 3: Add to admins collection
  await addToAdminsCollection(accessToken);

  console.log('\n================================');
  console.log('🎉 Setup Complete!');
  console.log('================================');
  console.log(`\nNew admin can now log in to https://ffsstorebyshiv.web.app with:`);
  console.log(`  Email:    ${NEW_ADMIN_EMAIL}`);
  console.log(`  Password: ${NEW_ADMIN_PASSWORD}`);
  console.log(`\nAfter login, they can access the Admin Panel to generate API keys.`);
}

main().catch(console.error);
