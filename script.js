// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBCcyLy_rNx-riDjmK4SUu-gZbKtDPqEYQ",
  authDomain: "echopoly-ide.firebaseapp.com",
  databaseURL: "https://echopoly-ide-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "echopoly-ide",
  storageBucket: "echopoly-ide.firebasestorage.app",
  messagingSenderId: "290647098484",
  appId: "1:290647098484:web:61a9a5503c43d465bdbd21",
  measurementId: "G-LYBESX64E5"
};
firebase.initializeApp(firebaseConfig);
// script.js
function handleForgotPassword() {
  window.location.href = "forgot-password.html";
}
// Popup
function showPopup(msg, type = "success") {
  const popup = document.getElementById("popup");
  popup.textContent = msg;
  popup.className = `popup ${type}`;
  popup.classList.remove("hidden");
  setTimeout(() => popup.classList.add("hidden"), 3000);
}
function closePopup() {
  document.getElementById("popup").style.display = "none";
}
function submitNewProject() {
  const name = document.getElementById("project-name").value.trim();
  const type = document.getElementById("project-type").value;

  if (name && type) {
    const newRef = projectsRef.push();
    newRef.set({
      name,
      type,
      status: "inactive",
      createdAt: Date.now()
    });
    document.getElementById("project-name").value = ""; // clear input
  } else {
    alert("Please enter a name and select a type.");
  }
}
// Login
document.getElementById("login-form").addEventListener("submit", e => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const pass  = document.getElementById("password").value;

  firebase.auth()
    .signInWithEmailAndPassword(email, pass)
    .then(() => {
      showPopup("Login successful!", "success");
      setTimeout(() => {
        window.location.href = "editor.html";
      }, 800);
    })
    .catch(err => {
      showPopup("Login failed: " + err.message, "error");
    });
});

