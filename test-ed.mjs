// ED API test - Using BlocksDirecte format (Papillon's library)

const API_VERSION = '7.8.2';
const USER_AGENT = `BlocksDirecte/1.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 EDMOBILE v${API_VERSION}`;
const BASE_URL = 'https://api.ecoledirecte.com';

const CREDS = {
  identifiant: "YOUR_USERNAME",
  motdepasse: "YOUR_PASSWORD",
};

// Test 1: Exact BlocksDirecte format (URLSearchParams + mobile UA + version)
console.log("=== Test 1: BlocksDirecte format ===");
const body1 = new URLSearchParams({ data: JSON.stringify(CREDS) }).toString();
console.log('Body:', body1.substring(0, 100));
const res1 = await fetch(`${BASE_URL}/v3/login.awp?v=${API_VERSION}`, {
  method: 'POST',
  body: body1,
  headers: {
    'Content-Type': 'x-www-form-urlencoded',
    'User-Agent': USER_AGENT,
  },
  redirect: 'manual',
});
const json1 = await res1.json();
console.log('Code:', json1.code, 'Message:', json1.message);
console.log('Token:', json1.token ? json1.token.substring(0, 40) + '...' : 'none');
if (json1.code === 250) {
  console.log('>>> 2FA NEEDED!');
  console.log('Data:', JSON.stringify(json1.data, null, 2).substring(0, 500));
}
if (json1.code === 200) {
  console.log('>>> SUCCESS!');
  const acct = json1.data?.accounts?.[0];
  console.log('Account:', acct?.prenom, acct?.nom, acct?.typeCompte);
}

// Test 2: Same but with application/ prefix on content-type
console.log("\n=== Test 2: With application/ prefix ===");
const res2 = await fetch(`${BASE_URL}/v3/login.awp?v=${API_VERSION}`, {
  method: 'POST',
  body: new URLSearchParams({ data: JSON.stringify(CREDS) }).toString(),
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': USER_AGENT,
  },
  redirect: 'manual',
});
const json2 = await res2.json();
console.log('Code:', json2.code, 'Message:', json2.message);
console.log('Token:', json2.token ? json2.token.substring(0, 40) + '...' : 'none');
if (json2.code === 250) {
  console.log('>>> 2FA NEEDED!');
  console.log('Data:', JSON.stringify(json2.data, null, 2).substring(0, 500));
}

// Test 3: Check login response headers + cookies
console.log("\n=== Test 3: Debug login response headers ===");
const freshLogin = await fetch(`${BASE_URL}/v3/login.awp?v=${API_VERSION}`, {
  method: 'POST',
  body: new URLSearchParams({ data: JSON.stringify(CREDS) }).toString(),
  headers: { 'Content-Type': 'x-www-form-urlencoded', 'User-Agent': USER_AGENT },
});
console.log('Status:', freshLogin.status);
console.log('Headers:');
for (const [k, v] of freshLogin.headers.entries()) {
  console.log(`  ${k}: ${v}`);
}
const freshJson = await freshLogin.json();
console.log('Token:', freshJson.token);
console.log('Code:', freshJson.code);
console.log('All keys:', Object.keys(freshJson));
console.log('Full response:', JSON.stringify(freshJson, null, 2).substring(0, 2000));

// Test 3: Use the 2FA-Token header from login response
console.log("\n=== Test 3: Using 2FA-Token header ===");
const twoFAToken = freshLogin.headers.get('2fa-token');
const xToken = freshLogin.headers.get('x-token');
console.log('Body token:', freshJson.token);
console.log('2FA-Token header:', twoFAToken);
console.log('X-Token header:', xToken);

if (twoFAToken) {
  // Method A: 2FA-Token header from login response → 2FA GET
  console.log("\n--- A: 2FA-Token header ---");
  const resA = await fetch(`${BASE_URL}/v3/connexion/doubleauth.awp?verbe=get&v=${API_VERSION}`, {
    method: 'POST',
    body: new URLSearchParams({ data: JSON.stringify({}) }).toString(),
    headers: {
      'Content-Type': 'x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
      '2FA-Token': twoFAToken,
    },
  });
  const jsonA = await resA.json();
  console.log('Code:', jsonA.code, 'Msg:', jsonA.message);
  if (jsonA.data?.question) console.log('>>> QUESTION:', jsonA.data.question);
  if (jsonA.data?.propositions) console.log('>>> PROPOSITIONS:', jsonA.data.propositions);
  console.log('Full:', JSON.stringify(jsonA, null, 2).substring(0, 1000));

  // Method B: Both 2FA-Token and X-Token
  console.log("\n--- B: 2FA-Token + X-Token ---");
  const resB = await fetch(`${BASE_URL}/v3/connexion/doubleauth.awp?verbe=get&v=${API_VERSION}`, {
    method: 'POST',
    body: new URLSearchParams({ data: JSON.stringify({}) }).toString(),
    headers: {
      'Content-Type': 'x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
      '2FA-Token': twoFAToken,
      'X-Token': xToken || freshJson.token,
    },
  });
  const jsonB = await resB.json();
  console.log('Code:', jsonB.code, 'Msg:', jsonB.message);
  if (jsonB.data?.question) console.log('>>> QUESTION:', jsonB.data.question);
  if (jsonB.data?.propositions) console.log('>>> PROPOSITIONS:', jsonB.data.propositions);
  console.log('Full:', JSON.stringify(jsonB, null, 2).substring(0, 1000));
}

console.log("\nDone.");
const json = await res.json();
console.log('Code:', json.code);
console.log('Message:', json.message);
console.log('Token:', json.token ? json.token.substring(0, 20) + '...' : 'none');
if (json.data) {
  console.log('Data keys:', Object.keys(json.data));
  if (json.data.accounts) {
    console.log('Accounts:', json.data.accounts.length);
    if (json.data.accounts[0]) {
      const a = json.data.accounts[0];
      console.log('Account:', a.prenom, a.nom, '- type:', a.typeCompte);
    }
  }
  if (json.data.question) console.log('2FA Question:', json.data.question);
}
console.log('\nFull response (truncated):', JSON.stringify(json, null, 2).substring(0, 2000));
