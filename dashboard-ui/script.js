console.log("Dashboard script loaded");

/************ FIREBASE INIT ************/
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "helpmates-f7f01.firebaseapp.com",
  projectId: "helpmates-f7f01",
  storageBucket: "helpmates-f7f01.appspot.com",
  messagingSenderId: "16775557514",
  appId: "1:16775557514:web:xxxxxxxx"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

/************ DOM READY ************/
document.addEventListener("DOMContentLoaded", () => {

  // DOM Elements
  const alertPopup = document.getElementById("alertPopup");
  const alertText = document.getElementById("alertText");
  const totalCount = document.getElementById("totalCount");
  const pendingCount = document.getElementById("pendingCount");
  const progressCount = document.getElementById("progressCount");
  const resolvedCount = document.getElementById("resolvedCount");

  /* Chart Styling */
  Chart.defaults.color = "#a1a1aa";
  Chart.defaults.borderColor = "rgba(255,255,255,0.05)";
  Chart.defaults.font.family = "'Outfit', sans-serif";

  // Status Chart Logic
  let statusChart;
  const statusCtx = document.getElementById("statusChart").getContext("2d");

  // Type Chart Logic
  let typeChart;
  const typeCtx = document.getElementById("typeChart").getContext("2d");

  /************ FIRESTORE LISTENER ************/
  db.collection("reports")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {

      let total = 0, pending = 0, progress = 0, resolved = 0;
      // Simple category counts for demo
      let types = { "Medical": 0, "Fire": 0, "Accident": 0, "Other": 0 };

      const changes = snapshot.docChanges();

      // We need to re-calculate totals from scratch or handle state better
      // But for this existing logic, we'll just re-process. 
      // NOTE: standard firestore snapshot handling usually iterates all docs if we want a fresh count, 
      // or we maintain state. The previous code was accumulating 'total' inside docChanges which is WRONG 
      // if it only runs on deltas. 
      // Let's switch to snapshot.docs to get current TOTAL state.

      total = snapshot.docs.length;
      pending = 0; progress = 0; resolved = 0;
      types = { "Medical": 0, "Fire": 0, "Accident": 0, "Other": 0 }; // reset

      snapshot.docs.forEach(doc => {
        const d = doc.data();
        if (d.status === "NEW") pending++;
        else if (d.status === "IN_PROGRESS") progress++;
        else if (d.status === "RESOLVED") resolved++;

        // Randomly assign category if missing, or use real one
        const cat = d.type || "Other";
        if (types[cat] !== undefined) types[cat]++;
        else types["Other"]++;
      });

      // Alarm Sound
      const alarmAudio = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");

      // Handle popup for *changes*
      changes.forEach(change => {
        if (change.type === "added") {
          const d = change.doc.data();
          const docId = change.doc.id;

          // Check timestamp to ensure it's a new report (within last 60s)
          if (d.createdAt && Date.now() - d.createdAt.toMillis() < 60000) {

            // Trigger AI if not present
            if (!d.aiAnalysis) {
              console.log("Dashboard initiating analysis...");
              AIService.analyzeReport(d).then(analysis => {
                db.collection("reports").doc(docId).update({ aiAnalysis: analysis });
              });
              // Initial alert
              alertText.innerText = `Analyzing new report at ${d.location?.address || "Unknown"}...`;
              alertPopup.classList.remove("hidden");
              setTimeout(() => alertPopup.classList.add("hidden"), 5000);
            } else {
              // Immediate alert if already analyzed (rare race condition but good to handle)
              if (d.aiAnalysis.isReal && d.aiAnalysis.priority === 'HIGH') {
                alertText.innerHTML = `🚨 <b>CRITICAL:</b> ${d.location?.address}<br>Real Threat Confirmed.`;
                alertPopup.classList.remove("hidden");
                setTimeout(() => alertPopup.classList.add("hidden"), 8000);
                alarmAudio.play().catch(e => console.log("Audio play failed:", e));
              }
            }
          }
        }


        // Watch for modifications (AI result came in)
        if (change.type === "modified") {
          const d = change.doc.data();
          // If this was a new relevant report that just got analyzed
          // Logic: Status is NEW, Analysis exists, Priority is HIGH, and is Real.
          if (d.status === 'NEW' && d.aiAnalysis && d.aiAnalysis.priority === 'HIGH' && d.aiAnalysis.isReal) {

            // Double check time to avoid old reports popping up on page refresh/re-analysis
            // (Only popup if created in last 2 minutes)
            if (d.createdAt && (Date.now() - d.createdAt.toMillis() < 120000)) {
              alertText.innerHTML = `🚨 <b>CRITICAL:</b> ${d.location?.address}<br>Real Threat Confirmed.`;
              alertPopup.classList.remove("hidden");

              // Try to play audio
              alarmAudio.play().catch(e => {
                console.warn("Autoplay prevented. User interaction required for sound.", e);
              });

              setTimeout(() => alertPopup.classList.add("hidden"), 10000); // 10s display
            }
          }
        }
      });

      // ✅ KPI update
      totalCount.innerText = total;
      pendingCount.innerText = pending;
      progressCount.innerText = progress;
      resolvedCount.innerText = resolved;

      // ✅ Chart update: Status
      const statusData = {
        labels: ["Pending", "In Progress", "Resolved"],
        datasets: [{
          data: [pending, progress, resolved],
          backgroundColor: [
            "#f59e0b", // Amber (Pending)
            "#3b82f6", // Blue (In Progress)
            "#10b981"  // Emerald (Resolved)
          ],
          borderWidth: 0,
          hoverOffset: 4
        }]
      };

      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          }
        }
      };

      if (!statusChart) {
        statusChart = new Chart(statusCtx, {
          type: "doughnut",
          data: statusData,
          options: chartOptions
        });
      } else {
        statusChart.data = statusData;
        statusChart.update();
      }

      // ✅ Chart update: Types (Mocked or Real)
      const typeData = {
        labels: Object.keys(types),
        datasets: [{
          label: 'Reports',
          data: Object.values(types),
          backgroundColor: "#ef4444",
          borderRadius: 4,
          barThickness: 20
        }]
      };

      if (!typeChart) {
        typeChart = new Chart(typeCtx, {
          type: 'bar',
          data: typeData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
              x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
          }
        });
      } else {
        typeChart.data = typeData;
        typeChart.update();
      }

    });
});
