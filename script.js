function encryptData(data, key = "mykey") {
  return btoa(Array.from(data.toString()).map(char => String.fromCharCode(char.charCodeAt(0) ^ key)).join(''));
}

function decryptData(encData, key = "mykey") {
  return Array.from(atob(encData)).map(char => String.fromCharCode(char.charCodeAt(0) ^ key)).join('');
}



let soundEnabled = false;
function enableSound() {
  soundEnabled = true;
  document.getElementById('alertSound').play().catch(() => {
    console.log("✅ Sound ready — will play on next alert");
  });
}


const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "new-one-b506a.firebaseapp.com",
  databaseURL: "your-database-url",
  projectId: "new-one-b506a",
  storageBucket: "new-one-b506a.appspot.com",
  messagingSenderId: "709621655682",
  appId: "1:709621655682:web:8592b9f2f871b699716c9b",
  measurementId: "G-47X3LMK6S3"
};
firebase.initializeApp(firebaseConfig);

const db = firebase.database();

const map = L.map('map').setView([13.1234, 78.4912], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


const medicoNodes = [
  { name: "Medico A", lat: 12.4220 , lon: 76.6930 },
  { name: "Medico B", lat: 12.4180, lon: 76.6980 },
  { name: "Medico C", lat: 12.4300, lon: 76.7000 }
];


function getdistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


function getNearestMedico(soldierLat, soldierLon) {
  let nearest = null;
  let minDist = Infinity;
  medicoNodes.forEach(node => {
    const dist = getdistance(soldierLat, soldierLon, node.lat, node.lon);
    if (dist < minDist) {
      minDist = dist;
      nearest = { ...node, distance: dist.toFixed(2) };
    }
  });
  return nearest;
}


medicoNodes.forEach(node => {
  const medicoMarker = L.circleMarker([node.lat, node.lon], {
    radius: 8,
    color: 'green',
    fillColor: '#0f0',
    fillOpacity: 0.8
  }).addTo(map);
  medicoMarker.bindPopup(`🏥 ${node.name}`);
});


const marker = L.marker([13.1234, 78.4912]).addTo(map)
  .bindPopup('Soldier Location')
  .openPopup();


const multiChartData = {
  labels: [],
  datasets: [
    {
      label: 'Heart Rate (bpm)',
      data: [],
      borderColor: 'red',
      fill: false,
      tension: 0.3
    },
    {
      label: 'Temperature (°C)',
      data: [],
      borderColor: 'orange',
      fill: false,
      tension: 0.3
    },
    {
      label: 'Gas Level',
      data: [],
      borderColor: 'yellow',
      fill: false,
      tension: 0.3
    }
  ]
};

const multiChart = new Chart(document.getElementById('multiChart'), {
  type: 'line',
  data: multiChartData,
  options: {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: '#ffffff'
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#ffffff' }
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#ffffff' }
      }
    }
  }
});


const soldierRef = db.ref('/'); 
soldierRef.on('value', (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  const heartRate = data.sensorData?.ecgValue ?? 0;
  const gas = data.sensorData?.airQuality ?? 0;
  const temp = data.sensorData?.temp ?? 0;
  const x = data.sensorData?.angleX ?? 0;
  const y = data.sensorData?.angleY ?? 0;
  const z = data.sensorData?.angleZ ?? 0;
  const lat = data.sensorData?.latitude;
  const lon = data.sensorData?.longitude;

  document.getElementById('heartRate').textContent = heartRate;
  document.getElementById('gas').textContent = gas;
  document.getElementById('temp').textContent = temp;
  document.getElementById('motionStatus').textContent = getMotionStatus(x, y, z);

  if (lat && lon) {
    marker.setLatLng([lat, lon]);
    map.setView([lat, lon]);
  }

  checkAlerts(heartRate, gas, temp, lat, lon);
  updateHeartChart(heartRate, temp, gas);
  updateVitalStatuses(heartRate, gas, temp);
  
  
  const log = {
    timestamp: new Date().toISOString(),
    heartRate,
    gas,
    temp,
    lat,
    lon,
    motion: { x, y, z }
  };

  const encryptedLog = encryptData(JSON.stringify(log));

  db.ref('logs/Soldier1').push({
    payload: encryptedLog
  });
});

db.ref('logs/Soldier1').once('value', (snapshot) => {
  snapshot.forEach((snap) => {
    const encrypted = snap.val().payload;
    const decrypted = JSON.parse(decryptData(encrypted));

    console.log("Decrypted Entry:", decrypted); 
  });
});





function updateVitalStatuses(hr, gas, temp) {
  
  let hrStatus = hr < 100 ? "Safe" : hr < 140 ? "Caution" : "Critical";
  let hrColor = hr < 100 ? "success" : hr < 140 ? "warning text-dark" : "danger";
  document.getElementById("heartRate").textContent = hr;
  
  let gasStatus = gas < 300 ? "Safe" : gas < 600 ? "Caution" : "Critical";
  let gasColor = gas < 300 ? "success" : gas < 600 ? "warning text-dark" : "danger";
  document.getElementById("gas").textContent = gas;
  document.getElementById("gasStatus").textContent = gasStatus;
  document.getElementById("gasStatus").className = `badge bg-${gasColor}`;

  
  let tempStatus = temp < 37.5 ? "Safe" : temp < 39 ? "Caution" : "Critical";
  let tempColor = temp < 37.5 ? "success" : temp < 39 ? "warning text-dark" : "danger";
  document.getElementById("temp").textContent = temp;
  document.getElementById("tempStatus").textContent = tempStatus;
  document.getElementById("tempStatus").className = `badge bg-${tempColor}`;
}




function getMotionStatus(x, y, z) {
  const threshold = 3;
  return (Math.abs(x) > threshold || Math.abs(y) > threshold || Math.abs(z) > threshold)
    ? "Soldier is moving" : "Soldier is stationary";
}


function checkAlerts(hr, gas, temp, lat, lon) {
  let messages = [];


  if (hr < 50) {
    messages.push(`Heart rate is: ${hr} bpm\n⚠️ Alert - Bradycardia`);
  } else if (hr > 120) {
    messages.push(`Heart rate is: ${hr} bpm\n⚠️ Alert - Tachycardia`);
  } else {
    messages.push(`Heart rate is: ${hr} bpm ✅ Normal`);
  }


  if (gas < 100 || gas > 200) {
    messages.push(`Gas level is: ${gas} ppm\n⚠️ Alert - Toxic Gas Level`);
  } else {
    messages.push(`Gas level is: ${gas} ppm ✅ Normal`);
  }

  
  if (temp < 35) {
    messages.push(`Temperature is: ${temp}°C\n⚠️ Alert - Hypothermia`);
  } else if (temp > 38 && temp <= 40) {
    messages.push(`Temperature is: ${temp}°C\n⚠️ Alert - Fever`);
  } else if (temp > 40) {
    messages.push(`Temperature is: ${temp}°C\n⚠️ Alert - Heatstroke Risk`);
  } else {
    messages.push(`Temperature is: ${temp}°C ✅ Normal`);
  }

  triggerAlert(messages, lat, lon, "danger");
}



function triggerAlert(messages, soldierLat, soldierLon, level = "danger") {
  const banner = document.getElementById('alertBanner');
  banner.style.display = 'block';
  banner.className = `alert alert-${level}`;

  
  const simpleMessages = [];
  if (messages.some(msg => msg.includes("Heart rate"))) simpleMessages.push("Heart Rate Alert");
  if (messages.some(msg => msg.includes("Temperature"))) simpleMessages.push("Temperature Alert");
  if (messages.some(msg => msg.includes("Gas level"))) simpleMessages.push("Air Quality Alert");

  let bannerMsg = `🚨 ${simpleMessages.join(" | ")}`;

  let nearest = null;
  if (soldierLat && soldierLon) {
    nearest = getNearestMedico(soldierLat, soldierLon);
    if (nearest) {
      bannerMsg += ` | Nearest Medico: ${nearest.name} (${nearest.distance} km)`;
    }
  }

  banner.textContent = bannerMsg;

  
  if (typeof soundEnabled !== "undefined" && soundEnabled) {
    const alertSound = document.getElementById('alertSound');
    alertSound?.play().catch(err => console.warn("⚠️ Sound play failed:", err));
  }

  
  const alertList = document.getElementById("alertList");
  alertList.innerHTML = "";

  messages.forEach(msg => {
    const li = document.createElement("li");
    li.className = "list-group-item text-danger";
    li.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
    alertList.appendChild(li);
  });

  if (nearest) {
    const li = document.createElement("li");
    li.className = "list-group-item text-primary";
    li.innerHTML = `<i class="fas fa-user-md"></i> Nearest Medico: ${nearest.name} (${nearest.distance} km)`;
    alertList.appendChild(li);
  }

  setTimeout(() => {
    banner.style.display = 'none';
  }, 5000);
}




function updateHeartChart(heart, temp, gas) {
  const now = new Date().toLocaleTimeString();

  multiChartData.labels.push(now);
  multiChartData.datasets[0].data.push(heart);
  multiChartData.datasets[1].data.push(temp);
  multiChartData.datasets[2].data.push(gas);

  
  if (multiChartData.labels.length > 10) {
    multiChartData.labels.shift();
    multiChartData.datasets.forEach(ds => ds.data.shift());
  }

  multiChart.update();
}


  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  
  function sendEmailNotification(email, data) {
    console.log(`📧 Sending SOS email to: ${email}`);
    console.log("Email Data:", data);
    
  }

soldierRef.child("sensorData/sosTriggered").on("value", snapshot => {
  const isTriggered = snapshot.val();

  if (isTriggered === true) {
    soldierRef.once("value").then(snapshot => {
      const data = snapshot.val();

      const sosPayload = {
        time: new Date().toLocaleString(),
        location: {
          latitude: data.sensorData?.latitude ?? 0,
          longitude: data.sensorData?.longitude ?? 0,
        },
        heartRate: data.sensorData?.ecgValue ?? 0,
        temperature: data.sensorData?.temp ?? 0,
        gasLevel: data.sensorData?.airQuality ?? 0,
        status: getMotionStatus(
          data.sensorData?.angleX ?? 0,
          data.sensorData?.angleY ?? 0,
          data.sensorData?.angleZ ?? 0
        )
      };

      db.ref("emergencies").push(sosPayload);

      const lat = sosPayload.location.latitude;
      const lon = sosPayload.location.longitude;
      const heartvalue = sosPayload.heartRate;
      const gasvalue = sosPayload.gasLevel;
      const tempvalue = sosPayload.temperature;

      db.ref("medicos").once("value").then(medicoSnap => {
        const medicos = medicoSnap.val();
        let nearestMedico = null;
        let minDistance = Infinity;

        for (let id in medicos) {
          const medico = medicos[id];
          const distance = getDistance(lat, lon, medico.lat, medico.lng);
          console.log(`Distance to ${medico.name}: ${distance.toFixed(2)} km`);
          if (distance < minDistance) {
            minDistance = distance;
            nearestMedico = medico;
          }
        }

        if (nearestMedico) {
          console.log("Nearest Medico Found:", nearestMedico.name);
          sendEmailNotification(nearestMedico.email, {
            lat: lat,
            lng: lon,
            heartRate: heartvalue,
            gas: gasvalue,
            temp: tempvalue,
            time: sosPayload.time
          });
        } else {
          console.warn(" No medico found!");
        }

        alert(` SOS Alert Sent to Nearest Medico!\nDoctor: ${nearestMedico?.name}\nLocation: Latitude ${lat}, Longitude ${lon}\nHeart Rate: ${heartvalue} bpm\nGas Level: ${gasvalue} ppm\nTemperature: ${tempvalue} °C`);

        soldierRef.child("sensorData").update({ sosTriggered: false });
      });
    });
  }
});

  


// 📝 HEALTH LOG BOOK (Every 5 mins)
setInterval(() => {
  soldierRef.once('value').then(snapshot => {
    const data = snapshot.val();
    if (!data) return;

    const logEntry = {
      timestamp: new Date().toLocaleString(),
      heartRate: data.sensorData?.ecgValue?? 0,
      gasLevel: data.sensorData?.airQuality ?? 0,
      temperature: data.sensorData.temp ?? 0,
      motionStatus: getMotionStatus(
        data.sensorData?.angleX ?? 0,
        data.mpu?.angleY ?? 0,
        data.mpu?.angleZ ?? 0
      ),
      gps: {
        lat: data.sensorData.latitude ?? 0,
        lon: data.sensorData.longitude ?? 0
      }
    };

    db.ref("health_logs").push(logEntry);
    console.log("📒 Health log saved:", logEntry);
  });
}, 1* 60 * 1000); // Logs every 5 mins

// 📥 Load Health Logs
function loadHealthLogs() {
  const logRef = db.ref("health_logs");
  const tableBody = document.getElementById("healthLogTable").querySelector("tbody");
  const filter = document.getElementById("timeFilter").value;

  logRef.once("value", snapshot => {
    tableBody.innerHTML = "";
    const logs = snapshot.val();

    if (!logs) {
      tableBody.innerHTML = "<tr><td colspan='7'>No logs found</td></tr>";
      return;
    }

    const entries = Object.values(logs)
      .filter(log => {
        const logTime = new Date(log.timestamp);
        const now = new Date();
        if (filter === "lastHour") {
          return (now - logTime) <= (60 * 60 * 1000);
        } else if (filter === "today") {
          return logTime.toDateString() === now.toDateString();
        } else if (filter === "thisWeek") {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          return logTime >= oneWeekAgo;
        }
        return true;
      })
      .reverse();

    if (entries.length === 0) {
      tableBody.innerHTML = "<tr><td colspan='7'>No logs found for selected filter</td></tr>";
      return;
    }

    entries.forEach(log => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${log.timestamp}</td>
        <td>${log.heartRate}</td>
        <td>${log.gasLevel}</td>
        <td>${log.temperature}</td>
        <td>${log.motionStatus}</td>
        <td>${log.gps?.lat ??'_' }</td>
        <td>${log.gps?.lon ?? '_'}</td>
      `;
      tableBody.appendChild(row);
    });
  });
}

// Load logs on page load
window.onload = function () {
  loadHealthLogs();
};

// 📤 Download as CSV
function downloadLogsAsCSV() {
  const table = document.getElementById("healthLogTable");
  let csv = [];

  for (let row of table.rows) {
    let rowData = [];
    for (let cell of row.cells) {
      rowData.push(cell.textContent);
    }
    csv.push(rowData.join(","));
  }

  const csvContent = csv.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `Soldier_Health_Log_${new Date().toLocaleDateString()}.csv`;
  a.click();
}

// clear history
function clearHealthLogs() {
  if (confirm("⚠️ Are you sure you want to delete all health logs? This action cannot be undone.")) {
    db.ref("health_logs").remove()
      .then(() => {
        alert("✅ Health logs cleared successfully.");
        loadHealthLogs(); // Reload table to reflect the cleared state
      })
      .catch((error) => {
        console.error("❌ Error deleting logs:", error);
        alert("❌ Failed to clear logs. Check console for details.");
      });
  }
}
function clearDetailedAlerts() {
  document.getElementById("detailedAlerts").innerHTML = "";
}
