function updateResponseTeams() {
  const reports = JSON.parse(localStorage.getItem("reports")) || [];

  const active = reports.filter(
    r => r.status === "pending" && r.category
  );

  const counts = {
    health: 0,
    fire: 0,
    social: 0,
    crime: 0
  };

  active.forEach(r => {
    if (counts[r.category] !== undefined) {
      counts[r.category]++;
    }
  });

  document.getElementById("healthCount").innerText = counts.health;
  document.getElementById("fireCount").innerText = counts.fire;
  document.getElementById("socialCount").innerText = counts.social;
  document.getElementById("crimeCount").innerText = counts.crime;
}
