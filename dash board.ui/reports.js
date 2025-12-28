/************ FIREBASE INIT ************/
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "helpmates-f7f01.firebaseapp.com",
  projectId: "helpmates-f7f01",
  storageBucket: "helpmates-f7f01.appspot.com",
  messagingSenderId: "16775557514",
  appId: "1:16775557514:web:xxxxxxxx"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/************ DOM READY ************/
document.addEventListener("DOMContentLoaded", () => {

  const reportsContainer = document.getElementById("reportsContainer");
  const alertPopup = document.getElementById("alertPopup");
  const alertText = document.getElementById("alertText");

  /************ REALTIME REPORTS ************/
  db.collection("reports")
    .onSnapshot(async snapshot => {

      const reports = [];
      snapshot.forEach(doc => {
        reports.push({ id: doc.id, ...doc.data() });
      });

      // Initialize counters
      let total = 0, pending = 0, progress = 0, resolved = 0;

      // ANALYZE NEW REPORTS (OR RE-ANALYZE OLD VERSIONS)
      for (let d of reports) {
        // Check if analysis is missing OR if it's an old version (old logic was lenient)
        if (d.status === 'NEW' && (!d.aiAnalysis || d.aiAnalysis.version !== 2)) {
          console.log(`Analyzing report ${d.id}...`);
          AIService.analyzeReport(d).then(analysis => {
            db.collection("reports").doc(d.id).update({
              aiAnalysis: analysis
            });
          });
        }
      }

      // SORT REPORTS: Real > Priority > Date
      const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };

      reports.sort((a, b) => {
        // 1. REAL vs FAKE (Real First)
        // If analysis missing, treat as Fake logic-wise for sorting until analyzed, or keep neutral.
        // Let's treat unanalyzed as equal, but analyzed Real > analyzed Fake.
        const realA = a.aiAnalysis?.isReal ? 1 : 0;
        const realB = b.aiAnalysis?.isReal ? 1 : 0;
        if (realA !== realB) return realB - realA; // 1 (Real) before 0 (Fake)

        // 2. PRIORITY (High > Medium > Low)
        const pA = priorityOrder[a.aiAnalysis?.priority || 'LOW'] || 0;
        const pB = priorityOrder[b.aiAnalysis?.priority || 'LOW'] || 0;

        if (pA !== pB) return pB - pA; // Higher priority first

        // 3. DATE (Desc)
        const tA = a.createdAt?.toMillis() || 0;
        const tB = b.createdAt?.toMillis() || 0;
        return tB - tA;
      });

      reportsContainer.innerHTML = "";

      // Handle popups using docChanges from snapshot (we need the raw snapshot for docChanges)
      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          const d = change.doc.data();
          // Popup only if status is NEW and created recently
          if (d.status === "NEW" && d.createdAt && (Date.now() - d.createdAt.toMillis() < 60000)) {

            // Wait for AI if possible? No, shows immediately, but maybe update if critical?
            // Let's just show the alert.
            alertText.innerText = "🚨 New Report Received. Analyzing...";
            alertPopup.classList.remove("hidden");
            setTimeout(() => alertPopup.classList.add("hidden"), 5000);
          }
        }
        // If modified (e.g. AI analysis added)
        if (change.type === "modified") {
          const d = change.doc.data();
          if (d.status === 'NEW' && d.aiAnalysis && d.aiAnalysis.priority === 'HIGH' && d.aiAnalysis.isReal) {
            alertText.innerHTML = "🚨 <b>CRITICAL EMERGENCY DETECTED!</b><br>Real Threat Confirmed.";
            alertPopup.classList.remove("hidden");
            setTimeout(() => alertPopup.classList.add("hidden"), 8000);
          }
        }
      });

      // Render all reports
      reports.forEach(d => {
        const id = d.id;

        // Increment counters
        total++;
        if (d.status === "NEW") pending++;
        else if (d.status === "IN_PROGRESS") progress++;
        else if (d.status === "RESOLVED") resolved++;

        // AI BADGES
        let aiBadges = '';
        if (d.aiAnalysis) {
          const { isReal, priority, confidence } = d.aiAnalysis;

          // Real/Fake Badge
          if (isReal) {
            aiBadges += `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-green-900/50 text-green-400 border border-green-500/30 flex items-center gap-1"><i class="ph-fill ph-check-circle"></i> Real (${Math.round(confidence * 100)}%)</span>`;
          } else {
            aiBadges += `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-red-900/50 text-red-400 border border-red-500/30 flex items-center gap-1"><i class="ph-fill ph-warning-octagon"></i> FAKE (${Math.round(confidence * 100)}%)</span>`;
          }

          // Priority Badge
          const pColors = {
            'HIGH': 'bg-red-600 text-white animate-pulse',
            'MEDIUM': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            'LOW': 'bg-blue-500/20 text-blue-400 border-blue-500/30'
          };
          aiBadges += `<span class="px-2 py-0.5 rounded-full text-xs font-bold border ml-2 ${pColors[priority] || pColors['LOW']}">${priority} PRIORITY</span>`;
        } else {
          aiBadges += `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-700 text-zinc-400 animate-pulse">Analyzing...</span>`;
        }


        // action buttons logic
        let actionButtons = "";

        // Status buttons
        if (d.status === "NEW") {
          actionButtons += `
            <button onclick="updateStatus('${id}', 'IN_PROGRESS')"
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors">Mark In Progress</button>
          `;
        } else if (d.status === "IN_PROGRESS") {
          actionButtons += `
            <button onclick="updateStatus('${id}', 'RESOLVED')"
              class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-sm transition-colors">Resolve</button>
          `;
        }

        actionButtons += `
            <button onclick="deleteReport('${id}')" 
                class="bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-800 px-3 py-1 rounded text-sm transition-colors ml-2" title="Delete Report">
                <span class="font-bold">&times;</span>
            </button>
        `;

        // Card opacity for Fake
        const opacityClass = (d.aiAnalysis && !d.aiAnalysis.isReal) ? 'opacity-60 grayscale-[0.5]' : '';
        const borderClass = (d.aiAnalysis?.priority === 'HIGH' && d.aiAnalysis?.isReal) ? 'border-red-500/50 shadow-lg shadow-red-900/20' : 'border-white/5';

        const card = document.createElement("div");
        card.className = `bg-zinc-800 ${borderClass} p-4 rounded-xl flex gap-4 transition-all hover:bg-zinc-800/80 ${opacityClass}`;

        card.innerHTML = `
          <div class="w-32 h-32 shrink-0 bg-zinc-700 rounded-lg overflow-hidden relative group">
             <img src="${d.photoUrl || 'https://via.placeholder.com/150?text=No+Image'}" 
                  class="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-500"
                  onclick="window.open('${d.photoUrl}', '_blank')" 
                  onerror="this.src='https://via.placeholder.com/150?text=No+Image'"/>
             ${d.aiAnalysis && !d.aiAnalysis.isReal ? '<div class="absolute inset-0 bg-black/40 flex items-center justify-center font-bold text-red-500 rotate-[-15deg] text-xl border-4 border-red-500 m-2 rounded">FAKE</div>' : ''}
          </div>

          <div class="flex-1 flex flex-col justify-between">
            <div>
                 <div class="flex justify-between items-start">
                    <a href="${d.location?.address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(d.location.address) : '#'}" 
                       target="_blank" 
                       class="font-semibold text-lg text-white block hover:text-red-400 transition-colors ${d.location?.address ? '' : 'pointer-events-none'}">
                        📍 ${d.location?.address || "Unknown Location"}
                    </a>
                    <span class="text-xs text-zinc-500 font-mono">${id.substr(0, 5)}</span>
                 </div>
                
                 <!-- AI Analysis Row -->
                 <div class="flex flex-wrap items-center gap-2 mt-2">
                    ${aiBadges}
                 </div>

                <p class="text-sm text-zinc-400 mt-2 flex items-center gap-2 line-clamp-2">
                   ${d.description || 'No description provided.'}
                </p>
                
                <div class="mt-2 flex items-center gap-2">
                    <span class="text-xs text-zinc-500">📅 ${d.createdAt?.toDate().toLocaleString() || "Just now"}</span>
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border
                      ${d.status === "NEW" ? "bg-red-500/10 text-red-400 border-red-500/20" :
            d.status === "IN_PROGRESS" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
              "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}">
                      <span class="w-1.5 h-1.5 rounded-full ${d.status === "NEW" ? "bg-red-500" : d.status === "IN_PROGRESS" ? "bg-blue-500" : "bg-emerald-500"}"></span>
                      ${d.status}
                    </span>
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-zinc-700/50 text-zinc-400 border-white/5 ml-auto">
                        ${d.type || "General"}
                    </span>
                </div>
            </div>

            <div class="mt-4 flex gap-2 justify-end">
              ${actionButtons}
            </div>
          </div>
        `;

        reportsContainer.appendChild(card);
      });

      // Update UI Counters
      document.getElementById("totalCount").innerText = total;
      document.getElementById("pendingCount").innerText = pending;
      document.getElementById("progressCount").innerText = progress;
      document.getElementById("resolvedCount").innerText = resolved;
    });
});

/************ ACTIONS ************/
function updateStatus(docId, newStatus) {
  db.collection("reports").doc(docId).update({ status: newStatus })
    .catch(err => console.error("Error updating status:", err));
}

function deleteReport(docId) {
  if (confirm("Are you sure you want to delete this report? This cannot be undone.")) {
    db.collection("reports").doc(docId).delete()
      .then(() => console.log("Report deleted"))
      .catch(err => console.error("Error deleting report:", err));
  }
}
function assignCategory(index, category) {
  const reports = getReports();
  reports[index].category = category;
  saveReports(reports);
  updateResponseTeams();
}
