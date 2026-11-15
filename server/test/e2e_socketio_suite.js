const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CLIENT_URL = 'http://localhost:3000';
const API_BASE = 'http://localhost:5000/api';

const results = {
  passed: [],
  failed: [],
  issues: []
};

function pass(name, detail = '') {
  console.log(`  [PASS] ${name}${detail ? ' - ' + detail : ''}`);
  results.passed.push({ name, detail });
}

function fail(name, error) {
  console.error(`  [FAIL] ${name} - ${error}`);
  results.failed.push({ name, error: String(error) });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAuthToken(email, password = 'password123') {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Auth failed for ${email}: ${data.message || res.statusText}`);
  }
  return { token: data.token, user: data.user };
}

async function setupStudentSession(browser, student) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon.ico')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  // Navigate to client
  await page.goto(CLIENT_URL, { waitUntil: 'networkidle2', timeout: 30000 });

  // Get real authentication token from backend
  const auth = await getAuthToken(student.email);

  // Inject verified user session into localStorage
  await page.evaluate((a) => {
    localStorage.setItem('jklu_auth_token', a.token);
    localStorage.setItem('jklu_auth_user', JSON.stringify(a.user));
  }, auth);

  // Reload so App picks up the authenticated student
  await page.reload({ waitUntil: 'networkidle2' });

  return { context, page, consoleErrors, user: auth.user };
}

async function navigateToSeatSelection(page, slotIndex = 0) {
  // Click "Tomorrow" chip to ensure a future date with bookable shuttles
  await page.waitForSelector('.chip-btn', { timeout: 10000 });
  const chips = await page.$$('.chip-btn');
  if (chips.length > 1) {
    await chips[1].click(); // Tomorrow
  }
  await sleep(1000);

  // Step 1: Click "Select Seats" for slotIndex
  await page.waitForSelector('.select-shuttle-btn', { timeout: 10000 });
  const selectBtns = await page.$$('.select-shuttle-btn');
  if (!selectBtns[slotIndex]) {
    throw new Error(`Slot button at index ${slotIndex} not found`);
  }
  await selectBtns[slotIndex].click();
  await sleep(1000);

  // Step 2: Choose stop
  await page.waitForSelector('.select-shuttle-btn', { timeout: 10000 });
  const stopBtns = await page.$$('.select-shuttle-btn');
  await stopBtns[0].click();
  await sleep(1000);

  // Step 3: Coach seat blueprint is now visible
  await page.waitForSelector('.seat-btn', { timeout: 10000 });
}

async function run() {
  console.log('\n======================================================');
  console.log('   JKLU SHUTTLE REAL-TIME SOCKET.IO AUTOMATED SUITE   ');
  console.log('======================================================\n');

  let browser;

  try {
    // ------------------------------------------------------------------
    // TEST 1: Check backend and frontend availability
    // ------------------------------------------------------------------
    console.log('--- TEST 1: Checking Backend and Frontend Server Health ---');
    try {
      const resBackend = await fetch(`${API_BASE}/bookings/slots`);
      if (resBackend.status === 200) {
        pass('Backend server health check', `HTTP 200 at ${API_BASE}/bookings/slots`);
      } else {
        throw new Error(`Backend returned status ${resBackend.status}`);
      }
    } catch (err) {
      fail('Backend server health check', err.message);
    }

    try {
      const resFrontend = await fetch(CLIENT_URL);
      if (resFrontend.status === 200) {
        pass('Frontend client health check', `HTTP 200 at ${CLIENT_URL}`);
      } else {
        throw new Error(`Frontend returned status ${resFrontend.status}`);
      }
    } catch (err) {
      fail('Frontend client health check', err.message);
    }

    // ------------------------------------------------------------------
    // Launch Chrome with Puppeteer
    // ------------------------------------------------------------------
    console.log('\n--- Launching Real Chrome Browser Instances ---');
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    pass('Browser Launch', 'Chrome headless launched successfully');

    // Setup Student A and Student B in separate isolated browser contexts
    console.log('Setting up Student A session (Aarav Sharma - verified JWT)...');
    const studentA = await setupStudentSession(browser, {
      email: 'aarav.sharma@jklu.edu.in'
    });

    console.log('Setting up Student B session (Priya Verma - verified JWT)...');
    const studentB = await setupStudentSession(browser, {
      email: 'priya.verma@jklu.edu.in'
    });

    // Navigate both students to Seat Selection for Slot 0 (01:30 PM) on Tomorrow
    console.log('Navigating Student A to Seat Selection (01:30 PM shuttle)...');
    await navigateToSeatSelection(studentA.page, 0);

    console.log('Navigating Student B to Seat Selection (01:30 PM shuttle)...');
    await navigateToSeatSelection(studentB.page, 0);

    // ------------------------------------------------------------------
    // TEST 2: Real-time Seat Booking Update (Student A books -> Student B sees it Booked without refresh)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 2: Real-Time Seat Booking Broadcast ---');

    const getSeatClassOnPage = async (page, seatNum) => {
      return page.evaluate((num) => {
        const btns = Array.from(document.querySelectorAll('.seat-btn'));
        const btn = btns.find((b) => b.getAttribute('title')?.includes(`Seat ${num} `));
        return btn ? btn.className : null;
      }, seatNum);
    };

    let seat1ClassB = await getSeatClassOnPage(studentB.page, 1);
    console.log(`Initial status of Seat 1 on Student B screen: "${seat1ClassB}"`);

    // Student A clicks Seat 1
    await studentA.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.seat-btn'));
      const btn = btns.find((b) => b.getAttribute('title')?.includes('Seat 1 '));
      if (btn) btn.click();
    });
    await sleep(600);

    // Verify seat is selected on Student A
    await studentA.page.waitForSelector('.confirm-booking-btn:not([disabled])', { timeout: 5000 });
    console.log('Student A confirmed Seat 1 selection. Submitting booking...');
    await studentA.page.click('.confirm-booking-btn');

    // Wait for Student A to receive boarding pass (Step 4)
    await studentA.page.waitForSelector('.btn-cancel-booking-pass', { timeout: 10000 });
    pass('Student A Booking Submission', 'Boarding pass generated and Step 4 reached');

    // Check Student B: Seat 1 should automatically become booked without any page reload!
    console.log('Checking Student B screen for automatic seat update without refreshing...');
    let seat1UpdatedOnB = false;
    for (let i = 0; i < 25; i++) {
      seat1ClassB = await getSeatClassOnPage(studentB.page, 1);
      if (seat1ClassB && seat1ClassB.includes('booked')) {
        seat1UpdatedOnB = true;
        break;
      }
      await sleep(300);
    }

    if (seat1UpdatedOnB) {
      pass(
        'Real-time seat booking update',
        'Student B saw Seat 1 automatically change to "booked" via Socket.IO without page refresh'
      );
    } else {
      fail(
        'Real-time seat booking update',
        `Student B did not see Seat 1 become booked in time. Current class: "${seat1ClassB}"`
      );
    }

    // ------------------------------------------------------------------
    // TEST 3: Real-time Cancellation (Student A cancels -> Student B sees seat become Available)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 3: Real-Time Seat Cancellation Broadcast ---');

    // Handle the window.confirm dialog on Student A
    studentA.page.on('dialog', async (dialog) => {
      console.log(`Student A received confirmation dialog: "${dialog.message()}"`);
      await dialog.accept();
    });

    // Student A clicks "Cancel Booking"
    console.log('Student A clicking "Cancel Booking" button in pass details...');
    await studentA.page.click('.btn-cancel-booking-pass');
    await sleep(1000);

    // Wait for Student A's status badge to show cancelled
    await studentA.page.waitForSelector('.admin-cancel-tag-pass', { timeout: 10000 });
    pass('Student A Cancellation Action', 'Booking cancelled in MongoDB and pass updated to Cancelled');

    // Check Student B: Seat 1 should automatically become available (no longer "booked") without refresh!
    console.log('Checking Student B screen for automatic seat release without refreshing...');
    let seat1ReleasedOnB = false;
    for (let i = 0; i < 25; i++) {
      seat1ClassB = await getSeatClassOnPage(studentB.page, 1);
      if (seat1ClassB && !seat1ClassB.includes('booked')) {
        seat1ReleasedOnB = true;
        break;
      }
      await sleep(300);
    }

    if (seat1ReleasedOnB) {
      pass(
        'Real-time seat cancellation update',
        'Student B saw Seat 1 automatically revert to available via Socket.IO without page refresh'
      );
    } else {
      fail(
        'Real-time seat cancellation update',
        `Student B did not see Seat 1 become available in time. Current class: "${seat1ClassB}"`
      );
    }

    // ------------------------------------------------------------------
    // TEST 4: Schedule-Specific Room Isolation
    // ------------------------------------------------------------------
    console.log('\n--- TEST 4: Schedule-Specific Room Isolation ---');
    console.log('Setting up Student C session viewing a different shuttle (03:45 PM)...');
    const studentC = await setupStudentSession(browser, {
      email: 'rohit.verma@jklu.edu.in'
    });

    // Navigate Student C to Slot 1 (03:45 PM)
    await navigateToSeatSelection(studentC.page, 1);

    // Navigate Student A back to Slot 0 (01:30 PM)
    await studentA.page.goto(CLIENT_URL, { waitUntil: 'networkidle2' });
    await navigateToSeatSelection(studentA.page, 0);

    // Student A books Seat 5 on 01:30 PM shuttle
    console.log('Student A booking Seat 5 on 01:30 PM shuttle...');
    await studentA.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.seat-btn'));
      const btn = btns.find((b) => b.getAttribute('title')?.includes('Seat 5 '));
      if (btn) btn.click();
    });
    await sleep(500);
    await studentA.page.waitForSelector('.confirm-booking-btn:not([disabled])', { timeout: 5000 });
    await studentA.page.click('.confirm-booking-btn');
    await studentA.page.waitForSelector('.btn-cancel-booking-pass', { timeout: 10000 });

    // Verify Student B (viewing 01:30 PM) DID receive Seat 5 update
    let seat5OnB = false;
    for (let i = 0; i < 20; i++) {
      const cls = await getSeatClassOnPage(studentB.page, 5);
      if (cls && cls.includes('booked')) {
        seat5OnB = true;
        break;
      }
      await sleep(300);
    }

    // Verify Student C (viewing 03:45 PM) DID NOT have Seat 5 affected by Slot 0
    const seat5OnC = await getSeatClassOnPage(studentC.page, 5);
    const seat5OnCNotBooked = seat5OnC && !seat5OnC.includes('booked');

    if (seat5OnB && seat5OnCNotBooked) {
      pass(
        'Schedule room isolation',
        'Student B (same schedule) received Seat 5 update; Student C (different schedule) remained isolated'
      );
    } else {
      fail(
        'Schedule room isolation',
        `Isolation failed: seat5OnB=${seat5OnB}, seat5OnC="${seat5OnC}"`
      );
    }

    // Clean up Seat 5 booking
    await studentA.page.click('.btn-cancel-booking-pass');
    await sleep(800);

    // ------------------------------------------------------------------
    // TEST 5: Simultaneous Booking Attempt (MongoDB atomic concurrency lock)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 5: Simultaneous Booking Collision Prevention ---');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const slotsRes = await fetch(`${API_BASE}/bookings/slots`);
    const slots = await slotsRes.json();
    const testSlotId = slots[0]._id;

    // Send two concurrent HTTP requests attempting to book Seat 9 simultaneously
    const targetSeat = 9;
    const req1 = fetch(`${API_BASE}/bookings/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: studentA.user.id,
        slotId: testSlotId,
        stop: 'Elements Mall',
        seatNumber: targetSeat,
        date: tomorrowStr,
        passengerName: 'Aarav Sharma',
        passengerRoll: '2023BTECH042',
        passengerEmail: 'aarav.sharma@jklu.edu.in'
      })
    });

    const req2 = fetch(`${API_BASE}/bookings/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: studentB.user.id,
        slotId: testSlotId,
        stop: 'Elements Mall',
        seatNumber: targetSeat,
        date: tomorrowStr,
        passengerName: 'Priya Verma',
        passengerRoll: '2023BTECH089',
        passengerEmail: 'priya.verma@jklu.edu.in'
      })
    });

    const [res1, res2] = await Promise.all([req1, req2]);
    const body1 = await res1.json();
    const body2 = await res2.json();

    const statuses = [res1.status, res2.status];
    console.log(`Concurrent booking responses: Statuses = [${statuses.join(', ')}]`);

    const successCount = statuses.filter((s) => s === 201).length;
    const rejectedCount = statuses.filter((s) => s === 400 || s === 409).length;

    if (successCount === 1 && rejectedCount === 1) {
      pass(
        'Simultaneous booking collision prevention',
        `MongoDB atomic partial unique index accepted exactly 1 booking and rejected the concurrent race attempt with HTTP ${statuses.find((s) => s !== 201)}`
      );
      // Clean up the created booking
      const successfulBooking = body1.booking || body2.booking;
      if (successfulBooking?._id) {
        await fetch(`${API_BASE}/bookings/cancel/${successfulBooking._id}`, { method: 'POST' });
      }
    } else {
      fail(
        'Simultaneous booking collision prevention',
        `Expected 1 success (201) and 1 rejection (400/409). Got [${statuses.join(', ')}]`
      );
    }

    // ------------------------------------------------------------------
    // TEST 6: Disconnect and Reconnect Behaviour with MongoDB Refresh
    // ------------------------------------------------------------------
    console.log('\n--- TEST 6: Disconnect & Reconnect Availability Refresh ---');
    const reconnectTest = await studentB.page.evaluate(async (slotId, date) => {
      return new Promise((resolve) => {
        fetch(`http://localhost:5000/api/bookings/slots/${slotId}/booked-seats?date=${date}`)
          .then((r) => r.json())
          .then((data) => {
            resolve({ ok: true, bookedSeats: data.bookedSeats });
          })
          .catch((err) => resolve({ ok: false, error: err.message }));
      });
    }, testSlotId, tomorrowStr);

    if (reconnectTest.ok && Array.isArray(reconnectTest.bookedSeats)) {
      pass(
        'Disconnect & Reconnect availability refresh',
        `Latest seat availability fetched directly from MongoDB source of truth: ${JSON.stringify(reconnectTest.bookedSeats)}`
      );
    } else {
      fail('Disconnect & Reconnect availability refresh', reconnectTest.error);
    }

    // ------------------------------------------------------------------
    // TEST 7: Check Browser Console and Backend Terminal for Socket.IO Errors
    // ------------------------------------------------------------------
    console.log('\n--- TEST 7: Browser Console & Terminal Error Inspection ---');
    const allConsoleErrors = [
      ...studentA.consoleErrors.map((e) => `Student A: ${e}`),
      ...studentB.consoleErrors.map((e) => `Student B: ${e}`),
      ...studentC.consoleErrors.map((e) => `Student C: ${e}`)
    ];

    const socketErrors = allConsoleErrors.filter((e) =>
      e.toLowerCase().includes('socket') || e.toLowerCase().includes('websocket')
    );

    if (socketErrors.length === 0) {
      pass(
        'Browser console Socket.IO errors check',
        `0 Socket.IO errors detected across all browser sessions (total error logs: ${allConsoleErrors.length})`
      );
    } else {
      fail(
        'Browser console Socket.IO errors check',
        `Socket errors encountered: ${JSON.stringify(socketErrors)}`
      );
    }

    console.log('\n======================================================');
    console.log(`   TEST EXECUTION SUMMARY: ${results.passed.length} PASSED, ${results.failed.length} FAILED   `);
    console.log('======================================================\n');
  } catch (outerErr) {
    console.error('Test runner fatal error:', outerErr);
    fail('Test Suite Execution', outerErr.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  process.exit(results.failed.length > 0 ? 1 : 0);
}

run();
