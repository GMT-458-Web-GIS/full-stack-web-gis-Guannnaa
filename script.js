const token = localStorage.getItem("token");

const map = L.map("map").setView([39, 35], 6);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

/* Load points */
fetch("http://localhost:3000/reports", {
  headers: { Authorization: token }
})
.then(r => r.json())
.then(data => {
  data.forEach(r => {
    const g = JSON.parse(r.geom);
    L.marker([g.coordinates[1], g.coordinates[0]])
      .bindPopup(`${r.type}<br>${r.status}`)
      .addTo(map);
  });
});

/* Add new report */
map.on("click", e => {
  const type = prompt("Type: pothole / sidewalk");
  const description = prompt("Description");

  fetch("http://localhost:3000/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      type,
      description,
      lat: e.latlng.lat,
      lng: e.latlng.lng
    })
  }).then(() => location.reload());
});
